import os
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image as PILImage
import qrcode
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# تسجيل الخطوط العربية
FONTS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "fonts")
try:
    pdfmetrics.registerFont(TTFont('Amiri', os.path.join(FONTS_DIR, "amiri-400.ttf")))
    pdfmetrics.registerFont(TTFont('Amiri-Bold', os.path.join(FONTS_DIR, "amiri-700.ttf")))
    pdfmetrics.registerFont(TTFont('Cairo', os.path.join(FONTS_DIR, "cairo-400.ttf")))
    pdfmetrics.registerFont(TTFont('Cairo-Bold', os.path.join(FONTS_DIR, "cairo-700.ttf")))
    DEFAULT_ARABIC_FONT = "Amiri"
    DEFAULT_ARABIC_BOLD = "Amiri-Bold"
except Exception as e:
    print(f"Warning: Failed to register Arabic fonts: {e}")
    DEFAULT_ARABIC_FONT = "Helvetica"
    DEFAULT_ARABIC_BOLD = "Helvetica-Bold"

def reshape_text(text):
    if not text: return ""
    text_str = str(text)
    try:
        reshaped = arabic_reshaper.reshape(text_str)
        return get_display(reshaped)
    except:
        return text_str

def draw_qr_at(c, data, x, y, size):
    qr = qrcode.QRCode(version=1, box_size=3, border=1)
    qr.add_data(data); qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buffer = BytesIO(); qr_img.save(qr_buffer, format='PNG'); qr_buffer.seek(0)
    from reportlab.lib.utils import ImageReader
    c.drawImage(ImageReader(qr_buffer), x, y, width=size, height=size)

def generate_dynamic_pdf(participant_data, template_config):
    """
    توليد PDF ديناميكي بناءً على إعدادات المصمم (Badge or Certificate).
    """
    buffer = BytesIO()
    is_cert = template_config.get('is_certificate', False)
    pagesize = landscape(A4) if is_cert else (400, 600)
    
    c = canvas.Canvas(buffer, pagesize=pagesize)
    width, height = pagesize

    bg_url = template_config.get('background_image')
    if bg_url:
        try:
            if bg_url.startswith('data:image'):
                import base64
                header, encoded = bg_url.split(",", 1)
                img_data = base64.b64decode(encoded)
                img_buffer = BytesIO(img_data)
                c.drawImage(PILImage.open(img_buffer), 0, 0, width=width, height=height)
            else:
                import requests
                response = requests.get(bg_url, timeout=5)
                img_buffer = BytesIO(response.content)
                c.drawImage(PILImage.open(img_buffer), 0, 0, width=width, height=height)
        except Exception as e:
            print(f"Error drawing background: {e}")

    elements = template_config.get('elements_config', {})
    for element_id, config in elements.items():
        # المنطق: إذا كان النوع حقل ديناميكي (اسم، فعالية) نأخذه من بيانات المشارك
        # وإذا كان نص مخصص نأخذه من الإعدادات نفسها
        e_type = config.get('type', '')
        
        if e_type in ['full_name', 'event_name', 'event_date', 'qr_code']:
            value = participant_data.get(e_type, config.get('text', ''))
        else:
            # نصوص مخصصة أو أنواع أخرى ثابتة
            value = config.get('text', '')

        x = config.get('x', 0)
        y = height - config.get('y', 0) - config.get('fontSize', 12)
        
        if e_type == 'qr_code':
            qr_size = config.get('fontSize', 80)
            qr_data = participant_data.get('qr_code', 'CERTIFIED')
            draw_qr_at(c, qr_data, x, y - qr_size + config.get('fontSize', 12), qr_size)
        else:
            # معالجة الخطوط والمظهر
            f_family = config.get('fontFamily', 'Amiri')
            font_name = 'Amiri' if f_family == 'Amiri' else 'Cairo'
            is_bold = config.get('fontWeight') == 'bold'
            
            if is_bold:
                font_name = f"{font_name}-Bold"
            
            c.saveState()
            
            # الشفافية
            c.setFillAlpha(config.get('opacity', 1.0))
            c.setFillColor(config.get('color', '#000000'))
            
            font_size = config.get('fontSize', 20)
            c.setFont(font_name, font_size)
            
            text = reshape_text(value)
            t_width = c.stringWidth(text, font_name, font_size)
            
            # المحاذاة
            align = config.get('textAlign', 'left')
            final_x = x
            if align == 'center':
                final_x = x - (t_width / 2)
            elif align == 'right':
                final_x = x - t_width
                
            c.drawString(final_x, y, text)
            c.restoreState()

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer

