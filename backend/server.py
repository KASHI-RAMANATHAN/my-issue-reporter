from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ServerSelectionTimeoutError
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
# Use short timeouts so API fails fast when MongoDB is unavailable
client = AsyncIOMotorClient(
    mongo_url,
    serverSelectionTimeoutMS=2000,
    connectTimeoutMS=2000,
    socketTimeoutMS=2000,
)
db = client[os.environ['DB_NAME']]

async def _db_ping():
    """Return True if MongoDB is reachable; otherwise False."""
    try:
        await client.admin.command("ping")
        return True
    except Exception as e:
        logger.error(f"MongoDB unreachable: {e}")
        return False

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

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
    category: str
    priority: str
    status: str
    created_at: str
    user_email: str

class AnalyzeRequest(BaseModel):
    description: str
    image_base64: Optional[str] = None

class AnalyzeResponse(BaseModel):
    category: str
    priority: str

# Add routes to the router
@api_router.get("/")
async def root():
    return {"message": "Smart Campus Issue Reporter API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks

# AI Analysis endpoint using Google Gemini
@api_router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_issue(request: AnalyzeRequest):
    try:
        import google.generativeai as genai
        
        api_key = os.environ.get('GOOGLE_API_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="GOOGLE_API_KEY not configured")
        
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        system_message = 'Return ONLY raw JSON: {"category": "string", "priority": "string"}. No markdown, no talk. Categories: Electrical, Plumbing, Safety, Maintenance, Other. Priorities: Low, Medium, High, Critical.'
        
        # Create message with or without image
        if request.image_base64:
            import base64
            image_data = base64.b64decode(request.image_base64)
            user_prompt = [
                system_message,
                f"Analyze this campus issue and categorize it. Description: {request.description}",
                {
                    "mime_type": "image/jpeg",
                    "data": image_data,
                }
            ]
        else:
            user_prompt = [
                system_message,
                f"Analyze this campus issue and categorize it. Description: {request.description}"
            ]
        
        response = model.generate_content(user_prompt)
        
        # Parse JSON response
        import json
        # google-generativeai returns a response object; use text content
        response_text = getattr(response, "text", None) or ""
        response_text = response_text.strip()
        if response_text.startswith('```'):
            response_text = response_text.split('\n', 1)[1]
            response_text = response_text.rsplit('```', 1)[0]
        
        result = json.loads(response_text)
        return AnalyzeResponse(
            category=result.get("category", "Other"),
            priority=result.get("priority", "Medium")
        )
    except json.JSONDecodeError:
        return AnalyzeResponse(category="Other", priority="Medium")
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return AnalyzeResponse(category="Other", priority="Medium")

# Issues CRUD endpoints
@api_router.post("/issues", response_model=Issue)
async def create_issue(issue: IssueCreate):
    try:
        # First analyze the issue
        import google.generativeai as genai
        
        api_key = os.environ.get('GOOGLE_API_KEY')
        category = "Other"
        priority = "Medium"
        
        if api_key:
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel("gemini-2.0-flash")
                system_message = 'Return ONLY raw JSON: {"category": "string", "priority": "string"}. No markdown, no talk. Categories: Electrical, Plumbing, Safety, Maintenance, Other. Priorities: Low, Medium, High, Critical.'
                
                if issue.image_base64:
                    import base64
                    image_data = base64.b64decode(issue.image_base64)
                    user_prompt = [
                        system_message,
                        f"Analyze this campus issue and categorize it. Description: {issue.description}",
                        {
                            "mime_type": "image/jpeg",
                            "data": image_data,
                        }
                    ]
                else:
                    user_prompt = [
                        system_message,
                        f"Analyze this campus issue and categorize it. Description: {issue.description}"
                    ]
                
                response = model.generate_content(user_prompt)
                import json
                response_text = response.text.strip()
                if response_text.startswith('```'):
                    response_text = response_text.split('\n', 1)[1]
                    response_text = response_text.rsplit('```', 1)[0]
                result = json.loads(response_text)
                category = result.get("category", "Other")
                priority = result.get("priority", "Medium")
            except Exception as e:
                logger.error(f"Analysis error: {str(e)}")
        
        issue_id = str(uuid.uuid4())
        issue_doc = {
            "id": issue_id,
            "building": issue.building,
            "description": issue.description,
            "image_url": issue.image_url,
            "category": category,
            "priority": priority,
            "status": "Open",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "user_email": "user@campus.edu"
        }
        
        # Attempt DB insert, fail fast if MongoDB is down
        try:
            # Optional quick reachability check
            if not await _db_ping():
                raise ServerSelectionTimeoutError("MongoDB unreachable")
            await db.issues.insert_one(issue_doc)
        except ServerSelectionTimeoutError as e:
            logger.error(f"MongoDB insert failed: {e}")
            raise HTTPException(status_code=503, detail="Database unavailable")
        except Exception as e:
            logger.error(f"MongoDB insert error: {e}")
            raise HTTPException(status_code=500, detail="Database error")
        
        # Return without _id
        return Issue(**{k: v for k, v in issue_doc.items() if k != '_id'})
    except Exception as e:
        logger.error(f"Create issue error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/issues", response_model=List[Issue])
async def get_issues():
    try:
        if not await _db_ping():
            raise ServerSelectionTimeoutError("MongoDB unreachable")
        issues = await db.issues.find({}, {"_id": 0}).to_list(1000)
        return [Issue(**issue) for issue in issues]
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    except Exception as e:
        logger.error(f"Fetch issues error: {e}")
        raise HTTPException(status_code=500, detail="Database error")

@api_router.patch("/issues/{issue_id}", response_model=Issue)
async def update_issue_status(issue_id: str, update: IssueUpdate):
    try:
        if not await _db_ping():
            raise ServerSelectionTimeoutError("MongoDB unreachable")
        result = await db.issues.find_one_and_update(
            {"id": issue_id},
            {"$set": {"status": update.status}},
            return_document=True
        )
        if not result:
            raise HTTPException(status_code=404, detail="Issue not found")
        return Issue(**{k: v for k, v in result.items() if k != '_id'})
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    except Exception as e:
        logger.error(f"Update issue error: {e}")
        raise HTTPException(status_code=500, detail="Database error")

@api_router.delete("/issues/{issue_id}")
async def delete_issue(issue_id: str):
    try:
        if not await _db_ping():
            raise ServerSelectionTimeoutError("MongoDB unreachable")
        result = await db.issues.delete_one({"id": issue_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Issue not found")
        return {"message": "Issue deleted"}
    except ServerSelectionTimeoutError:
        raise HTTPException(status_code=503, detail="Database unavailable")
    except Exception as e:
        logger.error(f"Delete issue error: {e}")
        raise HTTPException(status_code=500, detail="Database error")

# Stats endpoint for admin
@api_router.get("/stats")
async def get_stats():
    try:
        if not await _db_ping():
            raise ServerSelectionTimeoutError("MongoDB unreachable")
        total_issues = await db.issues.count_documents({})
        open_issues = await db.issues.count_documents({"status": "Open"})
        in_progress = await db.issues.count_documents({"status": "In Progress"})
        resolved = await db.issues.count_documents({"status": "Resolved"})
        
        # Get recent logs (last 5 status changes)
        recent_issues = await db.issues.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
        
        return {
            "total_issues": total_issues,
            "open_issues": open_issues,
            "in_progress": in_progress,
            "resolved": resolved,
            "system_status": "Operational",
            "recent_logs": recent_issues
        }
    except ServerSelectionTimeoutError:
        # When DB is down, return zeros and degraded status so UI stays responsive
        return {
            "total_issues": 0,
            "open_issues": 0,
            "in_progress": 0,
            "resolved": 0,
            "system_status": "Degraded (DB unavailable)",
            "recent_logs": []
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail="Database error")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
