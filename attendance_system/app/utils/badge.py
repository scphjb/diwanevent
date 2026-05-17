from reportlab.lib.pagesizes import A6, landscape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
import arabic_reshaper
from bidi.algorithm import get_display
import qrcode
import os

def reshape_arabic(text: str) -> str:
    if not text: return ""
    try:
        configuration = { 'delete_harakat': False, 'support_ligatures': True, 'ARABIC_LIGATURES': True, 'use_font_ligatures': True }
        reshaper = arabic_reshaper.ArabicReshaper(configuration)
        return get_display(reshaper.reshape(str(text)))
    except: return str(text)

def draw_text_auto_scale(c, text, x, y, max_width, initial_font_size, font_name, align='center', lang='ar'):
    reshaped_text = reshape_arabic(text) if lang == 'ar' else text
    font_size = initial_font_size
    while font_size > 7:
        current_width = pdfmetrics.stringWidth(reshaped_text, font_name, font_size)
        if (current_width * 1.05) <= max_width: break
        font_size -= 0.5
    c.setFont(font_name, font_size)
    if align == 'center': c.drawCentredString(x, y, reshaped_text)
    elif align == 'right': c.drawRightString(x, y, reshaped_text)
    else: c.drawString(x, y, reshaped_text)

def draw_diwan_logo(c, x, y, scale=1.0, color='#064e3b'):
    """رسم لوغو ديوان الذكي باستخدام أشكال هندسية (ReportLab Native)"""
    c.saveState()
    c.translate(x, y)
    c.scale(scale, scale)
    
    # رسم الدائرة المحيطة
    c.setStrokeColor(HexColor(color))
    c.setLineWidth(0.5)
    c.setStrokeAlpha(0.2)
    c.circle(10, 10, 9, stroke=1, fill=0)
    
    # رسم حرف D المميز (ككتلة رقمية)
    c.setStrokeAlpha(1.0)
    c.setFillColor(HexColor(color))
    p = c.beginPath()
    p.moveTo(6, 5)
    p.lineTo(11, 5)
    p.curveTo(15, 5, 17, 10, 17, 10)
    p.curveTo(17, 10, 15, 15, 11, 15)
    p.lineTo(6, 15)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    
    # نص اللوغو
    c.setFont("Helvetica-Bold", 7)
    c.drawString(22, 11, "DIWAN")
    c.setFont("Helvetica", 3.5)
    c.drawString(22, 7, "SMART EVENTS")
    
    c.restoreState()

def draw_calendar_icon(c, x, y, size=8, color='#D4AF37'):
    c.saveState()
    c.setStrokeColor(HexColor(color))
    c.setLineWidth(0.8)
    # المربع الرئيسي
    c.rect(x, y, size, size, stroke=1, fill=0)
    # الخط العلوي
    c.line(x, y + size - 2, x + size, y + size - 2)
    # الخطافات الصغيرة
    c.line(x + 2, y + size, x + 2, y + size + 2)
    c.line(x + size - 2, y + size, x + size - 2, y + size + 2)
    c.restoreState()

def draw_gps_icon(c, x, y, size=8, color='#D4AF37'):
    c.saveState()
    c.translate(x + size/2, y + size/2)
    c.setStrokeColor(HexColor(color))
    c.setLineWidth(0.8)
    # الرأس المستدير
    c.circle(0, 2, 3, stroke=1, fill=0)
    # السهم السفلي
    p = c.beginPath()
    p.moveTo(-2.5, 0.5)
    p.lineTo(0, -3)
    p.lineTo(2.5, 0.5)
    c.drawPath(p, stroke=1, fill=0)
    # الثقب الصغير
    c.circle(0, 2, 0.8, stroke=1, fill=0)
    c.restoreState()

def get_contrast_color(hex_color):
    """حساب اللون المناسب للنص (أبيض أو غامق) بناءً على سطوع الخلفية"""
    if not hex_color: return '#000000'
    try:
        hex_color = hex_color.lstrip('#')
        r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
        return '#022C22' if yiq >= 128 else '#FFFFFF'
    except:
        return '#000000'

