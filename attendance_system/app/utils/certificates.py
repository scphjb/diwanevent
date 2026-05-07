import os
from io import BytesIO
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, landscape
import arabic_reshaper
from bidi.algorithm import get_display
from PIL import Image as PILImage

def reshape_text(text):
    if not text: return ""
    text_str = str(text)
    try:
        reshaped = arabic_reshaper.reshape(text_str)
        return get_display(reshaped)
    except:
        return text_str

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
    for key, config in elements.items():
        value = participant_data.get(key, config.get('label', ''))
        x = config.get('x', 0)
        y = height - config.get('y', 0) - config.get('fontSize', 12)
        
        if key == 'qr_code':
            qr_size = config.get('size', 80)
            c.setStrokeColorRGB(0.5, 0.5, 0.5)
            c.rect(x, y - qr_size + config.get('fontSize', 12), qr_size, qr_size, fill=0)
            c.setFont("Helvetica", 8)
            c.drawCentredString(x + qr_size/2, y - qr_size/2, "QR CODE")
        else:
            c.setFillColor(config.get('color', '#000000'))
            c.setFont("Helvetica-Bold", config.get('fontSize', 20))
            c.drawString(x, y, reshape_text(value))

    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer

def generate_certificate_pdf(participant_name, event_name=None, date=None):
    """
    توليد شهادة حضور (نسخة مستقرة بدون الاعتماد على requests للملفات المحلية).
    """
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

    # Text
    c.setFillColorRGB(0.01, 0.17, 0.13)
    c.setFont("Helvetica-Bold", 45)
    c.drawCentredString(width/2, height - 150, reshape_text("شهادة حضور"))
    
    c.setFont("Helvetica", 22)
    c.drawCentredString(width/2, height - 220, reshape_text("نشهد أن السيد(ة):"))
    
    c.setFont("Helvetica-Bold", 38)
    c.drawCentredString(width/2, height - 280, reshape_text(name))
    
    c.setFont("Helvetica", 22)
    c.drawCentredString(width/2, height - 340, reshape_text(f"قد حضر فعاليات: {title}"))
    
    if dt:
        c.setFont("Helvetica", 18)
        c.drawCentredString(width/2, height - 390, reshape_text(f"بتاريخ: {dt}"))
        
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer # Returns BytesIO for compatibility with .getvalue()
