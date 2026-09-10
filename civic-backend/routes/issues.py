from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.gemini import analyze_issue
from services.scoring import calculate_impact_score
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/issues", tags=["issues"])

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))


@router.post("/")
async def create_issue(
    title: str = Form(...),
    description: str = Form(...),
    location_text: str = Form(""),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    reported_by: str = Form(...),
    photo: Optional[UploadFile] = File(None)
):
    # 1. Call Gemini for AI analysis
    try:
        ai_result = await analyze_issue(title, description)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {str(e)}")

    # 2. Upload photo if provided
    photo_url = None
    if photo:
        try:
            contents = await photo.read()
            filename = f"{datetime.now().timestamp()}_{photo.filename}"
            supabase.storage.from_("issue-photos").upload(filename, contents, {"content-type": photo.content_type})
            photo_url = supabase.storage.from_("issue-photos").get_public_url(filename)
        except Exception as e:
            photo_url = None  # Don't fail if photo upload fails

    # 3. Calculate initial impact score
    created_at = datetime.now(timezone.utc)
    impact_score = calculate_impact_score(
        severity=ai_result.get("severity", 3),
        upvotes=0,
        category=ai_result.get("category", "infrastructure"),
        created_at=created_at
    )

    # 4. Insert into Supabase
    issue_data = {
        "title": title,
        "description": description,
        "category": ai_result.get("category"),
        "severity": ai_result.get("severity"),
        "location_text": location_text,
        "latitude": latitude,
        "longitude": longitude,
        "photo_url": photo_url,
        "reported_by": reported_by,
        "assigned_department": ai_result.get("assigned_department"),
        "status": "reported",
        "ai_summary": ai_result.get("impact_summary"),
        "ai_severity_reason": ai_result.get("severity_reason"),
        "upvotes": 0,
        "impact_score": impact_score,
    }

    result = supabase.table("issues").insert(issue_data).execute()

    return {
        "issue": result.data[0],
        "ai_analysis": ai_result,
        "impact_score": impact_score
    }
@router.get("/")
def get_issues(
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    area: Optional[str] = Query(None)
):
    query = supabase.table("issues").select("*, reporter:users!issues_reported_by_fkey(name)").order("impact_score", desc=True)
    
    if category:
        query = query.eq("category", category)
    if status:
        query = query.eq("status", status)
    if area:
        query = query.ilike("location_text", f"%{area}%")
    
    result = query.execute()
    return {"issues": result.data}


@router.post("/{issue_id}/upvote")
def upvote_issue(issue_id: str, user_id: str = Form(...)):
    # Check if already upvoted
    existing = supabase.table("upvotes").select("id").eq("issue_id", issue_id).eq("user_id", user_id).execute()
    
    if existing.data:
        raise HTTPException(status_code=400, detail="Already upvoted")

    # Insert upvote
    supabase.table("upvotes").insert({"issue_id": issue_id, "user_id": user_id}).execute()

    # Get current issue
    issue = supabase.table("issues").select("*").eq("id", issue_id).single().execute()
    issue_data = issue.data

    # Recalculate impact score
    from services.scoring import calculate_impact_score
    from datetime import datetime, timezone
    
    created_at = datetime.fromisoformat(issue_data["created_at"].replace("Z", "+00:00"))
    new_upvotes = issue_data["upvotes"] + 1
    new_score = calculate_impact_score(
        severity=issue_data["severity"],
        upvotes=new_upvotes,
        category=issue_data["category"],
        created_at=created_at
    )

    # Update issue
    supabase.table("issues").update({
        "upvotes": new_upvotes,
        "impact_score": new_score
    }).eq("id", issue_id).execute()

    return {"upvotes": new_upvotes, "impact_score": new_score}