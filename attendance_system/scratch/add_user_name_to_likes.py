import psycopg2
from urllib.parse import urlparse

DATABASE_URL = "postgresql://postgres:035683543@localhost:5432/diwan_event"

def add_user_name_to_likes():
    try:
        # Parse the connection URL
        result = urlparse(DATABASE_URL)
        username = result.username
        password = result.password
        database = result.path[1:]
        hostname = result.hostname
        port = result.port

        # Connect to the database
        conn = psycopg2.connect(
            database=database,
            user=username,
            password=password,
            host=hostname,
            port=port
        )
        cur = conn.cursor()

        print("Adding 'user_name' to 'wall_likes' table...")
        
        try:
            cur.execute("ALTER TABLE wall_likes ADD COLUMN user_name VARCHAR;")
            print("Added 'user_name' column to 'wall_likes'.")
        except psycopg2.errors.DuplicateColumn:
            conn.rollback()
            print("'user_name' column already exists.")

        conn.commit()
        cur.close()
        conn.close()
        print("Database schema updated successfully.")

    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    add_user_name_to_likes()
