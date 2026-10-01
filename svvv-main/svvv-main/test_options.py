import urllib.request
req = urllib.request.Request('https://abhedya-scrb-ai-backend-50043316693.development.catalystappsail.in/api/auth/login', method='OPTIONS')
req.add_header('Origin', 'https://voidhack-vciknjiv.onslate.in')
req.add_header('Access-Control-Request-Method', 'POST')
res = urllib.request.urlopen(req)
print(res.headers)
