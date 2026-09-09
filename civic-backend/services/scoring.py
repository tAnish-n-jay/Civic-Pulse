import math
from datetime import datetime, timezone

CATEGORY_WEIGHTS = {
    "sewage": 5,
    "water": 5,
    "pothole": 4,
    "streetlight": 3,
    "garbage": 3,
    "infrastructure": 2,
}

def calculate_impact_score(severity: int, upvotes: int, category: str, created_at: datetime) -> float:
    now = datetime.now(timezone.utc)
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    
    days_old = (now - created_at).total_seconds() / 86400
    recency_score = 10 * math.exp(-days_old / 7)
    category_weight = CATEGORY_WEIGHTS.get(category.lower(), 2)

    score = (severity * 20) + (upvotes * 3) + (recency_score * 10) + (category_weight * 15)
    return round(score, 2)