import os
import glob
import re

directory = r"c:\Users\satya\Downloads\Svvv-26\svvv-main\svvv-main"

patterns = [
    (r'abhedya-chakra', 'abhedya-chakra', re.IGNORECASE),
]

extensions = ['*.py', '*.js', '*.jsx', '*.html', '*.bat', '*.json']

for ext in extensions:
    for filepath in glob.glob(os.path.join(directory, '**', ext), recursive=True):
        if 'node_modules' in filepath or '.venv' in filepath or '.git' in filepath or 'dist' in filepath:
            continue
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for p, r, flags in patterns:
                new_content = re.sub(p, r, new_content, flags=flags)
                
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {filepath}")
        except Exception as e:
            pass

print("Done")
