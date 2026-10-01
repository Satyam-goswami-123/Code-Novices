import os, glob
for f in glob.glob('app/*.py'):
  with open(f, 'r', encoding='utf-8') as file:
    content = file.read()
  if 'from __future__ import annotations' not in content:
    with open(f, 'w', encoding='utf-8') as file:
      file.write('from __future__ import annotations\n' + content)
