import os, glob, re
for f in glob.glob('app/*.py'):
  with open(f, 'r', encoding='utf-8') as file:
    content = file.read()
  new_content = content.replace('from __future__ import annotations\n', '')
  with open(f, 'w', encoding='utf-8') as file:
    file.write(new_content)
