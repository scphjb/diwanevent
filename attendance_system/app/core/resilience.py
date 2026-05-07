import time
import logging
from typing import Callable, Any
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from fastapi import Request

# --- [1] Distributed Tracing (OpenTelemetry Setup) ---

# إعداد الـ Tracer
provider = TracerProvider()
processor = BatchSpanProcessor(ConsoleSpanExporter())
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer(__name__)

def get_correlation_id():
    """الحصول على الـ Trace ID الحالي للطلب"""
    span = trace.get_current_span()
    if span:
        return format(span.get_span_context().trace_id, '032x')
    return None

# --- [2] Circuit Breaker Pattern (Custom Implementation) ---

class CircuitBreaker:
    """
    قاطع دائرة ذكي لحماية النظام من الخدمات الخارجية.
    الحالات: CLOSED (يعمل), OPEN (مقطوع), HALF_OPEN (اختبار)
    """
    def __init__(self, name: str, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = 0
        self.state = "CLOSED"

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        if self.state == "OPEN":
            # إذا مر وقت التعافي، ننتقل للحالة نصف المفتوحة للاختبار
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
                logging.info(f"Circuit {self.name} is now HALF_OPEN. Testing recovery...")
            else:
                logging.warning(f"Circuit {self.name} is OPEN. Blocking call to protect system.")
                raise Exception(f"Circuit Breaker [{self.name}] is OPEN")

        try:
            # بدء محاولة تنفيذ العملية داخل Span لتتبعها
            with tracer.start_as_current_span(f"circuit_breaker_{self.name}"):
                result = await func(*args, **kwargs)
                
                # نجاح العملية: تصفير العداد
                if self.state == "HALF_OPEN":
                    logging.info(f"Circuit {self.name} recovered successfully! State: CLOSED")
                self.state = "CLOSED"
                self.failure_count = 0
                return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            
            if self.failure_count >= self.failure_threshold:
                self.state = "OPEN"
                logging.error(f"Circuit {self.name} opened due to multiple failures: {str(e)}")
            
            raise e

# إنشاء مثيل لحماية خدمة البريد الإلكتروني
email_circuit = CircuitBreaker(name="SMTP_Service", failure_threshold=5, recovery_timeout=300)
