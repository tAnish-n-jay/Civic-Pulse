from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Depends, Header
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from services.gemini import analyze_issue
from services.scoring import calculate_impact_score, assign_authority
from supabase import create_client
import os
import jwt
import httpx
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/issues", tags=["issues"])

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_DRAFT_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={GEMINI_API_KEY}"

ALLOWED_STATUSES = {"reported", "acknowledged", "in_progress", "resolved", "closed"}

jwks_client = jwt.PyJWKClient(JWKS_URL)


def get_current_user(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"id": payload["sub"], "role": payload.get("user_metadata", {}).get("role")}


def require_authority(user: dict = Depends(get_current_user)):
    if user.get("role") not in ("authority", "representative"):
        raise HTTPException(status_code=403, detail="Authority access required")
    return user


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
    try:
        ai_result = await analyze_issue(title, description)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {str(e)}")

    photo_url = None
    if photo:
        try:
            contents = await photo.read()
            filename = f"{datetime.now().timestamp()}_{photo.filename}"
            supabase.storage.from_("issue-photos").upload(filename, contents, {"content-type": photo.content_type})
            photo_url = supabase.storage.from_("issue-photos").get_public_url(filename)
        except Exception:
            photo_url = None

    created_at = datetime.now(timezone.utc)
    impact_score = calculate_impact_score(
        severity=ai_result.get("severity", 3),
        upvotes=0,
        category=ai_result.get("category", "infrastructure"),
        created_at=created_at
    )

    assigned_authority_id = assign_authority(supabase, ai_result.get("assigned_department"))

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
        "assigned_authority_id": assigned_authority_id,
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


# ── IMPORTANT: specific routes BEFORE /{issue_id} ──

@router.get("/authority/issues")
def get_authority_issues(user: dict = Depends(require_authority)):
    result = supabase.table("issues") \
        .select("*") \
        .eq("assigned_authority_id", user["id"]) \
        .order("impact_score", desc=True) \
        .execute()
    return {"issues": result.data}


@router.post("/{issue_id}/upvote")
def upvote_issue(issue_id: str, user_id: str = Form(...)):
    existing = supabase.table("upvotes").select("id").eq("issue_id", issue_id).eq("user_id", user_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Already upvoted")

    supabase.table("upvotes").insert({"issue_id": issue_id, "user_id": user_id}).execute()

    issue = supabase.table("issues").select("*").eq("id", issue_id).single().execute()
    if not issue.data:
        raise HTTPException(status_code=404, detail="Issue not found")
    issue_data = issue.data

    created_at = datetime.fromisoformat(issue_data["created_at"].replace("Z", "+00:00"))
    new_upvotes = issue_data["upvotes"] + 1
    new_score = calculate_impact_score(
        severity=issue_data["severity"],
        upvotes=new_upvotes,
        category=issue_data["category"],
        created_at=created_at
    )

    supabase.table("issues").update({
        "upvotes": new_upvotes,
        "impact_score": new_score
    }).eq("id", issue_id).execute()

    return {"upvotes": new_upvotes, "impact_score": new_score}


@router.post("/{issue_id}/status")
def update_status(
    issue_id: str,
    new_status: str = Form(...),
    note: str = Form(""),
    user: dict = Depends(require_authority)
):
    if new_status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {new_status}")

    issue = supabase.table("issues").select("status").eq("id", issue_id).single().execute()
    if not issue.data:
        raise HTTPException(status_code=404, detail="Issue not found")
    old_status = issue.data["status"]

    update_data = {"status": new_status}
    if new_status == "resolved":
        update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()

    supabase.table("issues").update(update_data).eq("id", issue_id).execute()

    supabase.table("status_updates").insert({
        "issue_id": issue_id,
        "updated_by": user["id"],
        "old_status": old_status,
        "new_status": new_status,
        "note": note
    }).execute()

    return {"success": True, "old_status": old_status, "new_status": new_status}


@router.get("/{issue_id}/draft-update")
async def draft_update(issue_id: str, user: dict = Depends(require_authority)):
    issue = supabase.table("issues").select("*").eq("id", issue_id).single().execute()
    if not issue.data:
        raise HTTPException(status_code=404, detail="Issue not found")
    d = issue.data

    prompt = f"""You are a civic authority officer. Generate a professional, concise status update note for citizens about this civic issue.

Issue: {d['title']}
Category: {d['category']}
Current Status: {d['status']}
Location: {d['location_text']}
AI Summary: {d['ai_summary']}

Write ONE short paragraph (2-3 sentences) as if you are the authority updating citizens. Be professional and specific. No markdown."""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.7, "thinkingConfig": {"thinkingBudget": 0}}
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.post(GEMINI_DRAFT_URL, json=payload)
            res.raise_for_status()
            data = res.json()
        parts = data["candidates"][0]["content"]["parts"]
        text = next((p["text"] for p in parts if "text" in p), "")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Draft generation failed: {str(e)}")

    return {"draft": text.strip()}


@router.post("/{issue_id}/verify")
def verify_issue(
    issue_id: str,
    verified_by: str = Form(...),
    outcome: str = Form(...),
    comment: str = Form("")
):
    existing = supabase.table("verifications") \
        .select("id").eq("issue_id", issue_id).eq("verified_by", verified_by).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Already verified")

    supabase.table("verifications").insert({
        "issue_id": issue_id,
        "verified_by": verified_by,
        "outcome": outcome,
        "comment": comment
    }).execute()

    return {"success": True, "outcome": outcome}


@router.get("/{issue_id}/updates")
def get_issue_updates(issue_id: str):
    result = supabase.table("status_updates").select("*") \
        .eq("issue_id", issue_id).order("created_at").execute()
    return {"updates": result.data}


@router.get("/{issue_id}")
def get_issue(issue_id: str):
    result = supabase.table("issues").select("*").eq("id", issue_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Issue not found")
    return result.data