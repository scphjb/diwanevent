import boto3
from botocore.exceptions import NoCredentialsError
from app.core.config import settings
from typing import Optional

class StorageService:
    """
    خدمة التخزين السحابي الموحدة (S3/MinIO).
    تضمن عدم تخزين أي ملفات حساسة محلياً على السيرفر.
    """
    def __init__(self):
        self.s3 = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY,
            aws_secret_access_key=settings.AWS_SECRET_KEY,
            endpoint_url=settings.S3_ENDPOINT # لدعم MinIO محلياً
        )
        self.bucket_name = settings.S3_BUCKET_NAME

    def upload_file(self, file_content: bytes, filename: str, content_type: str = "application/pdf") -> bool:
        """رفع الملف للسحاب"""
        try:
            self.s3.put_object(
                Bucket=self.bucket_name,
                Key=filename,
                Body=file_content,
                ContentType=content_type
            )
            return True
        except Exception as e:
            print(f"Storage Error: {str(e)}")
            return False

    def get_presigned_url(self, filename: str, expires_in: int = 3600) -> Optional[str]:
        """توليد رابط مؤقت وآمن للتحميل (Presigned URL)"""
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
    def update_task_status(db, event_uuid: str, status: str, result_url: str = None):
        from app.models.outbox import OutboxEvent
        task = db.query(OutboxEvent).filter(OutboxEvent.event_uuid == event_uuid).first()
        if task:
            task.status = status # PENDING, PROCESSING, COMPLETED, FAILED
            if result_url:
                task.payload["result_url"] = result_url
            db.commit()
