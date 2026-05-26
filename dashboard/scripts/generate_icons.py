"""
Generate all required PWA icon sizes from the source image.
Requires Pillow: pip install Pillow
"""
import sys
import os
from PIL import Image

source = r"C:\Users\KAMEL\.gemini\antigravity\brain\82f9fd84-e4d0-4d6e-b4aa-f5469ec12a3d\diwan_app_icon_1779758996757.png"
output_dir = r"D:\diwan_event\dashboard\public\icons"

sizes = [72, 96, 128, 144, 152, 192, 384, 512]

os.makedirs(output_dir, exist_ok=True)

try:
    img = Image.open(source).convert("RGBA")
    print(f"Source image: {img.size}")
    
    for size in sizes:
        resized = img.resize((size, size), Image.LANCZOS)
        output_path = os.path.join(output_dir, f"icon-{size}x{size}.png")
        resized.save(output_path, "PNG", optimize=True)
        print(f"[OK] Created: icon-{size}x{size}.png")
    
    print(f"\nAll {len(sizes)} icons created in {output_dir}")

except FileNotFoundError:
    print(f"[ERROR] Source image not found: {source}")
    sys.exit(1)
except Exception as e:
    print(f"[ERROR] {e}")
    sys.exit(1)
