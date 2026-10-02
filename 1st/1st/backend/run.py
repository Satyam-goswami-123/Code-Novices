import uvicorn
import os
import sys

if __name__ == "__main__":
    # Ensure backend directory is in path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    uvicorn.run("app.main:app", host="127.0.0.1", port=8001, reload=False)
