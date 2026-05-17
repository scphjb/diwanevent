import psycopg2
from urllib.parse import urlparse

DATABASE_URL = "postgresql://postgres:035683543@localhost:5432/diwan_event"

def fix_social_tables():
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

        print("Updating social wall tables...")
        
        # Add comments_count column to social_wall
        try:
            cur.execute("ALTER TABLE social_wall ADD COLUMN comments_count INTEGER DEFAULT 0;")
            print("Added 'comments_count' column to 'social_wall'.")
        except psycopg2.errors.DuplicateColumn:
            conn.rollback()
            print("'comments_count' column already exists.")
        
        # Create wall_comments table
        try:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS wall_comments (
                    id SERIAL PRIMARY KEY,
                    post_id INTEGER REFERENCES social_wall(id) ON DELETE CASCADE,
                    author_name VARCHAR NOT NULL,
                    content TEXT NOT NULL,
                    is_approved BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            print("Created 'wall_comments' table.")
        except Exception as e:
            conn.rollback()
            print(f"Error creating 'wall_comments' table: {e}")

        conn.commit()
        cur.close()
        conn.close()
        print("Social wall schema updated successfully.")

    except Exception as e:
        print(f"Error updating database: {e}")

if __name__ == "__main__":
    fix_social_tables()
