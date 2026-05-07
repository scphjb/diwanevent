from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class CheckInProvider(ABC):
    """
    الواجهة الأساسية لأي وسيلة تحقق من الهوية.
    """
    @abstractmethod
    async def validate_identity(self, raw_data: str) -> Optional[int]:
        """
        تحويل البيانات الخام (QR string, NFC ID, Face Feature) إلى معرف المشارك (Participant ID).
        """
        pass

class QRProvider(CheckInProvider):
    async def validate_identity(self, raw_data: str) -> Optional[int]:
        # استخراج المعرف من كود الـ QR (مثلاً: QR-123)
        if raw_data.startswith("QR-"):
            return int(raw_data.split("-")[1])
        return None

class NFCProvider(CheckInProvider):
    async def validate_identity(self, raw_data: str) -> Optional[int]:
        # استعلام قاعدة البيانات للبحث عن المشارك المرتبط بـ NFC Tag ID
        # db.query(Participant).filter(Participant.nfc_tag == raw_data)
        print(f"HAL: Processing NFC Tag -> {raw_data}")
        return 1 # Mock ID

class CheckInHAL:
    """
    المحرك المركزي الذي يستقبل الطلب ويوجهه للمزود المناسب.
    """
    def __init__(self):
        self.providers = {
            "qr": QRProvider(),
            "nfc": NFCProvider()
        }

    async def process_checkin(self, method: str, raw_data: str) -> Optional[int]:
        provider = self.providers.get(method.lower())
        if not provider:
            raise Exception(f"Check-in method '{method}' not supported.")
        
        return await provider.validate_identity(raw_data)