def generate_certificate_pdf(participant_name, event_name=None, date=None, template_config=None):
    """
    توليد شهادة حضور (نسخة مستقرة تدعم القوالب الديناميكية).
    """
    if template_config and template_config.get('elements_config'):
        # إضافة بيانات الفعالية لبيانات المشارك لتكون متاحة للمصمم
        p_data = participant_name if isinstance(participant_name, dict) else {"full_name": participant_name}
        if isinstance(event_name, dict):
            p_data.update(event_name)
        
        template_config['is_certificate'] = True
        return generate_dynamic_pdf(p_data, template_config)

    # Fallback to default professional layout
    # التعامل مع المدخلات كقاموس (Compatibility with credentials.py)
    if isinstance(participant_name, dict):
        p_data = participant_name
        e_data = event_name if isinstance(event_name, dict) else {}
        name = p_data.get('full_name', 'Participant')
        title = e_data.get('event_name', 'Diwan Event')
        dt = str(e_data.get('event_date', ''))
    else:
        name = participant_name
        title = event_name
        dt = date
        p_data = {}
        e_data = event_name if isinstance(event_name, dict) else {}

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)

    # Frame
    c.setStrokeColorRGB(0.83, 0.69, 0.22) # Gold
    c.setLineWidth(8)
    c.rect(25, 25, width-50, height-50)
    
    c.setStrokeColorRGB(0.01, 0.17, 0.13) # Emerald
    c.setLineWidth(2)
    c.rect(35, 35, width-70, height-70)

    # 1. Logo and Organizer Text (Top Header)
    y_ptr = height - 80
    logo_url = p_data.get('logo_url') if isinstance(participant_name, dict) else None
    if not logo_url and isinstance(event_name, dict):
        logo_url = event_name.get('logo_url')
        
    if logo_url:
        try:
            img = None
            if logo_url.startswith('http'):
                import requests
                resp = requests.get(logo_url, timeout=3)
                img = PILImage.open(BytesIO(resp.content))
            else:
                # Try relative paths
                possible_paths = [
                    logo_url.lstrip('/'),
                    os.path.join("app", logo_url.lstrip('/')),
                    os.path.join("..", logo_url.lstrip('/'))
                ]
                for p in possible_paths:
                    if os.path.exists(p):
                        img = PILImage.open(p)
                        break
                
            if img:
                # Center and scale logo
                l_w, l_h = 80, 80
                c.drawImage(img, (width/2) - (l_w/2), y_ptr - l_h, width=l_w, height=l_h, preserveAspectRatio=True, mask='auto')
                y_ptr -= (l_h + 20)
        except Exception as e:
            print(f"Logo error: {e}")

    # Organizer Text (Multiple lines)
    org_text = event_name.get('organizer_text', '') if isinstance(event_name, dict) else ''
    if org_text:
        c.setFont(DEFAULT_ARABIC_FONT, 14)
        c.setFillColorRGB(0.3, 0.3, 0.3)
        lines = org_text.split('\n')
        for line in lines:
            c.drawCentredString(width/2, y_ptr, reshape_text(line))
            y_ptr -= 18
        y_ptr -= 20

    # 2. Main Certificate Content
    c.setFillColorRGB(0.01, 0.17, 0.13)
    c.setFont(DEFAULT_ARABIC_BOLD, 45)
    c.drawCentredString(width/2, y_ptr, reshape_text("شهادة حضور"))
    y_ptr -= 60
    
    c.setFont(DEFAULT_ARABIC_FONT, 22)
    c.drawCentredString(width/2, y_ptr, reshape_text("نشهد أن السيد(ة):"))
    y_ptr -= 50
    
    c.setFont(DEFAULT_ARABIC_BOLD, 38)
    c.drawCentredString(width/2, y_ptr, reshape_text(name))
    y_ptr -= 60
    
    c.setFont(DEFAULT_ARABIC_FONT, 22)
    c.drawCentredString(width/2, y_ptr, reshape_text(f"قد حضر فعاليات: {title}"))
    y_ptr -= 40
    
    if dt:
        c.setFont(DEFAULT_ARABIC_FONT, 18)
        c.drawCentredString(width/2, y_ptr, reshape_text(f"بتاريخ: {dt}"))

    # 3. Footer: QR Code and Signatures
    f_y = 100
    # QR Code (Left)
    qr_data = p_data.get('qr_code', 'CERTIFIED')
    draw_qr_at(c, qr_data, 70, f_y - 20, 70)
    c.setFont(DEFAULT_ARABIC_FONT, 8)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.drawString(70, f_y - 30, reshape_text("رمز التحقق الرقمي"))

    # Signatures
    sig1 = event_name.get('report_signature_1', 'توقيع اللجنة المنظمة')
    sig2 = event_name.get('report_signature_2', 'توقيع المسؤول')
    
    c.setFillColorRGB(0.01, 0.17, 0.13)
    c.setFont(DEFAULT_ARABIC_BOLD, 16)
    
    # Sig 1 (Center-Right)
    c.drawCentredString(width * 0.5, f_y, reshape_text(sig1))
    c.setDash(1, 2)
    c.line(width * 0.4, f_y - 10, width * 0.6, f_y - 10)
    
    # Sig 2 (Far Right)
    c.drawCentredString(width * 0.8, f_y, reshape_text(sig2))
    c.line(width * 0.7, f_y - 10, width * 0.9, f_y - 10)
    c.setDash()

    # Footer Text
    footer = event_name.get('footer_text', 'Diwan Event Platform')
    c.setFont(DEFAULT_ARABIC_FONT, 10)
    c.setFillColorRGB(0.5, 0.5, 0.5)
    c.drawCentredString(width/2, 45, reshape_text(footer))
        
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer
