import urllib.request
req = urllib.request.Request('http://127.0.0.1:9000/api/auth/register', method='OPTIONS')
req.add_header('Origin', 'https://voidhack-vciknjiv.onslate.in')
req.add_header('Access-Control-Request-Method', 'POST')
res = urllib.request.urlopen(req)
print(res.headers)
