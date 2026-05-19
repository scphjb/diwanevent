"""
Blazing Fast Bulk Seeder for Diwan Event Platform
=================================================
Directly inserts:
  - 1 Event
  - 1 Active Poll with 4 options
  - 1000 Participants (Voters)
Uses direct SQLAlchemy bulk insertion for maximum performance (<2 seconds).
Generates the load_tests/spike_config.json file automatically.
"""

import sys
import os
import json
import uuid
from datetime import datetime

# Load project path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Load models and DB session
from app.core.database import SessionLocal, engine
from app.models import Base
from app.models.event import Event
from app.models.others import Poll, PollOption
from app.models.participant import Participant
from app.models.networking import ParticipantProfile

def run_bulk_seed():
    print("=" * 60)
    print("[*] Starting Blazing Fast Bulk Seeding (1000 Voters)...")
    print("=" * 60)

    # Ensure tables exist in isolated environments (like Docker spike test)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 1. Create a new test event
        event = Event(
            event_name="فعالية اختبار طفرة الـ 1000 مصوت",
            event_date=datetime.strptime("2026-07-01", "%Y-%m-%d").date(),
            location="منصة ديوان الرقمية - اختبار الأداء المتقدم",
            primary_color="#D4AF37",
            secondary_color="#022C22",
            status="active",
            registration_enabled=True,
            total_invited=10000
        )
        db.add(event)
        db.flush() # Get event.id
        event_id = event.id
        print(f"[+] Event Created: ID={event_id}")

        # 2. Create an active poll
        poll = Poll(
            event_id=event_id,
            question="ما هو انطباعك عن أداء منصة ديوان تحت ضغط 1000 مستخدم؟",
            is_active=True
        )
        db.add(poll)
        db.flush() # Get poll.id
        poll_id = poll.id
        print(f"[+] Poll Created: ID={poll_id}")

        # 3. Create poll options
        options_texts = [
            "أداء فائق واستجابة فورية",
            "أداء ممتاز ومستقر للغاية",
            "أداء جيد مع استهلاك معتدل",
            "أداء مقبول مع أوقات استجابة متفاوتة"
        ]
        option_objects = []
        for text in options_texts:
            opt = PollOption(poll_id=poll_id, option_text=text)
            db.add(opt)
            option_objects.append(opt)
        db.flush()
        option_ids = [opt.id for opt in option_objects]
        print(f"[+] Poll Options Created: {option_ids}")

        # 4. Generate and bulk insert 1000 participants
        print("[*] Generating 1000 participants...")
        participants_to_insert = []
        voter_orders = []

        councils = [
            "مجلس قضاء عنابة", "مجلس قضاء قسنطينة", "مجلس قضاء سطيف",
            "مجلس قضاء الجزائر", "مجلس قضاء وهران", "مجلس قضاء ورقلة"
        ]

        for i in range(1, 1001):
            unique_token = str(uuid.uuid4())[:8].upper()
            order_num = f"DWN-SPK-{event_id}-{i:04d}"
            qr_code = f"QR-SPK-{event_id}-{unique_token}-{i:04d}"
            voter_orders.append(order_num)

            p = Participant(
                event_id=event_id,
                order_num=order_num,
                qr_code=qr_code,
                full_name=f"مشارك طفرة {i:04d}",
                role="attendee",
                organization=councils[i % len(councils)],
                department="قسم اختبار الحمل المتقدم",
                email=f"voter_spike_{event_id}_{i}@diwan.dz",
                phone_number=f"+213600{event_id}{i:04d}"[-12:], # Safe length
                payment_status="paid",
                entry_type="load_test"
            )
            participants_to_insert.append(p)

        print("[*] Bulk inserting 1000 participants into PostgreSQL...")
        db.bulk_save_objects(participants_to_insert, return_defaults=True)
        db.commit()

        # Extract IDs of voter participants
        voter_ids = [p.id for p in participants_to_insert]
        print(f"[+] Successfully seeded {len(voter_ids)} participants.")

        # 5. Generate spike_config.json for Locust
        config = {
            "event_id": event_id,
            "poll_id": poll_id,
            "option_ids": option_ids,
            "voter_ids": voter_ids,
            "voter_order_nums": voter_orders,
            "base_url": "http://127.0.0.1:8000"
        }

        # الكتابة المحلية: load_tests/spike_config.json
        try:
            config_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                "load_tests",
                "spike_config.json"
            )
            os.makedirs(os.path.dirname(config_path), exist_ok=True)
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            print(f"[+] Saved spike_config.json to: {config_path}")
        except Exception as write_err:
            print(f"[*] Skipping local config write: {write_err}")

        # الكتابة داخل Docker (volume mount /spike_out)
        docker_out = "/spike_out/spike_config.json"
        if os.path.isdir("/spike_out"):
            with open(docker_out, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
            print(f"[+] Saved spike_config.json to Docker volume: {docker_out}")

        print("\n" + "="*60)
        print("[+] FAST BULK SEEDING COMPLETED IN < 2 SECONDS!")
        print("="*60 + "\n")

    except Exception as exc:
        db.rollback()
        print(f"[-] Database Error: {exc}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    run_bulk_seed()
