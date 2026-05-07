import random
import time
from locust import HttpUser, task, between, events
from locust.user.wait_time import constant

class DiwanEventUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Using the generated token
        self.token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3Nzg1MTc1MTksInN1YiI6ImFkbWluQGRpd2FuLmNvbSJ9.A0ncJxI1l2dyioYOYc-vAIGM1ks6cpyD7fska1no8Q4"
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.event_id = 1
        self.session_key = f"user_{random.randint(1, 10000)}"

    # --- Scenario A: Check-in Rush ---
    @task(10)
    def check_in_rush(self):
        participant_id = random.randint(1, 100) # Small range for high collision
        with self.client.patch(
            f"/api/v1/participants/{participant_id}/check-in",
            headers=self.headers,
            catch_response=True,
            name="Check-in Participant"
        ) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 404:
                response.success()
            else:
                response.failure(f"Failed with status: {response.status_code}")

    # --- Scenario B: Social Wall Engagement ---
    @task(5)
    def post_to_social_wall(self):
        self.client.post(
            "/api/v1/social/",
            json={
                "event_id": self.event_id,
                "author_name": "Load Tester",
                "content": "Simulated engagement message"
            },
            headers=self.headers,
            name="Create Social Post"
        )

    @task(5)
    def like_post(self):
        post_id = random.randint(1, 50)
        self.client.post(
            f"/api/v1/social/{post_id}/like?session_key={self.session_key}",
            headers=self.headers,
            name="Like Social Post"
        )

    # --- Scenario C: Analytics Monitoring ---
    @task(2)
    def view_analytics(self):
        self.client.get(
            f"/api/v1/analytics/{self.event_id}/summary",
            headers=self.headers,
            name="View Admin Analytics"
        )

class AdminWebSocketUser(HttpUser):
    wait_time = constant(1)
    
    @task
    def simulate_ws_connection(self):
        # Simulating handshake
        with self.client.get(
            f"/ws/{random.randint(1, 5)}?role=admin",
            headers={
                "Upgrade": "websocket", 
                "Connection": "Upgrade",
                "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==",
                "Sec-WebSocket-Version": "13"
            },
            catch_response=True,
            name="WS Admin Connection"
        ) as response:
            # We expect 400 because Locust HTTP client doesn't do real WS upgrade,
            # but we can check if the server attempts to process it.
            # In a real test we'd use a websocket library.
            if response.status_code in [101, 400, 426]: 
                response.success()
            else:
                response.failure(f"WS Handshake failed with {response.status_code}")
