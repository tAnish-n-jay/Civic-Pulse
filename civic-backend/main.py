from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.health import router as health_router
from routes.issues import router as issues_router
from routes.accountability import router as accountability_router

app = FastAPI(title="CivicPulse API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(issues_router)
app.include_router(accountability_router)
@app.get("/")
def root():
    return {"message": "CivicPulse backend is live"}