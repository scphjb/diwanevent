import psycopg2
from urllib.parse import urlparse

DATABASE_URL = "postgresql://postgres:035683543@localhost:5432/diwan_event"

def fix_users_table():
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

        print("Checking for missing columns in 'users' table...")
        
        # Add two_factor_enabled column
        try:
            cur.execute("ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;")
            print("Added 'two_factor_enabled' column.")
        except psycopg2.errors.DuplicateColumn:
            conn.rollback()
            print("'two_factor_enabled' column already exists.")
        
        # Add two_factor_secret column
        try:
            cur.execute("ALTER TABLE users ADD COLUMN two_factor_secret VARCHAR;")
            print("Added 'two_factor_secret' column.")
        except psycopg2.errors.DuplicateColumn:
            conn.rollback()
            print("'two_factor_secret' column already exists.")

        conn.commit()
        cur.close()
        conn.close()
        print("Database schema updated successfully.")

    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    fix_users_table()
