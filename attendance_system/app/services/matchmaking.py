import numpy as np
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.participant import Participant
from sqlalchemy import select

class AIMatchmakingService:
    """
    محرك التعارف الذكي باستخدام Vector Embeddings.
    يستخدم Cosine Similarity للعثور على المشاركين ذوي الاهتمامات المشتركة.
    """
    
    @staticmethod
    def calculate_similarity(v1: List[float], v2: List[float]) -> float:
        """حساب التشابه بين متجهين (Cosine Similarity)"""
        if not v1 or not v2: return 0.0
        vec1 = np.array(v1)
        vec2 = np.array(v2)
        return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))

    @staticmethod
    async def find_matches(db: AsyncSession, participant_id: int, top_n: int = 5) -> List[Dict[str, Any]]:
        """
        العثور على أفضل 'N' شخص للتعارف بالنسبة لمشارك معين.
        """
        target = await db.get(Participant, participant_id)
        if not target or not target.custom_values or not target.custom_values.get("interest_embedding"):
            return []

        target_vector = target.custom_values["interest_embedding"]
        
        # جلب المشاركين الآخرين في نفس الفعالية
        stmt = select(Participant).filter(
            Participant.event_id == target.event_id,
            Participant.id != participant_id
        )
        res = await db.execute(stmt)
        others = res.scalars().all()

        matches = []
        for other in others:
            if not other.custom_values: continue
            other_vector = other.custom_values.get("interest_embedding")
            if other_vector:
                score = AIMatchmakingService.calculate_similarity(target_vector, other_vector)
                matches.append({
                    "id": other.id,
                    "name": other.full_name,
                    "role": other.role,
                    "score": float(score)
                })

        # ترتيب النتائج حسب الأعلى تشابهاً
        matches.sort(key=lambda x: x["score"], reverse=True)
        return matches[:top_n]

    @staticmethod
    def generate_interest_vector(interests: List[str]) -> List[float]:
        """
        محاكاة لتحويل النصوص إلى متجهات (Embedding).
        في الإنتاج، نستخدم OpenAI API أو Sentence-Transformers.
        """
        # نموذج مبسط جداً لأغراض العرض
        vector = [0.0] * 10
        # توزيع قيم وهمية بناءً على الكلمات المفتاحية
        keywords = {"AI": 0, "Marketing": 1, "Sales": 2, "Blockchain": 3, "Healthcare": 4}
        for interest in interests:
            if interest in keywords:
                vector[keywords[interest]] = 1.0
        return vector
