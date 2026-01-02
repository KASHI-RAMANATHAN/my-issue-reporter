import asyncio
import os
import uuid
import json
import base64
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError
from pydantic import BaseModel, Field, ConfigDict

# ──────────────────────────────────────────────────────────────
# Environment & Setup
# ──────────────────────────────────────────────────────────────

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────
# MongoDB
# ──────────────────────────────────────────────────────────────

mongo_url = os.environ["MONGO_URL"]
db_name = os.environ["DB_NAME"]

client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=2000,
    connectTimeoutMS=2000,
    socketTimeoutMS=2000,
)
db = client[db_name]


async def _db_ping() -> bool:
    try:
        await client.admin.command("ping")
        return True
    except Exception as e:
        logger.error(f"MongoDB unreachable: {e}")
        return False


# ──────────────────────────────────────────────────────────────
# FastAPI App
# ──────────────────────────────────────────────────────────────

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ──────────────────────────────────────────────────────────────
# Models
# ──────────────────────────────────────────────────────────────

class IssueCreate(BaseModel):
    building: str
    description: str
    image_base64: Optional[str] = None
    image_url: Optional[str] = None


class IssueUpdate(BaseModel):
    status: str


class Issue(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    building: str
    description: str
    image_url: Optional[str] = None
    image_base64: Optional[str] = None

    category: str
    priority: str
    status: str

    is_spam: bool = False
    spam_reason: Optional[str] = None

    escalated: Optional[bool] = False
    created_at: str
    user_email: str


class AnalyzeRequest(BaseModel):
    description: str
    image_base64: Optional[str] = None


class AnalyzeResponse(BaseModel):
    category: str
    priority: str


# ──────────────────────────────────────────────────────────────
# Auto-Escalation Worker (SINGLE SOURCE OF TRUTH)
# ──────────────────────────────────────────────────────────────

async def auto_escalation_worker():
    ESCALATION_THRESHOLD = timedelta(minutes=10)  # change to seconds for testing

    while True:
        try:
            if not await _db_ping():
                await asyncio.sleep(30)
                continue

            now = datetime.now(timezone.utc)

            cursor = db.issues.find({"status": "Open", "priority": "Medium"})
            async for issue in cursor:
                created_at = datetime.fromisoformat(issue["created_at"])
                age = now - created_at

                if age > ESCALATION_THRESHOLD:
                    await db.issues.update_one(
                        {"id": issue["id"]},
                        {
                            "$set": {
                                "priority": "High",
                                "escalated": True,
                            }
                        }
                    )
                    logger.info(f"Auto-escalated issue {issue['id']}")

        except Exception as e:
            logger.error(f"Auto-escalation error: {e}")

        await asyncio.sleep(60)


@app.on_event("startup")
async def startup_tasks():
    asyncio.create_task(auto_escalation_worker())


# ──────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "Smart Campus Issue Reporter API"}


@api_router.post("/issues", response_model=Issue)
async def create_issue(issue: IssueCreate):
    category = "Other"
    priority = "Medium"
    is_spam = False
    spam_reason = None
    # AI analysis (optional)
    try:
        from google import genai
        from google.genai import types
        system_message = (
            'Return ONLY raw JSON in this exact format:\n'
            '{'
            '"category": "Electrical | Plumbing | Safety | Maintenance | Other", '
            '"priority": "Low | Medium | High | Critical", '
            '"is_spam": true | false, '
            '"spam_reason": "short explanation or null"'
            '}\n'
            'Rules:\n'
            '- Mark is_spam=true ONLY if the report is clearly a prank, joke, nonsense, '
            'abusive, or unrelated to campus maintenance.\n'
            '- If unsure, set is_spam=false.\n'
            '- spam_reason must be null if is_spam=false.\n'
            '- Do NOT include markdown, commentary, or extra text.'
        )
        api_key = os.environ.get("GOOGLE_API_KEY")
        if api_key:
            client_ai = genai.Client(api_key=api_key)

            prompt = [
                system_message,
                f"Issue description: {issue.description}",
            ]

            if issue.image_base64:
                try:
                    cleaned = issue.image_base64.strip()

                    image_bytes = base64.b64decode(cleaned, validate=True)

                    image = types.Image(
                        data=image_bytes,
                        mime_type="image/jpeg",  # acceptable default
                    )

                    prompt.append(image)

                except Exception as e:
                    logger.info(f"Image skipped for AI (non-fatal): {e}")


            response = client_ai.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )




            response_text = (
                getattr(response, "output_text", None)
                or getattr(response, "text", "")
            ).strip()
            
            result = json.loads(response_text)

            category = result.get("category", "Other")
            priority = result.get("priority", "Medium")

            is_spam = result.get("is_spam", False)
            spam_reason = result.get("spam_reason")

            # Hard safety fallback
            if not isinstance(is_spam, bool):
                is_spam = False
                spam_reason = None


    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
    

    issue_doc = {
        "id": str(uuid.uuid4()),
        "building": issue.building,
        "description": issue.description,
        "image_url": issue.image_url,
        "image_base64": issue.image_base64,

        "category": category,
        "priority": priority,
        "status": "Open",

        "is_spam": is_spam,
        "spam_reason": spam_reason,

        "escalated": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_email": "user@campus.edu",
    }


    if not await _db_ping():
        raise HTTPException(503, "Database unavailable")

    await db.issues.insert_one(issue_doc)
    return Issue(**issue_doc)


@api_router.get("/issues", response_model=List[Issue])
async def get_issues():
    if not await _db_ping():
        raise HTTPException(503, "Database unavailable")

    issues = await db.issues.find({}, {"_id": 0}).to_list(1000)
    return [Issue(**i) for i in issues]


@api_router.patch("/issues/{issue_id}", response_model=Issue)
async def update_issue_status(issue_id: str, update: IssueUpdate):
    result = await db.issues.find_one_and_update(
        {"id": issue_id},
        {"$set": {"status": update.status}},
        return_document=True,
    )
    if not result:
        raise HTTPException(404, "Issue not found")

    result.pop("_id", None)
    return Issue(**result)


@api_router.get("/stats")
async def get_stats():
    if not await _db_ping():
        return {
            "total_issues": 0,
            "open_issues": 0,
            "in_progress": 0,
            "resolved": 0,
            "system_status": "Degraded",
            "recent_logs": [],
        }

    return {
        "total_issues": await db.issues.count_documents({}),
        "open_issues": await db.issues.count_documents({"status": "Open"}),
        "in_progress": await db.issues.count_documents({"status": "In Progress"}),
        "resolved": await db.issues.count_documents({"status": "Resolved"}),
        "system_status": "Operational",
        "recent_logs": await db.issues.find({}, {"_id": 0})
        .sort("created_at", -1)
        .limit(5)
        .to_list(5),
    }


# ──────────────────────────────────────────────────────────────
# App wiring
# ──────────────────────────────────────────────────────────────

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()
