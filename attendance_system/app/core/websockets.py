from typing import Dict, List
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Mapping event_id -> List[Tuple[WebSocket, role]]
        self.active_connections: Dict[int, List[tuple]] = {}

    async def connect(self, websocket: WebSocket, event_id: int, role: str = "guest"):
        await websocket.accept()
        if event_id not in self.active_connections:
            self.active_connections[event_id] = []
        self.active_connections[event_id].append((websocket, role))

    def disconnect(self, websocket: WebSocket, event_id: int):
        if event_id in self.active_connections:
            self.active_connections[event_id] = [
                conn for conn in self.active_connections[event_id] if conn[0] != websocket
            ]
            if not self.active_connections[event_id]:
                del self.active_connections[event_id]

    async def broadcast_to_event(self, event_id: int, message: dict):
        if event_id in self.active_connections:
            for connection, role in self.active_connections[event_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

    async def broadcast_to_admins(self, event_id: int, message: dict):
        """إرسال التنبيهات للمسؤولين فقط (admin, super_admin)"""
        if event_id in self.active_connections:
            for connection, role in self.active_connections[event_id]:
                if role in ["admin", "super_admin"]:
                    try:
                        await connection.send_json(message)
                    except Exception:
                        pass

manager = ConnectionManager()
