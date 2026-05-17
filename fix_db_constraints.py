import psycopg2
import os
from dotenv import load_dotenv

# تحميل الإعدادات
load_dotenv(dotenv_path='attendance_system/.env')
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("X Error: DATABASE_URL not found in .env")
    exit()

def fix_constraints():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # قائمة شاملة لجميع القيود بما في ذلك المستوى الثاني
        constraints_to_fix = [
            # المستوى الأول: مرتبط بالمشارك مباشرة
            ("participant_otp", "participant_otp_participant_id_fkey", "participant_id", "participants"),
            ("attendance", "attendance_participant_id_fkey", "participant_id", "participants"),
            ("participant_profiles", "participant_profiles_participant_id_fkey", "participant_id", "participants"),
            ("gamification_events", "gamification_events_participant_id_fkey", "participant_id", "participants"),
            ("sponsor_leads", "sponsor_leads_participant_id_fkey", "participant_id", "participants"),
            ("poll_votes", "poll_votes_participant_id_fkey", "participant_id", "participants"),
            ("communication_logs", "communication_logs_participant_id_fkey", "participant_id", "participants"),
            ("networking_connections", "networking_connections_requester_id_fkey", "requester_id", "participants"),
            ("networking_connections", "networking_connections_requested_id_fkey", "requested_id", "participants"),
            ("direct_messages", "direct_messages_sender_id_fkey", "sender_id", "participants"),
            ("meeting_requests", "meeting_requests_proposer_id_fkey", "proposer_id", "participants"),
            ("meeting_requests", "meeting_requests_recipient_id_fkey", "recipient_id", "participants"),
            ("meeting_ratings", "meeting_ratings_rater_id_fkey", "rater_id", "participants"),
            ("qr_connect_scans", "qr_connect_scans_scanner_id_fkey", "scanner_id", "participants"),
            ("qr_connect_scans", "qr_connect_scans_scanned_id_fkey", "scanned_id", "participants"),
            
            # المستوى الثاني: مرتبط بالاتصال أو الاجتماع (التي ستحذف بسبب حذف المشارك)
            ("direct_messages", "direct_messages_connection_id_fkey", "connection_id", "networking_connections"),
            ("meeting_requests", "meeting_requests_connection_id_fkey", "connection_id", "networking_connections"),
            ("meeting_ratings", "meeting_ratings_meeting_id_fkey", "meeting_id", "meeting_requests"),
        ]

        print("--- Start Fixing Advanced Database Constraints (Multi-Level) ---")
        
        for table, constraint, column, ref_table in constraints_to_fix:
            try:
                print(f"Applying CASCADE to {table} ({constraint})...")
                cur.execute(f"ALTER TABLE {table} DROP CONSTRAINT IF EXISTS {constraint};")
                cur.execute(f"""
                    ALTER TABLE {table} 
                    ADD CONSTRAINT {constraint} 
                    FOREIGN KEY ({column}) 
                    REFERENCES {ref_table}(id) 
                    ON DELETE CASCADE;
                """)
                conn.commit()
            except Exception as e:
                conn.rollback()
                print(f"  ! Skip {table}: {e}")

        print("\n--- DONE! All multi-level constraints fixed. ---")
        cur.close()
        conn.close()

    except Exception as e:
        print(f"X Critical Error: {e}")

if __name__ == "__main__":
    fix_constraints()
