import urllib.request
req = urllib.request.Request('https://corsproxy.io/?https%3A%2F%2Fabhedya-scrb-ai-backend-50043316693.development.catalystappsail.in%2Fapi%2Fauth%2Flogin', data=b'username=admin&password=password', method='POST')
req.add_header('Origin', 'https://voidhack-vciknjiv.onslate.in')
try:
  res = urllib.request.urlopen(req)
  print('SUCCESS', res.read().decode('utf-8')[:100])
except Exception as e:
  print('ERROR', e.read().decode('utf-8'))
