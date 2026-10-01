import os, glob, re
for f in glob.glob('app/*.py'):
  with open(f, 'r', encoding='utf-8') as file:
    content = file.read()
  new_content = re.sub(r'([a-zA-Z0-9_\[\]]+)\s*\|\s*None', r'Optional[\1]', content)
  if 'Optional' in new_content and 'from typing import ' not in new_content:
    new_content = 'from typing import Optional, List, Dict\n' + new_content
  elif 'Optional' in new_content and 'from typing import' in new_content and 'Optional' not in new_content.split('from typing import')[1].split('\n')[0]:
    new_content = re.sub(r'from typing import (.*)', r'from typing import Optional, \1', new_content, count=1)
  with open(f, 'w', encoding='utf-8') as file:
    file.write(new_content)
