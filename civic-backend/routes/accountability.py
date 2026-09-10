from fastapi import APIRouter
from supabase import create_client
import os, math
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/accountability", tags=["accountability"])
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))


def calc_accountability_score(resolution_rate, satisfaction_rate, avg_days):
    speed_score = 25 * math.exp(-avg_days / 14) if avg_days else 0
    score = (resolution_rate * 40) + (satisfaction_rate * 35) + speed_score
    return round(score, 1)


def get_grade(score):
    if score >= 80: return {"grade": "Excellent", "color": "#10b981", "emoji": "🟢"}
    if score >= 60: return {"grade": "Average", "color": "#f59e0b", "emoji": "🟡"}
    if score >= 40: return {"grade": "Below Average", "color": "#f97316", "emoji": "🟠"}
    return {"grade": "Poor", "color": "#ef4444", "emoji": "🔴"}


@router.get("/")
def get_accountability():
    # Get all authorities
    authorities = supabase.table("users").select("*").eq("role", "authority").execute()

    results = []
    for auth in authorities.data:
        auth_id = auth["id"]

        # Total assigned
        assigned = supabase.table("issues").select("id, status, resolved_at, created_at") \
            .eq("assigned_authority_id", auth_id).execute()
        total_assigned = len(assigned.data)
        if total_assigned == 0:
            continue

        resolved_issues = [i for i in assigned.data if i["status"] == "resolved"]
        total_resolved = len(resolved_issues)
        resolution_rate = total_resolved / total_assigned if total_assigned else 0

        # Avg resolution days
        days_list = []
        for issue in resolved_issues:
            if issue.get("resolved_at") and issue.get("created_at"):
                from datetime import datetime
                try:
                    created = datetime.fromisoformat(issue["created_at"].replace("Z", "+00:00"))
                    resolved = datetime.fromisoformat(issue["resolved_at"].replace("Z", "+00:00"))
                    days_list.append((resolved - created).total_seconds() / 86400)
                except:
                    pass
        avg_days = sum(days_list) / len(days_list) if days_list else 0

        # Verifications
        issue_ids = [i["id"] for i in assigned.data]
        all_verifications = []
        for iid in issue_ids:
            v = supabase.table("verifications").select("outcome").eq("issue_id", iid).execute()
            all_verifications.extend(v.data)

        total_verifications = len(all_verifications)
        positive = len([v for v in all_verifications if v["outcome"] == "resolved"])
        satisfaction_rate = positive / total_verifications if total_verifications else 0

        score = calc_accountability_score(resolution_rate, satisfaction_rate, avg_days)
        grade_info = get_grade(score)

        results.append({
            "id": auth_id,
            "name": auth["name"],
            "department": auth.get("department", ""),
            "total_assigned": total_assigned,
            "total_resolved": total_resolved,
            "resolution_rate": round(resolution_rate * 100, 1),
            "satisfaction_rate": round(satisfaction_rate * 100, 1),
            "avg_resolution_days": round(avg_days, 1),
            "accountability_score": score,
            **grade_info
        })

    results.sort(key=lambda x: x["accountability_score"], reverse=True)
    return {"authorities": results}


@router.get("/{authority_id}")
def get_authority_detail(authority_id: str):
    auth = supabase.table("users").select("*").eq("id", authority_id).single().execute()
    issues = supabase.table("issues").select("*") \
        .eq("assigned_authority_id", authority_id).order("impact_score", desc=True).execute()

    issue_ids = [i["id"] for i in issues.data]
    all_verifications = []
    for iid in issue_ids:
        v = supabase.table("verifications").select("*").eq("issue_id", iid).execute()
        all_verifications.extend(v.data)

    return {
        "authority": auth.data,
        "issues": issues.data,
        "verifications": all_verifications
    }