def draw_badge_on_canvas(c, participant: dict, event: dict = None, template: dict = None):
    if event is None: event = {}
    if template is None: template = {}
    lang = event.get('language', 'ar')
    style = template.get('style_preset', 'royal')
    size_key = template.get('page_size', 'A6')
    is_small = size_key in ['CR80', 'A7']

    h_bg = template.get('header_bg', '#022C22')
    b_bg = template.get('body_bg', '#FFFFFF')
    f_bg = template.get('footer_bg', '#F8FAFC')
    accent = template.get('accent_color', '#D4AF37')

    from reportlab.lib import pagesizes
    PAGE_SIZES = { 
        'A6': pagesizes.A6, 'CR80': (85.6 * 2.834, 53.98 * 2.834),
        'B7': (88 * 2.834, 125 * 2.834), 'A7': (74 * 2.834, 105 * 2.834),
        'Custom': (100 * 2.834, 140 * 2.834)
    }
    base_size = PAGE_SIZES.get(size_key, pagesizes.A6)
    w, h = pagesizes.portrait(base_size) if size_key != 'CR80' else pagesizes.landscape(base_size)
    
    pdfmetrics.registerFont(TTFont('Amiri-Bold', "app/static/fonts/amiri-700.ttf"))
    font_name = 'Amiri-Bold' if lang == 'ar' else 'Helvetica-Bold'
    labels = { 'ar': { 'attendee': 'مشارك معتمد' }, 'en': { 'attendee': 'OFFICIAL DELEGATE' } }.get(lang, {'attendee': 'OFFICIAL DELEGATE'})

    # إضافة هامش علوي لثقب البطاقة (10 ملم تقريباً)
    punch_gap = 30
    h = h - punch_gap

    # 1. الملكي (Royal)
    if style == 'royal':
        # الهيدر النحيف المطور
        h_ratio = 0.20 if is_small else 0.18
        c.setFillColor(HexColor(h_bg)); c.rect(0, h*(1-h_ratio), w, h*h_ratio, fill=1, stroke=0)
        c.setFillColor(HexColor(b_bg)); c.rect(0, h*0.20 if is_small else h*0.15, w, h*(1-h_ratio-(0.20 if is_small else 0.15)), fill=1, stroke=0)
        c.setFillColor(HexColor(f_bg)); c.rect(0, 0, w, h*0.20 if is_small else h*0.15, fill=1, stroke=0)
        
        # عنوان الفعالية في الهيدر النحيف
        c.setFillColor(HexColor(get_contrast_color(h_bg)))
        draw_text_auto_scale(c, event.get('event_name', 'DIWAN'), w/2, h - (h*h_ratio/2) - (4 if is_small else 8), w*0.8, 12 if is_small else 18, font_name, lang=lang)
        
        # اسم المشارك في الوسط (مساحة واسعة)
        body_text_color = get_contrast_color(b_bg)
        c.setFillColor(HexColor(body_text_color))
        draw_text_auto_scale(c, participant.get('full_name', ''), w/2, h*0.55 if is_small else h*0.50, w*0.85, 24 if is_small else 36, font_name, lang=lang)
        c.setFillColor(HexColor(body_text_color))
        c.setFillAlpha(0.4); c.setStrokeAlpha(0.4)
        draw_text_auto_scale(c, participant.get('organization', ''), w/2, h*0.42 if is_small else h*0.35, w*0.8, 10 if is_small else 14, font_name, lang=lang)
        c.setFillAlpha(1.0); c.setStrokeAlpha(1.0)

        # معلومات اللوجستيك (التاريخ والمكان) فوق الفوتر - عمودي
        c.setFillColor(HexColor(body_text_color))
        c.setFillAlpha(0.6); c.setStrokeAlpha(0.6)
        logistics_y = h*0.25 if is_small else h*0.22
        
        # التاريخ: أيقونة فوق النص
        draw_calendar_icon(c, w/2 - 50 if is_small else w/2 - 70, logistics_y + 10, size=8, color=accent)
        draw_text_auto_scale(c, event.get('start_date', '2026-05-20'), w/2 - 45 if is_small else w/2 - 65, logistics_y, w*0.35, 6 if is_small else 9, font_name, lang=lang)
        
        # المكان: أيقونة فوق النص
        draw_gps_icon(c, w/2 + 30 if is_small else w/2 + 45, logistics_y + 10, size=8, color=accent)
        draw_text_auto_scale(c, event.get('location', 'الجزائر'), w/2 + 35 if is_small else w/2 + 55, logistics_y, w*0.35, 6 if is_small else 9, font_name, lang=lang)
        c.setFillAlpha(1.0); c.setStrokeAlpha(1.0)

        # شريط القاعدة: QR (يسار) + التصنيف (وسط) + اللوغو (يمين)
        f_y = (h*0.20/2) if is_small else (h*0.15/2)
        
        # 1. QR Code على اليسار
        draw_qr_at(c, participant.get('qr_code', 'PASS'), 10, 5 if is_small else 10, 45 if is_small else 65)
        
        # بطاقة التصنيف (VIP) في الوسط تماماً
        c.setFillColor(HexColor(accent))
        role_text = participant.get('role') or labels['attendee']
        role_w = pdfmetrics.stringWidth(reshape_arabic(role_text), font_name, 6 if is_small else 9) + (10 if is_small else 20)
        c.rect(w/2 - role_w/2, f_y - 6 if is_small else f_y - 10, role_w, 14 if is_small else 20, fill=1, stroke=0)
        c.setFillColor(HexColor('#FFFFFF')); c.setFont(font_name, 6 if is_small else 9); 
        c.drawCentredString(w/2, f_y - 3 if is_small else f_y - 4, reshape_arabic(role_text))
        
        # 3. لوغو ديوان على اليمين
        draw_diwan_logo(c, w-55 if is_small else w-75, 8 if is_small else 12, scale=0.6 if is_small else 0.8)

    # 2. المؤسسي المطور (Corporate v2.0) - الجانبية على اليمين (RTL Friendly)
    elif style == 'corporate':
        sidebar_w = w*0.25 if is_small else w*0.30
        main_w = w - sidebar_w
        
        # رسم الهيكل: الجانبية يميناً والجسد يساراً
        c.setFillColor(HexColor(h_bg)); c.rect(main_w, 0, sidebar_w, h, fill=1, stroke=0)
        c.setFillColor(HexColor(b_bg)); c.rect(0, 0, main_w, h, fill=1, stroke=0)
        
        # --- محتويات الشريط الجانبي (على اليمين) ---
        side_x = main_w
        
        # QR في الأعلى (تم تكبيره للمسح السريع)
        qr_size = 45 if is_small else 70
        draw_qr_at(c, participant.get('qr_code', 'PASS'), side_x + (sidebar_w/2 - qr_size/2), h-55 if is_small else h-85, qr_size)
        
        # العنوان الرأسي (مركز في الجانبية)
        sidebar_text_color = get_contrast_color(h_bg)
        c.saveState(); c.translate(side_x + sidebar_w/2, h/2); c.rotate(90); c.setFillColor(HexColor(sidebar_text_color))
        c.setStrokeAlpha(0.6)
        draw_text_auto_scale(c, event.get('event_name', 'DIWAN'), 0, -4 if is_small else -6, h*0.5, 10 if is_small else 14, font_name, lang=lang)
        c.restoreState()
        
        # لوغو ديوان في أسفل الجانبية
        draw_diwan_logo(c, side_x + (sidebar_w/2 - 15 if is_small else sidebar_w/2 - 20), 10 if is_small else 20, scale=0.5 if is_small else 0.7, color=sidebar_text_color)

        # --- محتويات الجسد الرئيسي (على اليسار) ---
        body_text_color = get_contrast_color(b_bg)
        c.setFillColor(HexColor(body_text_color))
        
        # محاذاة النص بناءً على اللغة (يمين للعربي، يسار للإنجليزي) لتطابق المعاينة
        is_ar = lang == 'ar'
        body_x = (main_w - 15) if is_ar else 15
        body_align = 'right' if is_ar else 'left'
        
        draw_text_auto_scale(c, participant.get('full_name', ''), body_x, h*0.6, main_w-30, 24 if is_small else 36, font_name, align=body_align, lang=lang)
        
        c.setFillAlpha(0.4); c.setStrokeAlpha(0.4)
        draw_text_auto_scale(c, participant.get('organization', ''), body_x, h*0.45, main_w-30, 10 if is_small else 14, font_name, align=body_align, lang=lang)
        c.setFillAlpha(1.0); c.setStrokeAlpha(1.0)
        
        # بطاقة التصنيف (مشارك معتمد) - تم خفضها لتجنب التداخل مع اسم الفعالية
        c.setFillColor(HexColor(accent))
        role_text = participant.get('role') or labels['attendee']
        role_w = sidebar_w * 0.8
        role_y = 35 if is_small else 50
        c.rect(side_x + (sidebar_w - role_w)/2, role_y, role_w, 15 if is_small else 22, fill=1, stroke=0)
        c.setFillColor(HexColor('#FFFFFF')); c.setFont(font_name, 6 if is_small else 8); 
        c.drawCentredString(side_x + sidebar_w/2, role_y + (4 if is_small else 7), reshape_arabic(role_text))

        # معلومات اللوجستيك (التاريخ والمكان) في أسفل المؤسسي - عمودي
        c.setFillColor(HexColor(body_text_color))
        c.setFillAlpha(0.5); c.setStrokeAlpha(0.5)
        log_y = 20 if is_small else 35
        # أيقونات مطورة فوق الكلمة
        draw_calendar_icon(c, 20, log_y + 10, size=6, color=accent)
        draw_text_auto_scale(c, event.get('start_date', '2026-05-20'), 23, log_y, main_w*0.4, 5 if is_small else 8, font_name, align='left', lang=lang)
        
        draw_gps_icon(c, 80 if is_small else 110, log_y + 10, size=6, color=accent)
        draw_text_auto_scale(c, event.get('location', 'الجزائر'), 83 if is_small else 113, log_y, main_w*0.5, 5 if is_small else 8, font_name, align='left', lang=lang)
        c.setFillAlpha(1.0); c.setStrokeAlpha(1.0)

