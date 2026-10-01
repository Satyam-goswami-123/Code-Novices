import urllib.request
from urllib.error import HTTPError
req = urllib.request.Request('https://abhedya-scrb-ai-backend-50043316693.development.catalystappsail.in/api/auth/login', data=b'username=admin&password=password', method='POST')
req.add_header('Origin', 'https://voidhack-vciknjiv.onslate.in')
req.add_header('Content-Type', 'application/x-www-form-urlencoded')
try:
  urllib.request.urlopen(req)
except HTTPError as e:
  print(e.headers)
