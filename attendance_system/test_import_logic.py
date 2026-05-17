
import sys
import os

# Add parent directory to path to import app
sys.path.append(os.getcwd())

from app.services.data_sanitizer import DataSanitizer

def test_sanitizer():
    # Test cases for NaN/None
    print("Testing NaN handling...")
    res = DataSanitizer.sanitize_name(float('nan'))
    print(f"NaN name: '{res[0]}', note: '{res[1]}'")
    
    res = DataSanitizer.sanitize_name(None)
    print(f"None name: '{res[0]}', note: '{res[1]}'")
    
    print("\nTesting process_row with NaN/None...")
    row_data = {
        'full_name': 'Ahmed Ali',
        'email': float('nan'),
        'phone': None
    }
    # Mocking DB session is hard, but we can test the data processing part of process_row
    # by looking at how it handles the input before calling DB.
    # Since I modified process_row, I'll just check if it survives the extraction.
    
    # We can't easily call process_row because of DB session, 
    # but we can test the logic I added:
    email_val = row_data.get('email')
    raw_email = str(email_val).strip().lower() if email_val and str(email_val).lower() != 'nan' else ''
    print(f"Extracted email from NaN: '{raw_email}'")
    
    phone_val = row_data.get('phone')
    raw_phone = str(phone_val).strip() if phone_val and str(phone_val).lower() != 'nan' else ''
    print(f"Extracted phone from None: '{raw_phone}'")

if __name__ == "__main__":
    test_sanitizer()
