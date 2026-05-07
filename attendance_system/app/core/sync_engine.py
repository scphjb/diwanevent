from typing import Dict, Any, List
import time

class VectorClockSync:
    """
    نظام Vector Clocks لمعالجة تعارضات المزامنة.
    كل جهاز (Node) لديه عداد خاص به.
    """
    @staticmethod
    def update_clock(current_vector: Dict[str, int], node_id: str) -> Dict[str, int]:
        """زيادة العداد عند حدوث تعديل محلي"""
        new_vector = current_vector.copy() if current_vector else {}
        new_vector[node_id] = new_vector.get(node_id, 0) + 1
        return new_vector

    @staticmethod
    def resolve_conflict(local_vector: Dict[str, int], remote_vector: Dict[str, int]) -> str:
        """
        تحديد أي النسخ هي الأحدث.
        النتائج: 'local', 'remote', 'concurrent'
        """
        local_greater = False
        remote_greater = False

        # جمع كل الـ Node IDs من الطرفين
        all_nodes = set(local_vector.keys()) | set(remote_vector.keys())

        for node in all_nodes:
            l_val = local_vector.get(node, 0)
            r_val = remote_vector.get(node, 0)
            
            if l_val > r_val:
                local_greater = True
            elif r_val > l_val:
                remote_greater = True

        if local_greater and not remote_greater:
            return "local"
        if remote_greater and not local_greater:
            return "remote"
        if not local_greater and not remote_greater:
            return "identical"
        
        return "concurrent" # تعارض يحتاج تدخل أو Last Write Wins

class SyncEngine:
    """
    مدير المزامنة الاحترافي للمشاركين.
    """
    @staticmethod
    def sync_participant_data(db_participant, incoming_data: Dict[str, Any], node_id: str):
        # تتبع النسخة عبر الـ Vector Clock المخزن في JSONB
        current_v = db_participant.custom_values.get("_vector_clock", {})
        incoming_v = incoming_data.get("_vector_clock", {})
        
        status = VectorClockSync.resolve_conflict(current_v, incoming_v)
        
        if status == "remote" or status == "concurrent":
            # في حالة التعارض، يمكننا استخدام Last Write Wins أو دمج البيانات
            for key, value in incoming_data.items():
                if key != "_vector_clock":
                    setattr(db_participant, key, value)
            
            # تحديث الـ Vector Clock
            db_participant.custom_values["_vector_clock"] = incoming_v
            return True
        return False
