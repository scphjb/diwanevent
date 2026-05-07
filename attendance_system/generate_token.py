from app.core.security import create_access_token
from app.core.config import settings

def generate_test_token():
    # In our implementation, the subject is typically the user ID or email
    token = create_access_token(subject="admin@diwan.com")
    print(f"Generated Token: {token}")

if __name__ == "__main__":
    generate_test_token()
