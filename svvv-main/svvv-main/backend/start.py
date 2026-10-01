import os
import sys
import subprocess
import threading
import time
import socket

port = int(os.environ.get('X_ZOHO_CATALYST_LISTEN_PORT', 9000))

print(f"Creating persistent socket on port {port}...", flush=True)
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind(('0.0.0.0', port))
sock.listen(10)

os.set_inheritable(sock.fileno(), True)
stop_health_check = threading.Event()

def health_check_loop():
    sock.settimeout(0.5)
    while not stop_health_check.is_set():
        try:
            conn, addr = sock.accept()
            conn.sendall(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nOK")
            conn.close()
        except socket.timeout:
            continue
        except Exception:
            break
    sock.settimeout(None)

threading.Thread(target=health_check_loop, daemon=True).start()

def install_all():
    try:
        print("Installing dependencies...", flush=True)
        subprocess.call([sys.executable, '-m', 'pip', 'install', '-q', '--no-cache-dir', '-r', 'requirements.txt'])
        print("All dependencies installed!", flush=True)
    except Exception as e:
        print(f"Install error: {e}", flush=True)

install_all()

print("Handing port over to Uvicorn seamlessly...", flush=True)
stop_health_check.set()
time.sleep(0.6)

sys.stdout.flush()
sys.stderr.flush()

if sys.platform != 'win32':
    subprocess.call(
        [sys.executable, '-m', 'uvicorn', 'app.main:app', '--fd', str(sock.fileno())],
        pass_fds=(sock.fileno(),)
    )
else:
    sock.close()
    subprocess.call([sys.executable, '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', str(port)])