def draw_qr_at(c, data, x, y, size):
    qr = qrcode.QRCode(version=1, box_size=3, border=1)
    qr.add_data(data); qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buffer = BytesIO(); qr_img.save(qr_buffer, format='PNG'); qr_buffer.seek(0)
    from reportlab.lib.utils import ImageReader
    c.drawImage(ImageReader(qr_buffer), x, y, width=size, height=size)

def generate_badge_pdf(participant: dict, event: dict = None, template: dict = None) -> bytes:
    if template is None: template = {}
    size_key = template.get('page_size', 'A6')
    from reportlab.lib import pagesizes
    PAGE_SIZES = { 
        'A6': pagesizes.A6, 'CR80': (85.6 * 2.834, 53.98 * 2.834),
        'B7': (88 * 2.834, 125 * 2.834), 'A7': (74 * 2.834, 105 * 2.834),
        'Custom': (100 * 2.834, 140 * 2.834)
    }
    base_size = PAGE_SIZES.get(size_key, pagesizes.A6)
    w, h = pagesizes.portrait(base_size) if size_key != 'CR80' else pagesizes.landscape(base_size)
    buffer = BytesIO(); c = canvas.Canvas(buffer, pagesize=(w, h))
    draw_badge_on_canvas(c, participant, event, template)
    c.save()
    return buffer.getvalue()
