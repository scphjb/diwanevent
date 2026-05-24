"""
PDF Renderer: يحوّل design_json من الـ Designer إلى PDF حقيقي
يستخدم ReportLab مع دعم عربي (arabic_reshaper + python_bidi)
"""
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, A6, landscape
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.utils import ImageReader
from io import BytesIO
import arabic_reshaper
from bidi.algorithm import get_display
import qrcode
import base64
import re
import os
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfWriter, PdfReader

# تسجيل الخطوط مع دعم متعدد الأنظمة
import platform

_FONTS_REGISTERED = False

def _register_arabic_fonts():
    global _FONTS_REGISTERED
    if _FONTS_REGISTERED:
        return
    
    # 1. Determine local font folder (go up 3 levels from pdf_renderer.py)
    # File: /app/app/utils/pdf_renderer.py -> PROJECT_ROOT: /app
    UTILS_DIR = os.path.dirname(os.path.abspath(__file__))
    APP_DIR = os.path.dirname(UTILS_DIR)
    PROJECT_ROOT = os.path.dirname(APP_DIR)
    
    local_fonts_dir = os.path.join(PROJECT_ROOT, "fonts")
    
    # Sakkal Majalla paths
    majalla_regular_names = ["majalla.ttf", "Sakkal Majalla.ttf", "sakal_majalla.ttf"]
    majalla_bold_names = ["majallab.ttf", "Sakkal Majalla Bold.ttf", "sakal_majalla_bold.ttf"]
    
    regular_path = None
    bold_path = None
    
    # First search for Sakkal Majalla regular
    for name in majalla_regular_names:
        p = os.path.join(local_fonts_dir, name)
        if os.path.exists(p):
            regular_path = p
            break
            
    # Then bold
    for name in majalla_bold_names:
        p = os.path.join(local_fonts_dir, name)
        if os.path.exists(p):
            bold_path = p
            break
            
    # Fallback to Arial if Sakkal Majalla is not found
    if not regular_path:
        p_arial = os.path.join(local_fonts_dir, "arial.ttf")
        if os.path.exists(p_arial):
            regular_path = p_arial
            
    if not bold_path:
        p_arialbd = os.path.join(local_fonts_dir, "arialbd.ttf")
        if os.path.exists(p_arialbd):
            bold_path = p_arialbd
            
    # System fallbacks if local fonts not found (only for local dev)
    system = platform.system()
    system_paths = {
        "Windows": {
            "regular": "C:\\Windows\\Fonts\\majalla.ttf",
            "bold":    "C:\\Windows\\Fonts\\majallab.ttf"
        },
        "Linux": {
            "regular": "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "bold":    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
        },
        "Darwin": {
            "regular": "/Library/Fonts/Arial.ttf",
            "bold":    "/Library/Fonts/Arial Bold.ttf"
        }
    }
    
    if not regular_path:
        if system == "Windows":
            p = system_paths["Windows"]["regular"]
            if os.path.exists(p):
                regular_path = p
                
        # fallback to windows/linux/darwin defaults
        if not regular_path:
            p = system_paths.get(system, {}).get("regular")
            if p and os.path.exists(p):
                regular_path = p
                
    if not bold_path:
        if system == "Windows":
            p = system_paths["Windows"]["bold"]
            if os.path.exists(p):
                bold_path = p
                
        if not bold_path:
            p = system_paths.get(system, {}).get("bold")
            if p and os.path.exists(p):
                bold_path = p
                
    # Register the fonts
    try:
        if regular_path:
            pdfmetrics.registerFont(TTFont('Arabic-Regular', regular_path))
        else:
            print("⚠️ Arabic font not found — PDF text may not display Arabic correctly")
    except Exception as e:
        print(f"⚠️ Font registration warning: {e}")
        
    try:
        if bold_path:
            pdfmetrics.registerFont(TTFont('Arabic-Bold', bold_path))
        elif regular_path:
            pdfmetrics.registerFont(TTFont('Arabic-Bold', regular_path))
    except Exception as e:
        print(f"⚠️ Bold font registration warning: {e}")
        
    _FONTS_REGISTERED = True

# استدعِ عند import
_register_arabic_fonts()




def reshape(text: str) -> str:
    """تحويل النص العربي للعرض الصحيح"""
    if not text: return ''
    try:
        return get_display(arabic_reshaper.reshape(str(text)))
    except:
        return str(text)

