import os
import uvicorn
from app.seed import seed

if __name__ == "__main__":
    seed()
    port = int(os.environ.get("X_ZOHO_CATALYST_LISTEN_PORT", 8000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False)
