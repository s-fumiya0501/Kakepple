from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.middleware.sessions import SessionMiddleware
from pathlib import Path
from app.config import settings

# Create FastAPI application
# redirect_slashes=False to prevent 307 redirects that change https to http
app = FastAPI(
    title=settings.APP_NAME,
    description="Couple Budget Management Application",
    version="1.0.0",
    redirect_slashes=False,
)

# Configure CORS - must be first middleware added (last to process)
origins = [
    "https://kakepple.vercel.app",
    "http://localhost:3000",
]
if settings.FRONTEND_URL not in origins:
    origins.append(settings.FRONTEND_URL)

# Add SessionMiddleware first (will be inner layer)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)

# Add CORSMiddleware last (will be outer layer - processes requests first)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory and mount static files
uploads_dir = Path("uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Kakepple API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.get("/cors-test")
async def cors_test():
    """CORS test endpoint"""
    return {
        "cors": "working",
        "frontend_url": settings.FRONTEND_URL,
        "allowed_origins": origins
    }


# Import and include routers
from app.api import auth, couples, transactions, budgets, analytics, exports, notifications, admin, recurring, assets

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(couples.router, prefix="/api/couples", tags=["couples"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(budgets.router, prefix="/api/budgets", tags=["budgets"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(exports.router, prefix="/api/exports", tags=["exports"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(recurring.router, prefix="/api/recurring", tags=["recurring"])
app.include_router(assets.router, prefix="/api/assets", tags=["assets"])
