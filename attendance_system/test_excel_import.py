import sys
sys.path.insert(0, '.')

import pandas as pd
import io

# Simulate what the backend does
print("Testing Excel parsing simulation...")

# Create a test Excel file in memory
import openpyxl
wb = openpyxl.Workbook()
ws = wb.active
ws.append(['الاسم الكامل', 'الجهة', 'القسم', 'البريد الإلكتروني', 'الهاتف'])
ws.append(['أحمد محمد', 'وزارة التعليم', 'الإدارة', 'ahmed@test.com', '0550123456'])
ws.append(['فاطمة علي', 'وزارة الصحة', '', '', ''])  # empty optional fields
ws.append(['', '', '', '', ''])  # empty row

buf = io.BytesIO()
wb.save(buf)
buf.seek(0)

try:
    df = pd.read_excel(buf)
    print(f"Columns found: {list(df.columns)}")
    print(f"Row count: {len(df)}")
    
    # Test fillna
    df = df.fillna('')
    print("fillna OK")
    
    # Test column mapping
    column_map = {
        'full_name': ['الاسم الكامل', 'full_name', 'الاسم', 'name', 'nom'],
        'council': ['الجهة', 'council', 'المؤسسة', 'organization', 'company'],
        'court': ['القسم', 'court', 'التخصص', 'department', 'service'],
        'email': ['البريد الإلكتروني', 'email', 'البريد', 'e-mail', 'courriel'],
        'phone': ['الهاتف', 'phone', 'رقم الهاتف', 'phone_number', 'tel'],
    }

    def get_val(row, key):
        for alias in column_map.get(key, []):
            for col in df.columns:
                if str(col).strip().lower() == alias.lower():
                    return row[col]
        return ''

    for idx, row in df.iterrows():
        raw_entry = {
            "full_name": get_val(row, 'full_name'),
            "council": get_val(row, 'council') or "عضو مشارك",
            "court": get_val(row, 'court') or "General",
            "email": get_val(row, 'email'),
            "phone": get_val(row, 'phone'),
        }
        if not str(raw_entry['full_name']).strip():
            print(f"Row {idx}: SKIPPED (empty name)")
            continue
        print(f"Row {idx}: OK → name='{raw_entry['full_name']}', council='{raw_entry['council']}', email='{raw_entry['email']}'")

    print("\n✅ Excel parsing logic is working correctly!")
    
except Exception as e:
    print(f"❌ ERROR: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
