import urllib.request
import os

os.makedirs('fonts', exist_ok=True)

fonts = {
    'Cairo-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/cairo/Cairo-Regular.ttf',
    'Cairo-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/cairo/Cairo-Bold.ttf',
    'Amiri-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf',
    'Amiri-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Bold.ttf'
}

for name, url in fonts.items():
    print(f"Downloading {name}...")
    urllib.request.urlretrieve(url, os.path.join('fonts', name))
print("Done!")
