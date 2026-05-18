from typing import Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.participant import Participant
from app.core.websockets import manager
import datetime

class ConflictResolver:
    """
    محرك حل التعارضات الموزع.
    يدعم سياسات: Server Wins, Last Write Wins, Semantic Merge.
    """
    
    @staticmethod
    def compare_vectors(v1: Dict[str, int], v2: Dict[str, int]) -> str:
        """
        مقارنة متجهين للنسخ (Vector Clocks).
        النتائج: 'greater', 'smaller', 'concurrent', 'identical'
        """
        v1_greater = False
        v2_greater = False
        
        all_nodes = set(v1.keys()) | set(v2.keys())
        for node in all_nodes:
            val1 = v1.get(node, 0)
            val2 = v2.get(node, 0)
            if val1 > val2:
                v1_greater = True
            elif val2 > val1:
                v2_greater = True
                
        if v1_greater and not v2_greater: return "greater"
        if v2_greater and not v1_greater: return "smaller"
        if not v1_greater and not v2_greater: return "identical"
        return "concurrent" # تعارض حقيقي

    @staticmethod
    async def resolve(
        db: AsyncSession, 
        server_obj: Participant, 
        incoming_data: Dict[str, Any], 
        policy: str = "semantic"
    ) -> bool:
        """
        تطبيق سياسة حل التعارض.
        """
        incoming_v = incoming_data.get("version_vector", {})
        server_v = server_obj.version_vector or {}
        
        relation = ConflictResolver.compare_vectors(server_v, incoming_v)
        
        # 1. إذا كانت البيانات القادمة أحدث بشكل قاطع
        if relation == "smaller":
            ConflictResolver.apply_update(server_obj, incoming_data)
            return True

        # 2. إذا كانت البيانات متطابقة أو أقدم، نتجاهلها
        if relation in ["greater", "identical"]:
            return False

        # 3. في حالة التعارض (Concurrent Updates)
        if relation == "concurrent":
            if policy == "server_wins":
                return False
            
            if policy == "lww":
                # Last Write Wins بناءً على الطابع الزمني
                remote_ts = incoming_data.get("updated_at", 0)
                server_ts = server_obj.updated_at.timestamp() if server_obj.updated_at else 0
                if remote_ts > server_ts:
                    ConflictResolver.apply_update(server_obj, incoming_data)
                    return True
                return False

            if policy == "semantic":
                # دمج الحقول التي لم يحدث فيها تعارض
                has_deep_conflict = False
                for key, value in incoming_data.items():
                    if key in ["version_vector", "updated_at"]: continue
                    
                    server_val = getattr(server_obj, key, None)
                    if server_val != value:
                        # إذا تم تعديل نفس الحقل بقيم مختلفة، فهذا تعارض عميق
                        has_deep_conflict = True
                        break
                
                if not has_deep_conflict:
                    ConflictResolver.apply_update(server_obj, incoming_data)
                    return True
                else:
                    # وسم السجل للمراجعة اليدوية
                    server_obj.is_flagged = True
                    server_obj.sanitization_note = "Conflict detected: Concurrent updates to same fields."
                    
                    # إرسال تنبيه فوري للمشرف عبر الـ WebSocket
                    await manager.broadcast_to_admins(server_obj.event_id, {
                        "type": "data_conflict",
                        "participant_id": server_obj.id,
                        "message": f"تعارض في بيانات المشارك: {server_obj.full_name}"
                    })
                    return False

        return False

    @staticmethod
    def apply_update(obj: Participant, data: Dict[str, Any]):
        for key, value in data.items():
            if hasattr(obj, key):
                setattr(obj, key, value)
        # دمج الـ Vectors (Max of both)
        new_v = obj.version_vector or {}
        incoming_v = data.get("version_vector", {})
        for node, val in incoming_v.items():
            new_v[node] = max(new_v.get(node, 0), val)
        obj.version_vector = new_v
