#!/bin/sh
echo "Installing dependencies..."
/var/lang/bin/pip3 install --quiet -r requirements.txt
echo "Starting server..."
/var/lang/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 9000
