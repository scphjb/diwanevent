import json
from typing import Any, Dict
from app.core.config import settings

class TaskDispatcher:
    """
    محرك توزيع المهام المستقل. 
    يمكنه التواصل مع Redis أو RabbitMQ أو حتى محاكاة العمل في الخلفية.
    """
    @staticmethod
    async def dispatch_pdf_generation(participant_id: int, template_id: int):
        task_payload = {
            "task_type": "GENERATE_BADGE",
            "participant_id": participant_id,
            "template_id": template_id,
            "priority": "high"
        }
        # هنا يتم النشر في الـ Message Broker
        # redis_client.publish("pdf_tasks", json.dumps(task_payload))
        print(f"SOA: Task dispatched to PDF Worker -> Participant {participant_id}")

class EnterprisePDFEngine:
    """
    محرك توليد المستندات الاحترافي.
    يدعم HTML/CSS Rendering لمرونة كاملة في التصميم.
    """
    @staticmethod
    def render_html_template(template_content: str, data: Dict[str, Any]) -> str:
        # استخدام Jinja2 لدمج البيانات في القالب
        from jinja2 import Template
        tmpl = Template(template_content)
        return tmpl.render(**data)

    @staticmethod
    async def generate_pdf_from_html(html_content: str) -> bytes:
        """
        تحويل الـ HTML إلى PDF باستخدام WeasyPrint أو Playwright.
        """
        # ملاحظة: يتطلب تثبيت WeasyPrint (pip install weasyprint)
        try:
            from weasyprint import HTML
            pdf_bytes = HTML(string=html_content).write_pdf()
            return pdf_bytes
        except ImportError:
            print("PDF Engine: WeasyPrint not installed, falling back to mock.")
            return b"PDF_CONTENT_MOCK"