def parse_color(color_str: str) -> Color:
    """Parse hex or rgba color string to ReportLab Color object"""
    if not color_str:
        return HexColor('#000000')
    color_str = color_str.strip()
    if color_str.startswith('rgba') or color_str.startswith('rgb'):
        match = re.match(r'rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d\.]+))?\s*\)', color_str)
        if match:
            r, g, b = float(match.group(1))/255.0, float(match.group(2))/255.0, float(match.group(3))/255.0
            a = float(match.group(4)) if match.group(4) else 1.0
            return Color(r, g, b, alpha=a)
    try:
        return HexColor(color_str)
    except:
        return HexColor('#000000')

def mm_to_pt(mm): return mm * 2.8346

# تحديد المجلد الرئيسي للمشروع مرة واحدة عند تحميل الملف
_BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # app/utils
PROJECT_ROOT = os.path.dirname(os.path.dirname(_BASE_DIR)) # attendance_system

def render_design_to_pdf(design: dict, participant: dict, doc_type: str = 'badge') -> bytes:
    """
    يحوّل القالب + بيانات مشارك → PDF bytes
    """
    
    # أبعاد الصفحة (نحاول الجلب من التصميم أولاً، ثم من النوع)
    # التصميم قد يحتوي على width_mm و height_mm في حقل الـ canvas أو root
    tw = design.get('width_mm') or design.get('canvas', {}).get('width_mm')
    th = design.get('height_mm') or design.get('canvas', {}).get('height_mm')
    
    if tw and th:
        page_w = mm_to_pt(float(tw))
        page_h = mm_to_pt(float(th))
        # الحساب الديناميكي للـ SCALE بناءً على عرض الصفحة بالبيكسل في المصمم
        # الافتراضي للمصمم هو 533px للشارة و 1060px للشهادة
        screen_w = design.get('canvas', {}).get('width_px') or (533 if doc_type == 'badge' else 1060)
        SCALE = page_w / float(screen_w)
    elif doc_type == 'badge':
        page_w = mm_to_pt(148)
        page_h = mm_to_pt(105)
        SCALE = page_w / 533
    else:  # certificate
        page_w = mm_to_pt(297)
        page_h = mm_to_pt(210)
        SCALE = page_w / 1060
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(page_w, page_h))
    
    # خلفية
    bg_color = design.get('background', {}).get('color', '#FFFFFF')
    c.setFillColor(parse_color(bg_color))
    c.rect(0, 0, page_w, page_h, fill=1, stroke=0)
    
    # صورة الخلفية إن وجدت
    bg_img = design.get('background', {}).get('image')
    if bg_img and isinstance(bg_img, str):
        try:
            if bg_img.startswith('data:image'):
                header, encoded = bg_img.split(",", 1)
                img_data = base64.b64decode(encoded)
                img_buffer = BytesIO(img_data)
                c.drawImage(ImageReader(img_buffer), 0, 0, width=page_w, height=page_h)
            elif bg_img.startswith('http') or bg_img.startswith('/static'):
                final_bg_path = bg_img
                if bg_img.startswith('/static'):
                    final_bg_path = os.path.normpath(os.path.join(PROJECT_ROOT, bg_img.lstrip('/')))
                c.drawImage(ImageReader(final_bg_path), 0, 0, width=page_w, height=page_h)
        except Exception as e:
            print(f"Error rendering background image: {e}")
    
    # الـ elements مرتبة حسب zIndex
    elements = design.get('elements', [])
    if not elements:
        # إذا كان القالب فارغاً، نضع نصاً تنبيهياً بدلاً من ترك الصفحة فارغة
        c.setFillColor(parse_color('#FF0000'))
        c.setFont('Helvetica-Bold', 20)
        c.drawCentredString(page_w/2, page_h/2, "Template is Empty - No elements found")
        c.save()
        return buffer.getvalue()

    elements = sorted(elements, key=lambda e: e.get('zIndex', 1))
    
    for el in elements:
        # إحداثيات (تحويل من top-left إلى bottom-left)
        x = el['x'] * SCALE
        y_screen = el['y'] * SCALE
        w = el['width'] * SCALE
        h = el['height'] * SCALE
        # ReportLab: y=0 في الأسفل → نحول
        y = page_h - y_screen - h
        
        el_type = el.get('type')
        
        # ── الأشكال ──
        if el_type in ('shape', 'role_color_shape'):
            color = el.get('color', '#000000')
            if el_type == 'role_color_shape':
                role_colors = el.get('roleColors', {})
                role = str(participant.get('role', '') or '').strip().lower()
                
                if 'vip' in role or 'شرف' in role:
                    color = role_colors.get('vip', '#F59E0B')
                elif 'speaker' in role or 'متحدث' in role:
                    color = role_colors.get('speaker', '#8B5CF6')
                elif 'press' in role or 'صحاف' in role or 'إعلام' in role or 'اعلام' in role:
                    color = role_colors.get('press', '#3B82F6')
                elif 'organizer' in role or 'تنظيم' in role or 'لجنة' in role:
                    color = role_colors.get('organizer', '#EF4444')
                else:
                    color = role_colors.get('default', '#10B981')
            
            c.setFillColor(parse_color(color))
            c.rect(x, y, w, h, fill=1, stroke=0)
        
        # ── النصوص ──
        elif el_type in ('static_text', 'dynamic_text', 'multiline_text', 'watermark'):
            style = el.get('style', {})
            
            # استبدال المتغيرات الديناميكية
            el_id = el.get('id', '')
            resolved = False
            if el_type == 'dynamic_text':
                if el_id.startswith('full_name'):
                    text = participant.get('full_name', '')
                    resolved = True
                elif el_id.startswith('organization'):
                    text = participant.get('organization', '')
                    resolved = True
                elif el_id.startswith('department'):
                    text = participant.get('department', '')
                    resolved = True
                elif el_id.startswith('role'):
                    text = participant.get('role', '')
                    resolved = True
                elif el_id.startswith('order_num'):
                    text = participant.get('order_num', '')
                    resolved = True
                elif el_id.startswith('seat_info'):
                    text = participant.get('seat_info', '')
                    resolved = True
                elif el_id.startswith('event_name'):
                    text = participant.get('event_name', '')
                    resolved = True
                elif el_id.startswith('event_location'):
                    text = participant.get('event_location', '')
                    resolved = True
                elif el_id.startswith('event_date'):
                    text = participant.get('event_date', '')
                    resolved = True
                elif el_id.startswith('cert_number'):
                    text = participant.get('cert_number', '')
                    resolved = True

            if not resolved:
                text = el.get('value') or el.get('placeholder', '')
                REPLACEMENTS = {
                    '[اسم المشارك]':    participant.get('full_name', ''),
                    '[الجهة]':          participant.get('organization', ''),
                    '[القسم]':          participant.get('department', ''),
                    '[الصفة]':          participant.get('role', ''),
                    '[رقم المشارك]':   participant.get('order_num', ''),
                    '[رقم المقعد]':    participant.get('seat_info', ''),
                    '[اسم الفعالية]':  participant.get('event_name', ''),
                    '[تاريخ الفعالية]': participant.get('event_date', ''),
                    '[مكان الفعالية]': participant.get('event_location', ''),
                    '[رقم الشهادة]':   participant.get('cert_number', ''),
                    'اسم المشارك الكامل': participant.get('full_name', ''),
                    'الاسم الكامل': participant.get('full_name', ''),
                    'القسم أو التخصص': participant.get('department', ''),
                    'الصفة أو المنصب': participant.get('role', ''),
                    'DWN-PREVIEW':     participant.get('order_num', ''),
                    'DWN-001':     participant.get('order_num', ''),
                }
                for placeholder, value in REPLACEMENTS.items():
                    val_str = str(value) if value is not None else ""
                    text = text.replace(placeholder, val_str)
            
            # خصائص الخط
            font_size_str = str(style.get('fontSize', '14px')).replace('px', '')
            try:
                font_size = float(font_size_str) * SCALE * 1.2
            except:
                font_size = 14 * SCALE * 1.2
                
            color = style.get('color', '#000000')
            text_align = style.get('textAlign', 'right')
            
            c.setFillColor(parse_color(color))
            
            font_name = 'Arabic-Bold' if style.get('fontWeight') in ['bold', '900', '700'] else 'Arabic-Regular'
            
            # ── تصغير الخط ديناميكياً إذا كان النص أطول من المساحة المحددة ──
            display_text = reshape(text)
            from reportlab.pdfbase.pdfmetrics import stringWidth
            try:
                text_width = stringWidth(display_text, font_name, font_size)
            except:
                text_width = 0
                
            # نصغر الخط ليناسب عرض الصندوق مع هامش 5%
            if text_width > w * 0.95 and text_width > 0:
                font_size = font_size * (w * 0.95 / text_width)
                
            try:
                c.setFont(font_name, font_size)
            except:
                c.setFont('Helvetica-Bold' if style.get('fontWeight') in ['bold', '900', '700'] else 'Helvetica', font_size)
            
            if el_type == 'watermark':
                c.saveState()
                c.translate(x + w/2, y + h/2)
                c.rotate(30) # ReportLab rotation is counter-clockwise
                c.drawCentredString(0, 0, display_text)
                c.restoreState()
            else:
                # حساب موضع النص حسب المحاذاة
                if text_align == 'center':
                    text_x = x + w / 2
                    c.drawCentredString(text_x, y + h/2 - font_size/3, display_text)
                elif text_align == 'right':
                    text_x = x + w
                    c.drawRightString(text_x, y + h/2 - font_size/3, display_text)
                else:
                    c.drawString(x, y + h/2 - font_size/3, display_text)
        
        # ── QR Code ──
        elif el_type == 'qr':
            qr_value = participant.get('qr_code') or participant.get('order_num', 'PREVIEW')
            qr = qrcode.QRCode(version=1, box_size=3, border=1)
            qr.add_data(qr_value)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color='black', back_color='white')
            qr_buffer = BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            qr_buffer.seek(0)
            c.drawImage(ImageReader(qr_buffer), x, y, width=w, height=h)
            
        # ── الصور والتوقيع ──
        elif el_type in ('image', 'signature'):
            img_src = el.get('src') or el.get('image')
            
            # إذا كان العنصر هو الشعار (id يبدأ بـ 'logo')، نجلبه من بيانات الفعالية
            el_id = el.get('id', '')
            if el_id.startswith('logo') and participant.get('event_logo'):
                img_src = participant.get('event_logo')
                _LOG = os.path.join(PROJECT_ROOT, "pdf_debug.log")
                with open(_LOG, "a", encoding="utf-8") as f:
                    f.write(f"[LOGO] id={el_id} resolved to: {img_src}\n")
            elif el_id.startswith('logo'):
                _LOG = os.path.join(PROJECT_ROOT, "pdf_debug.log")
                with open(_LOG, "a", encoding="utf-8") as f:
                    f.write(f"[LOGO] WARNING: event_logo is None! participant keys: {list(participant.keys())}\n")


            if img_src:
                try:
                    if img_src.startswith('data:image'):
                        header, encoded = img_src.split(",", 1)
                        img_data = base64.b64decode(encoded)
                        img_buffer = BytesIO(img_data)
                        c.drawImage(ImageReader(img_buffer), x, y, width=w, height=h, preserveAspectRatio=True, anchor='c')
                    else:
                        # معالجة المسارات الثابتة (تحويل /static/ إلى مسار مطلق على القرص)
                        final_path = img_src
                        if img_src.startswith('/static/'):
                            # فحص المجلد الرئيسي ومجلد app
                            rel_path = img_src.lstrip('/')
                            path_at_root = os.path.normpath(os.path.join(PROJECT_ROOT, rel_path))
                            path_in_app = os.path.normpath(os.path.join(PROJECT_ROOT, "app", rel_path))
                            
                            if os.path.exists(path_at_root):
                                final_path = path_at_root
                            elif os.path.exists(path_in_app):
                                final_path = path_in_app
                            else:
                                debug_msg = f"Image not found: root={path_at_root}, app={path_in_app}\n"
                                with open("pdf_debug.log", "a", encoding="utf-8") as f: f.write(debug_msg)
                        
                        if img_src.startswith('http') or (final_path and os.path.exists(final_path)):
                            # Log successful path for debugging
                            with open("pdf_debug.log", "a", encoding="utf-8") as f:
                                f.write(f"Rendering image: {final_path} (exists: {os.path.exists(final_path if final_path else '')})\n")
                            c.drawImage(ImageReader(final_path), x, y, width=w, height=h, preserveAspectRatio=True, anchor='c')
                except Exception as e:
                    with open("pdf_debug.log", "a", encoding="utf-8") as f:
                        f.write(f"Error rendering image {el.get('id')}: {e}\n")
        
        # ── إطار زخرفي ──
        elif el_type == 'frame':
            frame_color = el.get('color', '#D4AF37')
            c.setStrokeColor(parse_color(frame_color))
            
            margin = 8 * SCALE
            c.setLineWidth(2)
            c.rect(x + margin, y + margin, w - 2*margin, h - 2*margin, stroke=1, fill=0)
            c.setLineWidth(0.5)
            c.rect(x + margin*2, y + margin*2, w - 4*margin, h - 4*margin, stroke=1, fill=0)
    
    c.save()
    return buffer.getvalue()

def render_batch_pdf(design: dict, participants: list, doc_type: str = 'badge') -> bytes:
    """يولّد PDF متعدد الصفحات لجميع المشاركين بكفاءة عالية"""
    if not participants:
        return b''
        
    writer = PdfWriter()
    
    for participant in participants:
        try:
            pdf_bytes = render_design_to_pdf(design, participant, doc_type)
            reader = PdfReader(BytesIO(pdf_bytes))
            for page in reader.pages:
                writer.add_page(page)
        except Exception as e:
            print(f"Error rendering participant in batch: {e}")
            continue
    
    output = BytesIO()
    writer.write(output)
    return output.getvalue()
