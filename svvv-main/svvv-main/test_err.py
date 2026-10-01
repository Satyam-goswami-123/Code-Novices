import urllib.request
try:
  req = urllib.request.Request('https://abhedya-scrb-ai-backend-50043316693.development.catalystappsail.in/api/auth/login', data=b'username=admin&password=password', method='POST')
  print(urllib.request.urlopen(req).read().decode('utf-8'))
except Exception as e:
  print(e.read().decode('utf-8'))
