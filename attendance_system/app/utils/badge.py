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
    """تحويل النص العربي للعرض الصحيح"""
    if not text:
        return ""
    try:
        reshaped = arabic_reshaper.reshape(str(text))
        return get_display(reshaped)
    except:
        return str(text)

def generate_badge_pdf(participant: dict, event: dict = None) -> bytes:
    """
    توليد بادج PDF لمشارك واحد (تصميم Diwan Premium).
    """
    if event is None:
        event = {}
        
    buffer = BytesIO()
    # A6 landscape (148.4 x 105 mm)
    w, h = landscape(A6)
    c = canvas.Canvas(buffer, pagesize=(w, h))
    
    # تسجيل الخط العربي
    font_path = "app/static/fonts/cairo-700.ttf"
    font_name = "Arabic-Bold"
    if os.path.exists(font_path):
        pdfmetrics.registerFont(TTFont(font_name, font_path))
    else:
        font_name = "Helvetica-Bold" # Fallback

    primary = event.get('primary_color', '#D4AF37')
    secondary = event.get('secondary_color', '#022C22')
    
    # خلفية (اللون الثانوي الداكن)
    c.setFillColor(HexColor(secondary))
    c.rect(0, 0, w, h, fill=1)
    
    # شريط ذهبي علوي
    c.setFillColor(HexColor(primary))
    c.rect(0, h-25, w, 25, fill=1)
    
    # اسم الفعالية في الشريط العلوي
    c.setFillColor(HexColor(secondary))
    c.setFont(font_name, 10)
    event_name = reshape_arabic(event.get('event_name', 'Diwan Event Platform'))
    c.drawCentredString(w/2, h-17, event_name)
    
    # اسم المشارك (المنتصف)
    c.setFillColor(HexColor(primary))
    c.setFont(font_name, 22)
    name = reshape_arabic(participant.get('full_name', ''))
    c.drawCentredString(w/2, h-55, name)
    
    # الجهة / المنصب (تحت الاسم)
    c.setFillColor(HexColor('#FFFFFF'))
    c.setFont(font_name, 12)
    council = reshape_arabic(participant.get('council', ''))
    c.drawCentredString(w/2, h-72, council)
    
    # توليد QR Code
    qr_value = participant.get('qr_code', participant.get('order_num', 'N/A'))
    qr = qrcode.QRCode(version=1, box_size=3, border=2)
    qr.add_data(qr_value)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)
    
    from reportlab.lib.utils import ImageReader
    qr_reader = ImageReader(qr_buffer)
    # وضع الـ QR في الزاوية اليمنى السفلية
    c.drawImage(qr_reader, w-65, 8, width=55, height=55)
    
    # رقم الطلب في الزاوية اليسرى السفلية
    c.setFillColor(HexColor('#AAAAAA'))
    c.setFont("Helvetica", 7)
    c.drawString(8, 10, f"Order: {participant.get('order_num', '')}")
    
    c.save()
    return buffer.getvalue()
