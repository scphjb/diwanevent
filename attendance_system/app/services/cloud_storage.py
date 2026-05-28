import boto3
from botocore.exceptions import NoCredentialsError
from app.core.config import settings
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

class StorageService:
    """
    خدمة التخزين السحابي الموحدة (S3/Cloudflare R2/MinIO).
    تدعم الترفع السحابي الآمن مع التراجع التلقائي للتخزين المحلي في حال عدم وجود الإعدادات.
    """
    def __init__(self):
        self.is_configured = bool(
            settings.AWS_ACCESS_KEY and 
            settings.AWS_SECRET_KEY and 
            settings.S3_BUCKET_NAME
        )
        if self.is_configured:
            self.s3 = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY,
                aws_secret_access_key=settings.AWS_SECRET_KEY,
                endpoint_url=settings.S3_ENDPOINT, # لدعم Cloudflare R2 / MinIO
                region_name='auto' # مطلوب خصيصاً من كلودفلار R2
            )
            self.bucket_name = settings.S3_BUCKET_NAME
        else:
            self.s3 = None
            self.bucket_name = None

    def upload_file(self, file_content: bytes, filename: str, content_type: str = "application/octet-stream") -> bool:
        """رفع الملف للسحاب (إذا كان مهيأً)"""
        if not self.is_configured:
            return False
        try:
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=filename,
                Body=file_content,
                ContentType=content_type
            )
            return True
        except Exception as e:
            import logging
            logging.getLogger("diwan.storage").error(f"S3 Cloud Storage Error: {str(e)}")
            return False

    def upload_image_or_file(self, file_content: bytes, filename: str, folder: str, content_type: str = "image/png") -> str:
        """
        رفع الصورة أو الملف.
        إذا كان R2/S3 مهيأً: يرفعها سحابياً ويرجع الرابط المطلق المباشر.
        إذا لم يكن مهيأً: يحفظها محلياً في مجلد static ويرجع الرابط النسبي.
        """
        import os
        import time
        
        # تنظيف اسم الملف
        raw_name, raw_ext = os.path.splitext(filename)
        clean_ext = "".join(c for c in raw_ext if c.isalnum() or c == '.')
        clean_name = "".join(c for c in raw_name if c.isalnum() or c in "_-")
        unique_name = f"{clean_name}_{int(time.time())}{clean_ext}"
        
        s3_key = f"{folder}/{unique_name}"
        
        if self.is_configured:
            success = self.upload_file(file_content, s3_key, content_type)
            if success:
                public_url = settings.S3_PUBLIC_URL or f"{settings.S3_ENDPOINT}/{settings.S3_BUCKET_NAME}"
                base_url = public_url.rstrip('/')
                return f"{base_url}/{s3_key}"
                
        # التراجع التلقائي للتخزين المحلي (Local Fallback)
        local_dir = os.path.join("static", folder)
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, unique_name)
        
        with open(local_path, "wb") as buffer:
            buffer.write(file_content)
            
        return f"/static/{folder}/{unique_name}"

    def get_presigned_url(self, filename: str, expires_in: int = 3600) -> Optional[str]:
        """توليد رابط مؤقت وآمن للتحميل (Presigned URL)"""
        if not self.is_configured:
            return None
        try:
            url = self.s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': filename},
                ExpiresIn=expires_in
            )
            return url
        except Exception:
            return None

class TaskStatusManager:
    """
    يتتبع حالة المهام الثقيلة (توليد ملفات، إرسال مراسلات ضخمة).
    """
    @staticmethod
    async def update_task_status(db: AsyncSession, event_uuid: str, status: str, result_url: str = None):
        from app.models.outbox import OutboxEvent
        stmt = select(OutboxEvent).filter(OutboxEvent.event_uuid == event_uuid)
        res = await db.execute(stmt)
        task = res.scalars().first()
        if task:
            task.status = status # PENDING, PROCESSING, COMPLETED, FAILED
            if result_url:
                task.payload["result_url"] = result_url
            await db.commit()
