import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from urllib.parse import unquote

import boto3
from boto3.dynamodb.conditions import Attr, Key
from botocore.exceptions import ClientError
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mangum import Mangum
from pydantic import BaseModel

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# CONFIG - everything sensitive comes from the environment / Secrets Manager.
# NOTHING secret is stored in this file.
# ---------------------------------------------------------------------------
TABLE_NAME = os.environ.get('TABLE_NAME', 'BlueFit-Table')
AUTH_SECRET_ARN = os.environ.get('AUTH_SECRET_ARN')          # token-signing key (Secrets Manager)
# Websites / apps that may call this API from a browser. The production web app (also what iPhone
# users add to their home screen from Safari) and local development are always allowed.
DEFAULT_ORIGINS = ','.join([
    'http://localhost:3000',
    'http://localhost',
    'https://localhost',
    'capacitor://localhost',
    'https://bluefit-1g5.pages.dev',
])
ALLOWED_ORIGINS = [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', DEFAULT_ORIGINS).split(',') if o.strip()]

TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60   # sessions last 30 days and slide forward while the app is used
TOKEN_REFRESH_AFTER_SECONDS = 24 * 60 * 60   # the app asks for a fresh token once the current one is a day old
MAX_FAILED_LOGINS = 5                # lock the account after this many wrong passwords...
LOCK_SECONDS = 15 * 60               # ...for this long
MIN_PASSWORD_LENGTH = 8

app = FastAPI(title="The Blue Fit Core API", docs_url=None, redoc_url=None, openapi_url=None)

# Browsers may only call this API from the origins listed in ALLOWED_ORIGINS
# (API Gateway enforces the same list in production; see template.yaml).
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)
s3 = boto3.client('s3')
CLIENT_MEDIA_BUCKET = os.environ.get('CLIENT_MEDIA_BUCKET')

# ---------------------------------------------------------------------------
# SINGLE-TABLE LAYOUT  (table: BlueFit-Table, keys: PK + SK)
#
#   PK            SK                        what it is
#   CLIENT#<id>   PROFILE#BASELINE          athlete profile (role=CLIENT, coachId=COACH#<id>)
#   COACH#<id>    PROFILE#BASELINE          coach profile   (role=COACH)
#   ADMIN#<id>    PROFILE#BASELINE          admin profile   (role=ADMIN, created by scripts/create_admin.py)
#   CLIENT#<id>   CHECKIN#<iso-timestamp>   weekly check-in
#   CLIENT#<id>   TRAINING#<YYYY-MM-DD>#<n> a training task scheduled for that day
#   COACH#<id>    TEMPLATE#<templateId>     reusable workout/plan template
#   CLIENT#<id>   MSG#<iso-ts>#<n>          one chat message between a client and their coach
#   CLIENT#<id>   THREAD#META               chat read-markers + the client's unread counter
#   COACH#<id>    INBOX#<clientId>          the coach's inbox row for one client (last message + unread)
#   CLIENT#<id>   HEALTH#<YYYY-MM-DD>       daily steps / sleep / water / calories / heart-rate snapshot
# ---------------------------------------------------------------------------
PROFILE_SK = 'PROFILE#BASELINE'
ROLE_PREFIXES = {'CLIENT': 'CL', 'COACH': 'CH', 'ADMIN': 'AD'}   # CLIENT#CLS001, COACH#CHR001, ADMIN#ADH001
PROVISIONABLE_ROLES = {'CLIENT', 'COACH'}                          # admins are never created through the API
ADHERENCE_SCORES = {'strict': 100, 'mostly': 75, 'struggled': 40}
WORKOUT_QUALITIES = {'strong', 'maintained', 'weak'}

# Fields that may be written from a form, per role (anything else is ignored)
CLIENT_BASELINE_FIELDS = ('age', 'height', 'weight', 'activityLevel', 'primaryGoal', 'medicalNotes')
COACH_BASELINE_FIELDS = ('specialization',)

# Fields an admin may see in the user directory. Password hashes, lockout counters
# and health notes are NEVER part of this list.
ADMIN_VIEW_FIELDS = ('PK', 'SK', 'role', 'name', 'email', 'userCode', 'coachId', 'status',
                     'createdAt', 'onboardingCompleted', 'mustChangePassword',
                     'lastLoginAt', 'lastActiveAt', 'loginCount')

ONLINE_WINDOW_SECONDS = 150          # "online now" = heard from within 2.5 minutes (the app pings every 45 s while open)
ACTIVITY_TOUCH_SECONDS = 30          # write lastActiveAt at most once every 30 s per user

# Daily targets, shared by the athlete dashboard, the coach dashboard and the progress review
STEP_GOAL = 10000
SLEEP_GOAL = 8.0
HYDRATION_GOAL = 3.0
MESSAGE_MAX_LENGTH = 2000
IMPORT_MAX_TEMPLATES = 25
PROGRESS_ANGLES = ('front', 'side', 'back')
WEEKDAYS = ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')


# ----------------------------- generic helpers -----------------------------
def parse_decimals(obj):
    """DynamoDB returns Decimal; convert so JSON serialisation works."""
    if isinstance(obj, list):
        return [parse_decimals(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: parse_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, Decimal):
        return int(obj) if obj % 1 == 0 else float(obj)
    return obj


def to_dynamo(obj):
    """DynamoDB rejects float and None: floats -> Decimal, None values dropped."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: to_dynamo(v) for k, v in obj.items() if v is not None}
    if isinstance(obj, list):
        return [to_dynamo(v) for v in obj]
    return obj


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec='milliseconds')


def make_pk(role: str, raw: str) -> str:
    """'CHR001' -> 'COACH#CHR001'.  A full key ('COACH#CHR001', also URL-encoded) is kept."""
    raw = unquote(raw).strip()
    return raw if '#' in raw else f"{role.upper()}#{raw}"


def short_id(pk: str) -> str:
    return pk.split('#', 1)[1] if '#' in pk else pk


def error_code(e: ClientError) -> str:
    return e.response.get('Error', {}).get('Code', '')


def scan_all(**kwargs) -> List[dict]:
    """Scan following LastEvaluatedKey so results are not cut off at 1 MB."""
    items: List[dict] = []
    while True:
        resp = table.scan(**kwargs)
        items.extend(resp.get('Items', []))
        last = resp.get('LastEvaluatedKey')
        if not last:
            return items
        kwargs['ExclusiveStartKey'] = last


def query_all(**kwargs) -> List[dict]:
    items: List[dict] = []
    while True:
        resp = table.query(**kwargs)
        items.extend(resp.get('Items', []))
        last = resp.get('LastEvaluatedKey')
        if not last:
            return items
        kwargs['ExclusiveStartKey'] = last


def all_profiles() -> List[dict]:
    """INTERNAL USE ONLY - contains password hashes. Never return this to a client."""
    return scan_all(FilterExpression=Attr('SK').eq(PROFILE_SK))


def get_profile(pk: str) -> Optional[dict]:
    return table.get_item(Key={'PK': pk, 'SK': PROFILE_SK}).get('Item')


def pick(source: dict, fields) -> dict:
    return {k: source[k] for k in fields if k in source}


# ------------------------- passwords (salted scrypt) -----------------------
def hash_password(raw: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(raw.encode('utf-8'), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(raw: str, stored: str) -> bool:
    try:
        scheme, salt_hex, digest_hex = stored.split('$')
        if scheme != 'scrypt':
            return False
        digest = hashlib.scrypt(raw.encode('utf-8'), salt=bytes.fromhex(salt_hex), n=2 ** 14, r=8, p=1, dklen=32)
        return hmac.compare_digest(digest, bytes.fromhex(digest_hex))
    except Exception:
        return False


# Used to burn the same CPU time when a login names an account that does not exist,
# so response time does not reveal which IDs are real.
_DUMMY_HASH = hash_password(secrets.token_hex(8))


def generate_temp_password() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"          # no 0/O/1/I to avoid misreads
    return "TBF-" + "".join(secrets.choice(alphabet) for _ in range(8))


def validate_new_password(pw: str) -> None:
    if len(pw) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail=f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
    if len(pw) > 128:
        raise HTTPException(status_code=400, detail="Password is too long.")
    if not (re.search(r'[A-Za-z]', pw) and re.search(r'\d', pw)):
        raise HTTPException(status_code=400, detail="Password must contain letters and numbers.")


# ----------------------- session tokens (HS256, stdlib) --------------------
_signing_key: Optional[bytes] = None


def signing_key() -> bytes:
    """Key comes from Secrets Manager (auto-generated by template.yaml); AUTH_SECRET is for local tests only."""
    global _signing_key
    if _signing_key is None:
        local = os.environ.get('AUTH_SECRET')
        if local:
            key = local.encode('utf-8')
        elif AUTH_SECRET_ARN:
            key = boto3.client('secretsmanager').get_secret_value(SecretId=AUTH_SECRET_ARN)['SecretString'].encode('utf-8')
        else:
            raise RuntimeError("AUTH_SECRET_ARN is not configured")
        if len(key) < 32:
            raise RuntimeError("Token signing key is too short")
        _signing_key = key
    return _signing_key


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + '=' * (-len(text) % 4))


def issue_token(pk: str, role: str) -> str:
    now = int(time.time())
    header = _b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(',', ':')).encode())
    body = _b64(json.dumps({"sub": pk, "role": role, "iat": now, "exp": now + TOKEN_TTL_SECONDS}, separators=(',', ':')).encode())
    sig = _b64(hmac.new(signing_key(), f"{header}.{body}".encode(), hashlib.sha256).digest())
    return f"{header}.{body}.{sig}"


def verify_token(token: str) -> dict:
    key = signing_key()
    try:
        header_b64, body_b64, sig_b64 = token.split('.')
        if json.loads(_unb64(header_b64)).get('alg') != 'HS256':
            raise ValueError("bad alg")
        expected = hmac.new(key, f"{header_b64}.{body_b64}".encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _unb64(sig_b64)):
            raise ValueError("bad signature")
        claims = json.loads(_unb64(body_b64))
        if int(claims['exp']) < time.time():
            raise ValueError("expired")
        return claims
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please sign in again.")


# ------------------------------ authorization ------------------------------
def current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    """Every protected route depends on this. Verifies the bearer token, then re-checks
    the account in DynamoDB so deleted/disabled users and old-password tokens stop working."""
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail="Authentication required.")
    claims = verify_token(authorization[7:].strip())
    profile = get_profile(claims.get('sub', ''))
    if not profile or profile.get('status') == 'INACTIVE':
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please sign in again.")
    if int(claims.get('iat', 0)) < int(profile.get('pwdChangedAt', 0)):
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please sign in again.")
    touch_activity(profile)
    return {"pk": profile['PK'], "role": profile.get('role'), "name": profile.get('name'),
            "iat": int(claims.get('iat', 0))}


def touch_activity(profile: dict) -> None:
    """Record 'last seen' for the admin Monitor. Throttled so it is at most one write a minute,
    and never allowed to break the request it rides on."""
    try:
        last = parse_iso(profile.get('lastActiveAt', ''))
        if last and (datetime.now(timezone.utc) - last).total_seconds() < ACTIVITY_TOUCH_SECONDS:
            return
        table.update_item(
            Key={'PK': profile['PK'], 'SK': PROFILE_SK},
            UpdateExpression="SET lastActiveAt = :t",
            ExpressionAttributeValues={':t': now_iso()},
        )
    except Exception:
        logger.warning('could not record activity for %s', profile.get('PK'))


def record_logout(pk: str) -> None:
    """Called on sign-out so the admin Monitor stops showing the person as 'online'."""
    try:
        table.update_item(
            Key={'PK': pk, 'SK': PROFILE_SK},
            UpdateExpression="SET lastLogoutAt = :t",
            ExpressionAttributeValues={':t': now_iso()},
        )
    except Exception:
        logger.warning('could not record logout for %s', pk)


def record_login(profile: dict) -> None:
    """Called when a session token is issued."""
    try:
        ts = now_iso()
        table.update_item(
            Key={'PK': profile['PK'], 'SK': PROFILE_SK},
            UpdateExpression="SET lastLoginAt = :t, lastActiveAt = :t, loginCount = :n",
            ExpressionAttributeValues={':t': ts, ':n': int(profile.get('loginCount', 0)) + 1},
        )
    except Exception:
        logger.warning('could not record login for %s', profile.get('PK'))


def is_coach_of(client_profile: Optional[dict], coach_pk: str) -> bool:
    """coachId is stored either as the full key (COACH#CHR001) or the bare id (CHR001)."""
    return bool(client_profile) and client_profile.get('coachId') in (coach_pk, short_id(coach_pk))


def require_roles(*roles: str):
    def dependency(user: dict = Depends(current_user)) -> dict:
        if user['role'] not in roles:
            raise HTTPException(status_code=403, detail="You do not have access to this resource.")
        return user
    return dependency


def authorize_coach_scope(user: dict, coach_pk: str) -> None:
    """A coach may only touch their own data; an admin may touch any coach's."""
    if user['role'] == 'ADMIN':
        return
    if user['role'] == 'COACH' and user['pk'] == coach_pk:
        return
    raise HTTPException(status_code=403, detail="You do not have access to this resource.")


def authorize_athlete_scope(user: dict, client_pk: str) -> None:
    """An athlete sees only their own data; their assigned coach and admins may also see it."""
    if user['role'] == 'ADMIN' or (user['role'] == 'CLIENT' and user['pk'] == client_pk):
        return
    if user['role'] == 'COACH':
        client = get_profile(client_pk)
        if client and client.get('coachId') in (user['pk'], short_id(user['pk'])):
            return
    raise HTTPException(status_code=403, detail="You do not have access to this resource.")


# --------------------------- domain helpers --------------------------------
def coach_clients(coach_pk: str) -> List[dict]:
    """Clients whose coachId is this coach (full key or bare id)."""
    return scan_all(
        FilterExpression=Attr('SK').eq(PROFILE_SK)
        & Attr('role').eq('CLIENT')
        & Attr('coachId').is_in([coach_pk, short_id(coach_pk)])
    )


def latest_checkins(client_pk: str, n: int = 4) -> List[dict]:
    resp = table.query(
        KeyConditionExpression=Key('PK').eq(client_pk) & Key('SK').begins_with('CHECKIN#'),
        ScanIndexForward=False,
        Limit=n,
    )
    return resp.get('Items', [])


def parse_iso(value: str) -> Optional[datetime]:
    try:
        dt = datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def days_since(iso: Optional[str]) -> Optional[int]:
    dt = parse_iso(iso) if iso else None
    if not dt:
        return None
    return (datetime.now(timezone.utc).date() - dt.astimezone(timezone.utc).date()).days


def day_label(iso: Optional[str]) -> str:
    d = days_since(iso)
    if d is None:
        return 'No check-ins yet'
    return 'Today' if d <= 0 else 'Yesterday' if d == 1 else f'{d} days ago'


def time_ago(iso: Optional[str]) -> str:
    dt = parse_iso(iso) if iso else None
    if not dt:
        return ''
    secs = max(0, int((datetime.now(timezone.utc) - dt).total_seconds()))
    if secs < 60:
        return 'Just now'
    if secs < 3600:
        return f'{secs // 60}m ago'
    if secs < 86400:
        return f'{secs // 3600}h ago'
    return day_label(iso)


def adherence_score(value: Any) -> Optional[int]:
    """Check-in form sends strict/mostly/struggled; also accepts '85' or '85%'."""
    if value is None:
        return None
    v = str(value).strip().lower()
    if v in ADHERENCE_SCORES:
        return ADHERENCE_SCORES[v]
    m = re.match(r'^(\d+(?:\.\d+)?)\s*%?$', v)
    return min(100, round(float(m.group(1)))) if m else None


def utc_today() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%d')


def date_window(end_iso: str, days: int) -> List[str]:
    """`days` ISO dates ending at end_iso, oldest first."""
    end = datetime.strptime(end_iso, '%Y-%m-%d').date()
    return [(end - timedelta(days=n)).isoformat() for n in range(days - 1, -1, -1)]


def health_range(client_pk: str, start_iso: str, end_iso: str) -> Dict[str, dict]:
    """Daily health snapshots between two ISO dates (inclusive), keyed by date."""
    items = query_all(KeyConditionExpression=Key('PK').eq(client_pk)
                      & Key('SK').between(f"HEALTH#{start_iso}", f"HEALTH#{end_iso}"))
    return {i['SK'].split('#', 1)[1]: i for i in items}


def pct_of(value: Any, goal: float) -> Optional[int]:
    try:
        return round(min(float(value) / goal, 1.0) * 100)
    except (TypeError, ValueError, ZeroDivisionError):
        return None


def health_view(item: Optional[dict]) -> dict:
    item = item or {}
    return {k: item.get(k) for k in ('steps', 'sleepHours', 'calories', 'heartRate', 'hydration')}


def latest_health(client_pk: str):
    """Most recent daily snapshot from the last two days -> (date, item) or (None, {}).
    Looks one day ahead of UTC so a phone in a timezone that is already 'tomorrow' is included."""
    today = datetime.now(timezone.utc).date()
    rng = health_range(client_pk, (today - timedelta(days=1)).isoformat(), (today + timedelta(days=1)).isoformat())
    if not rng:
        return None, {}
    day = max(rng)
    return day, rng[day]


def summarize_client(profile: dict, with_health: bool = False):
    """Returns (row for the roster, meta used by the dashboard feed). Only safe fields leave here."""
    checkins = latest_checkins(profile['PK'], 4)
    scores = [s for s in (adherence_score(c.get('adherence')) for c in checkins) if s is not None]
    adherence = round(sum(scores) / len(scores)) if scores else 0
    last_ts = checkins[0]['SK'].split('#', 1)[1] if checkins else None
    days = days_since(last_ts)
    on_track = days is not None and days <= 7 and adherence >= 75
    row = {
        "id": short_id(profile['PK']),
        "name": profile.get('name') or 'Unnamed Athlete',
        "goal": profile.get('primaryGoal') or profile.get('goal') or 'Not set',
        "adherence": adherence,
        "lastCheckIn": day_label(last_ts),
        "status": 'on-track' if on_track else 'needs-attention',
    }
    if with_health:
        pres = profile_presence(profile)
        h_day, h_item = latest_health(profile['PK'])
        row.update({
            "presence": pres['presence'],
            "lastSeenAt": pres['lastSeenAt'],
            "stepsToday": h_item.get('steps'),
            "stepsDate": h_day,
            "stepGoal": STEP_GOAL,
            "unreadMessages": 0,
        })
    meta = {
        "lastTs": last_ts,
        "days": days,
        "weight": checkins[0].get('weight') if checkins else None,
        "latestScore": adherence_score(checkins[0].get('adherence')) if checkins else None,
    }
    return row, meta


def clean_text(value: Optional[str], limit: int) -> Optional[str]:
    if value is None:
        return None
    value = str(value).strip()
    if len(value) > limit:
        raise HTTPException(status_code=400, detail=f"Text is too long (max {limit} characters).")
    return value


def clean_exercises(exercises: Optional[List[Dict[str, Any]]]) -> Optional[List[Dict[str, str]]]:
    """Normalize imported/manual exercise rows without dropping workout instructions."""
    if exercises is None:
        return None
    if len(exercises) > 100:
        raise HTTPException(status_code=400, detail="Too many exercises (max 100).")

    fields = {
        'id': 100,
        'order': 20,
        'section': 100,
        'type': 100,
        'name': 150,
        'sets': 100,
        'reps': 100,
        'rest': 100,
        'tempo': 100,
        'weight': 100,
        'rpe': 100,
        'notes': 500,
    }

    cleaned: List[Dict[str, str]] = []
    for index, ex in enumerate(exercises, start=1):
        if not isinstance(ex, dict):
            raise HTTPException(status_code=400, detail=f"Exercise {index} must be an object.")
        row: Dict[str, str] = {}
        for key, limit in fields.items():
            value = ex.get(key, '')
            row[key] = clean_text(str(value), limit) or ''
        if not row['id']:
            row['id'] = str(index)
        if not row['order']:
            row['order'] = str(index)
        cleaned.append(row)
    return cleaned


def template_out(item: dict) -> dict:
    out = parse_decimals({
        "id": item['SK'].split('#', 1)[1],
        "title": item.get('title', ''),
        "description": item.get('description', ''),
        "activities": item.get('activities', ''),
        "workoutDays": item.get('workoutDays', ''),
        "goal": item.get('goal', ''),
        "exercises": item.get('exercises', []),
        "level": item.get('level', ''),
        "estimatedDuration": item.get('estimatedDuration', ''),
        "equipment": item.get('equipment', ''),
        "referenceImageKey": item.get('referenceImageKey', ''),
    })
    # Generate a short-lived presigned URL for the reference image if present
    if out.get('referenceImageKey') and CLIENT_MEDIA_BUCKET:
        try:
            out['referenceImageUrl'] = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': CLIENT_MEDIA_BUCKET, 'Key': out['referenceImageKey']},
                ExpiresIn=3600,
            )
        except Exception:
            out['referenceImageUrl'] = None
    else:
        out['referenceImageUrl'] = None
    return out


def clean_reference_key(owner_pk: str, value: Optional[str]) -> str:
    """A template's reference image must live in the owning coach's own media folder.
    Without this check a coach could point a template at any client's photo (for example via a
    hand-edited import file) and then open it through the template image viewer."""
    key = (clean_text(value, 500) or '')
    if key and (not key.startswith(f"coaches/{short_id(owner_pk)}/") or '..' in key.split('/')):
        raise HTTPException(status_code=400, detail="Invalid reference image.")
    return key


def find_template(template_id: str, coach_pk: Optional[str]) -> Optional[dict]:
    """Direct get_item when the coach is known, otherwise (admin only) a filtered scan."""
    sk = f"TEMPLATE#{unquote(template_id)}"
    if coach_pk:
        return table.get_item(Key={'PK': coach_pk, 'SK': sk}).get('Item')
    found = scan_all(FilterExpression=Attr('SK').eq(sk))
    return found[0] if found else None


def session_payload(profile: dict, with_token: bool) -> dict:
    """The ONLY shape in which a user record is returned after login."""
    out = {
        "PK": profile['PK'],
        "userCode": short_id(profile['PK']),
        "role": profile.get('role', 'CLIENT'),
        "name": profile.get('name', 'User'),
        "email": profile.get('email', ''),
        "mustChangePassword": bool(profile.get('mustChangePassword', False)),
        "onboardingCompleted": bool(profile.get('onboardingCompleted', True)),
    }
    if with_token:
        out["token"] = issue_token(profile['PK'], out["role"])
    return out


def find_login_profile(identifier: str, role: Optional[str]) -> Optional[dict]:
    ident = identifier.strip()
    if '@' in ident:
        found = scan_all(FilterExpression=Attr('SK').eq(PROFILE_SK) & Attr('email').eq(ident.lower()))
        return found[0] if len(found) == 1 else None
    code = short_id(ident).upper()
    candidates = [f"ADMIN#{code}"]
    if role and role.upper() in ('CLIENT', 'COACH'):
        candidates.insert(0, f"{role.upper()}#{code}")
    elif not role:
        candidates = [f"CLIENT#{code}", f"COACH#{code}", f"ADMIN#{code}"]
    for pk in candidates:
        profile = get_profile(pk)
        if profile:
            return profile
    return None


def register_login_failure(profile: dict) -> None:
    attempts = int(profile.get('failedAttempts', 0)) + 1
    locked_until = int(time.time()) + LOCK_SECONDS if attempts >= MAX_FAILED_LOGINS else 0
    table.update_item(
        Key={'PK': profile['PK'], 'SK': PROFILE_SK},
        UpdateExpression="SET failedAttempts = :n, lockedUntil = :l",
        ExpressionAttributeValues={':n': 0 if locked_until else attempts, ':l': locked_until},
    )


def clear_login_failures(profile: dict) -> None:
    if int(profile.get('failedAttempts', 0)) or int(profile.get('lockedUntil', 0)):
        table.update_item(
            Key={'PK': profile['PK'], 'SK': PROFILE_SK},
            UpdateExpression="SET failedAttempts = :z, lockedUntil = :z",
            ExpressionAttributeValues={':z': 0},
        )


def next_user_id(role: str, name: str) -> str:
    """CLIENT#CLS001, CLIENT#CLS002, COACH#CHR001 ... (role prefix + first letter of name + counter)."""
    prefix = ROLE_PREFIXES[role]
    letters = re.sub(r'[^A-Za-z]', '', name.strip())
    code_prefix = f"{prefix}{letters[0].upper() if letters else 'X'}"
    pattern = re.compile(rf"^{re.escape(role)}#{re.escape(code_prefix)}(\d+)$")
    highest = 0
    for profile in all_profiles():
        m = pattern.match(str(profile.get('PK', '')))
        if m:
            highest = max(highest, int(m.group(1)))
    return f"{role}#{code_prefix}{highest + 1:04d}"


# ------------------------------ request models -----------------------------
# Unknown fields in a request body are ignored, so a caller can never write
# arbitrary attributes (role, passwordHash, coachId...) into an item.
class LoginPayload(BaseModel):
    identifier: str
    password: str
    role: Optional[str] = None


class OnboardingPayload(BaseModel):
    name: str
    role: str
    email: str
    age: Optional[float] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    activityLevel: Optional[str] = None
    primaryGoal: Optional[str] = None
    medicalNotes: Optional[str] = None
    specialization: Optional[str] = None
    onboardingCompleted: Optional[bool] = None


class CompleteSetupPayload(BaseModel):
    userId: str
    currentPassword: str
    newPassword: str
    age: Optional[float] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    activityLevel: Optional[str] = None
    primaryGoal: Optional[str] = None
    medicalNotes: Optional[str] = None
    specialization: Optional[str] = None


class AssignPayload(BaseModel):
    coachId: str


class CheckinPayload(BaseModel):
    weight: float
    adherence: str
    workoutQuality: str
    clientId: Optional[str] = None      # ignored for athletes; the signed-in user is always used
    waist: Optional[float] = None
    notes: Optional[str] = None

class HealthMetricsPayload(BaseModel):
    steps: Optional[int] = None
    sleepHours: Optional[float] = None
    calories: Optional[int] = None
    heartRate: Optional[int] = None
    hydration: Optional[float] = None   # litres
    date: Optional[str] = None          # the phone's local date (YYYY-MM-DD); defaults to today in UTC
    source: Optional[str] = None        # 'device' (phone sensors) or 'manual' (typed in by the athlete)



class TemplatePayload(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    goal: Optional[str] = None
    workoutDays: Optional[str] = None
    activities: Optional[str] = None
    exercises: Optional[List[Dict[str, Any]]] = None
    level: Optional[str] = None
    estimatedDuration: Optional[str] = None
    equipment: Optional[str] = None
    referenceImageKey: Optional[str] = None



class ImportTemplatesPayload(BaseModel):
    templates: List[Dict[str, Any]]


class AssignTemplatePayload(BaseModel):
    clientId: str
    startDate: Optional[str] = None
    notes: Optional[str] = None


class ClientSchedulePayload(BaseModel):
    templateId: str
    startDate: str
    notes: Optional[str] = None


class ThreeDayLogPayload(BaseModel):
    meals: Dict[str, str] = {}


class ThreeDayPhotoUploadPayload(BaseModel):
    day: int
    meal: str
    fileName: str
    contentType: str


class ProgressPhotoUploadPayload(BaseModel):
    checkinId: str
    angle: str
    fileName: str
    contentType: str


class ProgressPhotoCompletePayload(BaseModel):
    checkinId: str
    angle: str
    objectKey: str
    originalFileName: Optional[str] = None


class WorkoutLogPayload(BaseModel):
    assignmentId: str
    date: Optional[str] = None
    completed: bool = True


class ThreeDayPhotoCompletePayload(BaseModel):
    day: int
    meal: str
    objectKey: str
    originalFileName: Optional[str] = None


THREE_DAY_MEALS = ('Breakfast', 'Brunch', 'Lunch', 'Snacks', 'Dinner')
THREE_DAY_DAYS = (1, 2, 3)
ALLOWED_IMAGE_TYPES = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'image/heif': '.heif',
}
MAX_CLIENT_PHOTO_BYTES = 10 * 1024 * 1024


def validate_three_day_day(day: int) -> None:
    if day not in THREE_DAY_DAYS:
        raise HTTPException(status_code=400, detail='Day must be 1, 2 or 3.')


def validate_three_day_meal(meal: str) -> str:
    clean = clean_text(meal, 30) or ''
    match = next((m for m in THREE_DAY_MEALS if m.lower() == clean.lower()), None)
    if not match:
        raise HTTPException(status_code=400, detail='Invalid meal.')
    return match


def three_day_log_item(client_pk: str, day: int) -> Optional[dict]:
    return table.get_item(Key={'PK': client_pk, 'SK': f'3DAYLOG#DAY{day}'}).get('Item')


def three_day_status(client_pk: str) -> dict:
    items = query_all(KeyConditionExpression=Key('PK').eq(client_pk) & Key('SK').begins_with('3DAY'))
    logs = {int(i['SK'][-1]): i for i in items if i['SK'].startswith('3DAYLOG#DAY') and i['SK'][-1:].isdigit()}
    photos_by_day: Dict[int, List[dict]] = {1: [], 2: [], 3: []}

    for item in items:
        if not item['SK'].startswith('3DAYPHOTO#DAY'):
            continue
        parts = item['SK'].split('#')
        if len(parts) != 3 or not parts[1].startswith('DAY'):
            continue
        try:
            day = int(parts[1][3:])
        except ValueError:
            continue
        if day not in photos_by_day:
            continue
        view_url = None
        if CLIENT_MEDIA_BUCKET:
            try:
                view_url = s3.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': CLIENT_MEDIA_BUCKET, 'Key': item['objectKey']},
                    ExpiresIn=300,
                )
            except ClientError:
                view_url = None
        photos_by_day[day].append({
            'id': item['SK'],
            'day': day,
            'meal': item.get('meal', ''),
            'originalFileName': item.get('originalFileName', ''),
            'contentType': item.get('contentType', ''),
            'objectKey': item.get('objectKey', ''),
            'uploadedAt': item.get('uploadedAt', item.get('createdAt', '')),
            'viewUrl': view_url,
        })

    output_days = []
    completed_count = 0
    started_count = 0
    for day in THREE_DAY_DAYS:
        meals = {m: str((logs.get(day) or {}).get('meals', {}).get(m, '')) for m in THREE_DAY_MEALS}
        has_meals = any(v.strip() for v in meals.values())
        photos = sorted(photos_by_day[day], key=lambda x: x.get('uploadedAt', ''))
        started = has_meals or bool(photos)
        status = 'COMPLETE' if started else 'NOT_STARTED'
        if started:
            started_count += 1
        if started:
            # A day is considered complete once it has at least one saved entry or photo.
            completed_count += 1
        output_days.append({
            'day': day,
            'status': status if status == 'COMPLETE' else ('IN_PROGRESS' if started else 'NOT_STARTED'),
            'meals': meals,
            'photos': photos,
        })

    if completed_count == 3:
        overall = 'COMPLETE'
    elif started_count > 0:
        overall = 'IN_PROGRESS'
    else:
        overall = 'NOT_STARTED'

    return {
        'onboardingCompleted': bool((get_profile(client_pk) or {}).get('onboardingCompleted', False)),
        'overallStatus': overall,
        'days': output_days,
    }


def check_range(label: str, value: Optional[float], low: float, high: float) -> None:
    if value is not None and not (low <= value <= high):
        raise HTTPException(status_code=400, detail=f"{label} must be between {low:g} and {high:g}.")


def baseline_fields(role: str, data: dict) -> dict:
    """Validated, allow-listed profile fields for the given role."""
    allowed = CLIENT_BASELINE_FIELDS if role == 'CLIENT' else COACH_BASELINE_FIELDS
    out = {k: data.get(k) for k in allowed if data.get(k) not in (None, '')}
    if role == 'CLIENT':
        check_range('Age', out.get('age'), 10, 100)
        check_range('Height (cm)', out.get('height'), 100, 250)
        check_range('Weight (kg)', out.get('weight'), 20, 400)
        for k, limit in (('activityLevel', 50), ('primaryGoal', 50), ('medicalNotes', 2000)):
            if k in out:
                out[k] = clean_text(out[k], limit)
    elif 'specialization' in out:
        out['specialization'] = clean_text(out['specialization'], 50)
    return out


# ----------------------------- app-level handlers --------------------------
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@app.exception_handler(Exception)
async def unhandled_error(request: Request, exc: Exception):
    # Details go to CloudWatch only - callers never see internals (table names, ARNs, stack traces).
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})


# ------------------------------- public ------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/auth/login")
def login(payload: LoginPayload):
    generic = HTTPException(status_code=401, detail="Invalid ID or password.")
    profile = find_login_profile(payload.identifier, payload.role)

    if not profile or not profile.get('passwordHash'):
        verify_password(payload.password, _DUMMY_HASH)          # equalise timing, reveal nothing
        raise generic

    if int(profile.get('lockedUntil', 0)) > int(time.time()):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Please try again in a few minutes.")

    if not verify_password(payload.password, profile['passwordHash']):
        register_login_failure(profile)
        raise generic

    # The role toggle on the login screen must match the account (admins may use either)
    if payload.role and profile.get('role') != 'ADMIN' and payload.role.upper() != profile.get('role'):
        raise generic

    clear_login_failures(profile)

    if profile.get('mustChangePassword'):
        # No session token until the temporary password has been replaced
        return session_payload(profile, with_token=False)
    record_login(profile)
    return session_payload(profile, with_token=True)


@app.post("/auth/complete-setup")
def complete_setup(payload: CompleteSetupPayload):
    """First login: replace the admin-issued temporary password and save baseline details."""
    pk = make_pk('CLIENT', payload.userId) if '#' not in payload.userId else unquote(payload.userId).strip()
    profile = get_profile(pk)
    generic = HTTPException(status_code=401, detail="Invalid ID or password.")

    if not profile or not profile.get('passwordHash'):
        verify_password(payload.currentPassword, _DUMMY_HASH)
        raise generic
    if int(profile.get('lockedUntil', 0)) > int(time.time()):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Please try again in a few minutes.")
    if not verify_password(payload.currentPassword, profile['passwordHash']):
        register_login_failure(profile)
        raise generic
    if not profile.get('mustChangePassword'):
        raise HTTPException(status_code=409, detail="Setup has already been completed.")

    validate_new_password(payload.newPassword)
    if payload.newPassword == payload.currentPassword:
        raise HTTPException(status_code=400, detail="New password must be different from your temporary password.")

    role = profile.get('role', 'CLIENT')
    updates = {
        "passwordHash": hash_password(payload.newPassword),
        "mustChangePassword": False,
        "onboardingCompleted": True,
        "pwdChangedAt": int(time.time()) - 1,       # invalidates any token issued before this moment
        "failedAttempts": 0,
        "lockedUntil": 0,
        "updatedAt": now_iso(),
        **baseline_fields(role, payload.model_dump()),
    }
    updates = to_dynamo(updates)
    names = {f"#f{i}": k for i, k in enumerate(updates)}
    values = {f":v{i}": v for i, v in enumerate(updates.values())}
    expression = "SET " + ", ".join(f"#f{i} = :v{i}" for i in range(len(updates)))
    table.update_item(
        Key={'PK': pk, 'SK': PROFILE_SK},
        UpdateExpression=expression,
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
    )
    fresh = get_profile(pk)
    record_login(fresh)
    return {"message": "Setup completed", "user": session_payload(fresh, with_token=True)}

@app.post("/auth/refresh")
def refresh_session(user: dict = Depends(current_user)):
    """Swap a still-valid token for a fresh 30-day one. The app calls this in the background so people
    who use it regularly are never asked to sign in again. Does not count as a new login."""
    profile = get_profile(user['pk'])
    if not profile or profile.get('mustChangePassword'):
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please sign in again.")
    return session_payload(profile, with_token=True)


@app.post("/auth/logout")
def logout(user: dict = Depends(current_user)):
    """Marks the person as signed out so the Monitor stops showing them as online."""
    record_logout(user['pk'])
    return {"message": "Signed out"}


@app.post("/presence/ping")
def presence_ping(user: dict = Depends(current_user)):
    """Heartbeat sent by the open app every ~45 s. Authenticating already refreshes 'last seen';
    the reply carries the unread-message count for the navigation badge."""
    return {"serverTime": now_iso(), "unreadMessages": unread_message_count(user)}


# -------------------------------- admin ------------------------------------
@app.get("/admin/users")
def get_users(user: dict = Depends(require_roles('ADMIN'))):
    return parse_decimals([pick(p, ADMIN_VIEW_FIELDS) for p in all_profiles()])


@app.post("/admin/onboarding")
def save_onboarding(payload: OnboardingPayload, user: dict = Depends(require_roles('ADMIN'))):
    role = payload.role.strip().upper()
    if role not in PROVISIONABLE_ROLES:
        raise HTTPException(status_code=400, detail=f"role must be one of {sorted(PROVISIONABLE_ROLES)}")

    name = clean_text(payload.name, 100)
    email = (clean_text(payload.email, 200) or '').lower()
    if not name:
        raise HTTPException(status_code=400, detail="Name is required.")
    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        raise HTTPException(status_code=400, detail="A valid email address is required.")
    if any(str(p.get('email', '')).lower() == email for p in all_profiles()):
        raise HTTPException(status_code=409, detail="That email is already registered.")

    temp_password = generate_temp_password()
    now = now_iso()
    base = {
        "SK": PROFILE_SK,
        "role": role,
        "name": name,
        "email": email,
        "status": "ACTIVE",
        "passwordHash": hash_password(temp_password),
        "mustChangePassword": True,
        "onboardingCompleted": bool(payload.onboardingCompleted),
        "pwdChangedAt": int(time.time()) - 1,
        "createdAt": now,
        "updatedAt": now,
        **baseline_fields(role, payload.model_dump()),
    }

    for _ in range(3):                                  # retry if two admins provision at the same instant
        user_id = next_user_id(role, name)
        try:
            table.put_item(
                Item=to_dynamo({**base, "PK": user_id, "userCode": short_id(user_id)}),
                ConditionExpression='attribute_not_exists(PK)',
            )
            break
        except ClientError as e:
            if error_code(e) != 'ConditionalCheckFailedException':
                raise
    else:
        raise HTTPException(status_code=409, detail="Could not allocate a unique ID, please retry.")

    # The temporary password exists in plain text ONLY in this response. Only its hash is stored.
    return {
        "message": "Provisioned successfully",
        "userId": user_id,
        "userCode": short_id(user_id),
        "tempPassword": temp_password,
        "role": role,
        "name": name,
    }


@app.get("/admin/dashboard/stats")
def get_admin_dashboard(user: dict = Depends(require_roles('ADMIN'))):
    profiles = all_profiles()
    generated_diets = len(scan_all(FilterExpression=Attr('SK').begins_with('DIET#')))
    online = sum(1 for u in profiles if u.get('role') != 'ADMIN' and profile_presence(u)['presence'] == 'ONLINE')
    return {
        "stats": [
            {"label": 'Total Users', "value": str(len(profiles)), "icon": 'Users', "glowColor": 'var(--text-primary)'},
            {"label": 'Active Coaches', "value": str(sum(1 for u in profiles if u.get('role') == 'COACH')), "icon": 'Shield', "glowColor": '#60A5FA'},
            {"label": 'Generated Diets', "value": str(generated_diets), "icon": 'Utensils', "glowColor": 'var(--accent-gold)'},
            {"label": 'Online Now', "value": str(online), "icon": 'Activity', "glowColor": 'var(--accent-green)', "isPulse": True},
        ]
    }


def _age_seconds(iso: Optional[str]) -> Optional[int]:
    dt = parse_iso(iso) if iso else None
    return max(0, int((datetime.now(timezone.utc) - dt).total_seconds())) if dt else None


def _presence(last_seen: Optional[str], ever_logged_in: bool, signed_out: bool = False) -> str:
    """ONLINE (heard from in the last 2.5 min) / TODAY (<24 h) / RECENT (<7 d) / INACTIVE / NEVER (has not signed in yet).
    Someone who pressed Sign Out is never ONLINE, even if their last request was seconds ago."""
    if not ever_logged_in and not last_seen:
        return 'NEVER'
    age = _age_seconds(last_seen)
    if age is None:
        return 'INACTIVE'
    if age <= ONLINE_WINDOW_SECONDS and not signed_out:
        return 'ONLINE'
    if age <= 86400:
        return 'TODAY'
    if age <= 7 * 86400:
        return 'RECENT'
    return 'INACTIVE'


def profile_presence(profile: dict) -> Dict[str, Any]:
    """Presence for one profile, using the same rules as the Monitor (used by chat headers too)."""
    active = profile.get('lastActiveAt') or profile.get('lastLoginAt')
    logout = profile.get('lastLogoutAt')
    signed_out = bool(logout) and (not active or str(active) <= str(logout))
    seen = max([x for x in (profile.get('lastActiveAt'), profile.get('lastLoginAt')) if x], default=None)
    return {
        'presence': _presence(seen, bool(profile.get('lastLoginAt')) or bool(seen), signed_out),
        'lastSeenAt': seen,
        'signedOut': signed_out,
    }


@app.get("/admin/monitor")
def get_admin_monitor(user: dict = Depends(require_roles('ADMIN'))):
    """Live roster for the admin Monitor page: every client and coach with sign-in and activity status."""
    profiles = all_profiles()
    names = {p['PK']: p.get('name') or short_id(p['PK']) for p in profiles}
    # One light pass over the table (only the few fields needed) instead of a query per user.
    rows = scan_all(
        FilterExpression=Attr('SK').begins_with('CHECKIN#') | Attr('SK').begins_with('WORKOUTLOG#')
        | Attr('SK').begins_with('SCHEDULE#') | Attr('SK').begins_with('TEMPLATE#') | Attr('SK').begins_with('3DAY')
        | Attr('SK').begins_with('HEALTH#') | Attr('SK').begins_with('MSG#'),
        ProjectionExpression='PK, SK, steps, completedAt, #st, sender',
        ExpressionAttributeNames={'#st': 'status'},
    )
    per: Dict[str, Dict[str, Any]] = {}

    def bucket_for(pk: str) -> Dict[str, Any]:
        return per.setdefault(pk, {'checkins': [], 'workouts': [], 'workoutStamps': [], 'schedules': 0,
                                   'templates': 0, 'threeDay': 0, 'health': {}, 'messagesSent': 0})

    for r in rows:
        bucket = bucket_for(r['PK'])
        kind, _, rest = r['SK'].partition('#')
        if kind == 'CHECKIN':
            bucket['checkins'].append(rest)
        elif kind == 'WORKOUTLOG':
            bucket['workouts'].append(rest.split('#', 1)[0])
            if r.get('completedAt'):
                bucket['workoutStamps'].append(r['completedAt'])
        elif kind == 'SCHEDULE':
            if r.get('status', 'ACTIVE') == 'ACTIVE':          # a cancelled plan is not an assigned plan
                bucket['schedules'] += 1
        elif kind == 'TEMPLATE':
            bucket['templates'] += 1
        elif kind.startswith('3DAY'):
            bucket['threeDay'] += 1
        elif kind == 'HEALTH':
            bucket['health'][rest] = r.get('steps')
        elif kind == 'MSG':
            if r.get('sender') == 'CLIENT':
                bucket['messagesSent'] += 1

    events: List[dict] = []
    now_ts = int(time.time())
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    week_ago = (datetime.now(timezone.utc) - timedelta(days=6)).strftime('%Y-%m-%d')
    clients, coaches = [], []
    summary = {'totalClients': 0, 'totalCoaches': 0, 'onlineNow': 0, 'activeToday': 0, 'neverSignedIn': 0,
               'inactive7d': 0, 'unassignedClients': 0, 'lockedAccounts': 0, 'disabledAccounts': 0}

    def base(p: dict, b: dict) -> dict:
        last_checkin = max(b['checkins']) if b['checkins'] else None
        last_workout = max(b['workouts']) if b['workouts'] else None
        pres = profile_presence(p)
        seen = [x for x in (pres['lastSeenAt'], last_checkin) if x]
        last_seen = max(seen) if seen else None
        ever = bool(p.get('lastLoginAt')) or bool(last_seen)
        presence = _presence(last_seen, ever, pres['signedOut'] and last_seen == pres['lastSeenAt'])
        locked = int(p.get('lockedUntil', 0) or 0) > now_ts
        disabled = p.get('status') == 'INACTIVE'
        summary['onlineNow'] += presence == 'ONLINE'
        summary['activeToday'] += presence in ('ONLINE', 'TODAY')
        summary['neverSignedIn'] += presence == 'NEVER'
        summary['inactive7d'] += presence == 'INACTIVE'
        summary['lockedAccounts'] += locked
        summary['disabledAccounts'] += disabled
        for ts, kind in ((p.get('lastLoginAt'), 'login'), (last_checkin, 'checkin')):
            if ts:
                events.append({'type': kind, 'userId': short_id(p['PK']), 'name': p.get('name') or '', 'role': p.get('role'), 'at': ts})
        return {
            'id': short_id(p['PK']), 'pk': p['PK'], 'name': p.get('name') or 'Unnamed',
            'email': p.get('email', ''), 'role': p.get('role'),
            'accountStatus': 'DISABLED' if disabled else 'LOCKED' if locked else 'ACTIVE',
            'presence': presence, 'lastSeenAt': last_seen, 'signedOut': pres['signedOut'],
            'lastLoginAt': p.get('lastLoginAt'), 'lastLogoutAt': p.get('lastLogoutAt'),
            'loginCount': int(p.get('loginCount', 0) or 0),
            'createdAt': p.get('createdAt'), 'pendingFirstLogin': bool(p.get('mustChangePassword')),
            'lastCheckInAt': last_checkin, 'lastWorkoutDate': last_workout,
        }

    empty = {'checkins': [], 'workouts': [], 'workoutStamps': [], 'schedules': 0, 'templates': 0,
             'threeDay': 0, 'health': {}, 'messagesSent': 0}
    coach_clients_map: Dict[str, List[dict]] = {}
    for p in profiles:
        b = per.get(p['PK'], empty)
        role = p.get('role')
        if role == 'CLIENT':
            row = base(p, b)
            coach_ref = p.get('coachId') or ''
            coach_pk = make_pk('COACH', coach_ref) if coach_ref else ''
            steps_today = b['health'].get(today)
            row.update({
                'coachId': short_id(coach_pk) if coach_pk else None,
                'coachName': names.get(coach_pk) if coach_pk else None,
                'workoutsThisWeek': len({d for d in b['workouts'] if d >= week_ago}),
                'checkinsTotal': len(b['checkins']),
                'plansAssigned': b['schedules'],
                'threeDayEntries': b['threeDay'],
                'onboardingCompleted': bool(p.get('onboardingCompleted', False)),
                'stepsToday': steps_today,
                'messagesSent': b['messagesSent'],
            })
            summary['totalClients'] += 1
            summary['unassignedClients'] += 0 if coach_pk else 1
            clients.append(row)
            if coach_pk:
                coach_clients_map.setdefault(coach_pk, []).append(row)
        elif role == 'COACH':
            coaches.append((p, b))
            summary['totalCoaches'] += 1

    coach_rows = []
    for p, b in coaches:
        row = base(p, b)
        mine = coach_clients_map.get(p['PK'], [])
        row.update({
            'clientCount': len(mine),
            'clientsOnlineNow': sum(1 for c in mine if c['presence'] == 'ONLINE'),
            'clientsNeedingAttention': sum(1 for c in mine if c['presence'] in ('INACTIVE', 'NEVER')),
            'templates': b['templates'],
            'specialization': p.get('specialization', ''),
        })
        coach_rows.append(row)

    # Workout events use the real completion time (not just the date) so they sort correctly with logins and check-ins.
    for p in profiles:
        if p.get('role') != 'CLIENT':
            continue
        stamps = per.get(p['PK'], empty)['workoutStamps']
        if stamps:
            events.append({'type': 'workout', 'userId': short_id(p['PK']), 'name': p.get('name') or '',
                           'role': 'CLIENT', 'at': max(stamps)})
    events.sort(key=lambda e: e['at'], reverse=True)

    clients.sort(key=lambda c: (c['lastSeenAt'] or ''), reverse=True)
    coach_rows.sort(key=lambda c: (c['lastSeenAt'] or ''), reverse=True)
    return parse_decimals({
        'generatedAt': now_iso(),
        'summary': summary,
        'clients': clients,
        'coaches': coach_rows,
        'recentEvents': events[:25],
    })


@app.get("/admin/system-status")
def get_system_status(user: dict = Depends(require_roles('ADMIN'))):
    profiles = all_profiles()
    return {
        "users": len(profiles),
        "coaches": sum(1 for u in profiles if u.get('role') == 'COACH'),
        "clients": sum(1 for u in profiles if u.get('role') == 'CLIENT'),
        "status": "ok",
    }


@app.delete("/admin/users/{userId}")
def delete_user(userId: str, user: dict = Depends(require_roles('ADMIN'))):
    pk = unquote(userId)
    if '#' not in pk:
        raise HTTPException(status_code=400, detail="userId must be a full key such as CLIENT#CLS001")
    if pk.startswith('ADMIN#'):
        raise HTTPException(status_code=403, detail="Admin accounts cannot be deleted from here.")
    try:
        table.delete_item(
            Key={'PK': pk, 'SK': PROFILE_SK},
            ConditionExpression='attribute_exists(PK)',
        )
    except ClientError as e:
        if error_code(e) == 'ConditionalCheckFailedException':
            raise HTTPException(status_code=404, detail="User not found.")
        raise
    return {"message": f"User {pk} deleted successfully"}


class AdminUserUpdatePayload(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    age: Optional[float] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    activityLevel: Optional[str] = None
    primaryGoal: Optional[str] = None
    medicalNotes: Optional[str] = None
    specialization: Optional[str] = None


@app.put("/admin/users/{userId}")
def update_user(userId: str, payload: AdminUserUpdatePayload, user: dict = Depends(require_roles('ADMIN'))):
    """Admin-only user edit. Role and userCode remain immutable here."""
    pk = unquote(userId).strip()
    if '#' not in pk:
        raise HTTPException(status_code=400, detail="userId must be a full key such as CLIENT#CLS001")
    profile = get_profile(pk)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found.")
    if profile.get('role') == 'ADMIN':
        raise HTTPException(status_code=403, detail="Admin accounts cannot be edited from here.")

    data = payload.model_dump(exclude_unset=True)
    updates: Dict[str, Any] = {}

    if 'name' in data:
        name = clean_text(data.get('name'), 100)
        if not name:
            raise HTTPException(status_code=400, detail="Name is required.")
        updates['name'] = name

    if 'email' in data:
        email = (clean_text(data.get('email'), 200) or '').lower()
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
            raise HTTPException(status_code=400, detail="A valid email address is required.")
        if any(str(p.get('PK')) != pk and str(p.get('email', '')).lower() == email for p in all_profiles()):
            raise HTTPException(status_code=409, detail="That email is already registered.")
        updates['email'] = email

    if 'status' in data:
        status = str(data.get('status') or '').strip().upper()
        if status not in {'ACTIVE', 'INACTIVE'}:
            raise HTTPException(status_code=400, detail="Status must be ACTIVE or INACTIVE.")
        updates['status'] = status

    baseline = baseline_fields(profile.get('role', 'CLIENT'), data)
    updates.update(baseline)

    if not updates:
        raise HTTPException(status_code=400, detail="No changes provided.")

    updates['updatedAt'] = now_iso()
    updates = to_dynamo(updates)
    names = {f"#f{i}": k for i, k in enumerate(updates)}
    values = {f":v{i}": v for i, v in enumerate(updates.values())}
    expression = "SET " + ", ".join(f"#f{i} = :v{i}" for i in range(len(updates)))

    table.update_item(
        Key={'PK': pk, 'SK': PROFILE_SK},
        UpdateExpression=expression,
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
    )

    fresh = get_profile(pk)
    return {"message": "User updated successfully", "user": pick(fresh or {}, ADMIN_VIEW_FIELDS)}


@app.post("/admin/users/{userId}/reset-password")
def reset_user_password(userId: str, user: dict = Depends(require_roles('ADMIN'))):
    """Generate a new temporary password, require change on next login, and revoke old sessions."""
    pk = unquote(userId).strip()
    if '#' not in pk:
        raise HTTPException(status_code=400, detail="userId must be a full key such as CLIENT#CLS001")
    profile = get_profile(pk)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found.")
    if profile.get('role') == 'ADMIN':
        raise HTTPException(status_code=403, detail="Admin passwords cannot be reset from here.")

    temp_password = generate_temp_password()
    table.update_item(
        Key={'PK': pk, 'SK': PROFILE_SK},
        UpdateExpression=(
            "SET passwordHash = :h, mustChangePassword = :m, "
            "pwdChangedAt = :p, failedAttempts = :f, lockedUntil = :l, updatedAt = :u"
        ),
        ExpressionAttributeValues={
            ':h': hash_password(temp_password),
            ':m': True,
            ':p': int(time.time()) - 1,
            ':f': 0,
            ':l': 0,
            ':u': now_iso(),
        },
    )

    return {
        "message": "Temporary password generated successfully.",
        "userId": pk,
        "userCode": short_id(pk),
        "tempPassword": temp_password,
    }


@app.put("/admin/users/{clientId}/assign")
def assign_coach(clientId: str, payload: AssignPayload, user: dict = Depends(require_roles('ADMIN'))):
    client_pk = make_pk('CLIENT', clientId)
    coach_pk = make_pk('COACH', payload.coachId)

    coach = get_profile(coach_pk)
    if not coach or coach.get('role') != 'COACH':
        raise HTTPException(status_code=404, detail="Coach not found.")
    client = get_profile(client_pk)
    if not client or client.get('role') != 'CLIENT':
        raise HTTPException(status_code=404, detail="Client not found.")

    previous = client.get('coachId')
    if previous and make_pk('COACH', previous) != coach_pk:
        # the former coach no longer sees this client in their inbox
        table.delete_item(Key={'PK': make_pk('COACH', previous), 'SK': inbox_sk(client_pk)})

    response = table.update_item(
        Key={'PK': client_pk, 'SK': PROFILE_SK},
        UpdateExpression="SET coachId = :c, updatedAt = :u",
        ExpressionAttributeValues={':c': coach_pk, ':u': now_iso()},
        ReturnValues="UPDATED_NEW",
    )
    return {"message": "Coach assigned successfully", "updated": parse_decimals(response.get('Attributes'))}


# ------------------------------- coach -------------------------------------
# NOTE: the /coach/templates/... routes are declared before /coach/{coachId}/... on purpose.
def template_owner(user: dict, coach_id: Optional[str]) -> Optional[str]:
    """Coaches are always pinned to their own templates; admins may name a coach (or search all)."""
    if user['role'] == 'COACH':
        return user['pk']
    return make_pk('COACH', coach_id) if coach_id else None


@app.get("/coach/templates/{templateId}")
def get_template(templateId: str, coachId: Optional[str] = None, user: dict = Depends(require_roles('COACH', 'ADMIN'))):
    item = find_template(templateId, template_owner(user, coachId))
    if not item:
        raise HTTPException(status_code=404, detail="Template not found.")
    return template_out(item)


@app.put("/coach/templates/{templateId}")
def update_template(templateId: str, payload: TemplatePayload, coachId: Optional[str] = None,
                    user: dict = Depends(require_roles('COACH', 'ADMIN'))):
    item = find_template(templateId, template_owner(user, coachId))
    if not item:
        raise HTTPException(status_code=404, detail="Template not found.")

    changes = payload.model_dump(exclude_unset=True)
    for key, limit in (('title', 100), ('description', 500), ('goal', 50), ('workoutDays', 50), ('activities', 50)):
        if key in changes:
            changes[key] = clean_text(changes[key], limit)
    for key, limit in (('level', 50), ('estimatedDuration', 50), ('equipment', 200)):
        if key in changes:
            changes[key] = clean_text(changes[key], limit)
    if 'referenceImageKey' in changes:
        changes['referenceImageKey'] = clean_reference_key(item['PK'], changes['referenceImageKey'])
    if 'exercises' in changes:
        changes['exercises'] = clean_exercises(changes['exercises'])

    item.update(to_dynamo(changes))
    if changes.get('exercises') is not None and 'activities' not in changes:
        item['activities'] = f"{len(changes['exercises'])} Exercises"
    item['updatedAt'] = now_iso()
    table.put_item(Item=item)
    return template_out(item)


@app.get("/coach/{coachId}/templates")
def get_coach_templates(coachId: str, user: dict = Depends(require_roles('COACH', 'ADMIN'))):
    coach_pk = make_pk('COACH', coachId)
    authorize_coach_scope(user, coach_pk)
    items = query_all(KeyConditionExpression=Key('PK').eq(coach_pk) & Key('SK').begins_with('TEMPLATE#'))
    return {"templates": [template_out(i) for i in items]}


def build_template_item(coach_pk: str, data: dict) -> dict:
    """Validate form/import data and build the DynamoDB item for a new template."""
    exercises = clean_exercises(data.get('exercises')) or []
    now = now_iso()
    return to_dynamo({
        "PK": coach_pk,
        "SK": f"TEMPLATE#tpl_{uuid.uuid4().hex[:8]}",
        "type": "TEMPLATE",
        "title": clean_text(data.get('title'), 100) or 'Untitled Template',
        "description": clean_text(data.get('description'), 500) or '',
        "goal": clean_text(data.get('goal'), 50) or 'Maintenance',
        "workoutDays": clean_text(data.get('workoutDays'), 50) or '',
        "activities": clean_text(data.get('activities'), 50) or f"{len(exercises)} Exercises",
        "exercises": exercises,
        "level": clean_text(data.get('level'), 50) or '',
        "estimatedDuration": clean_text(data.get('estimatedDuration'), 50) or '',
        "equipment": clean_text(data.get('equipment'), 200) or '',
        "referenceImageKey": clean_reference_key(coach_pk, data.get('referenceImageKey')),
        "createdAt": now,
        "updatedAt": now,
    })


@app.post("/coach/{coachId}/templates")
def create_template(coachId: str, payload: TemplatePayload, user: dict = Depends(require_roles('COACH', 'ADMIN'))):
    coach_pk = make_pk('COACH', coachId)
    authorize_coach_scope(user, coach_pk)
    item = build_template_item(coach_pk, payload.model_dump(exclude_unset=True))
    table.put_item(Item=item)
    return template_out(item)


# ---- bulk import of templates from JSON files ----
# Field names other tools / spreadsheets commonly use, mapped to the ones the app stores.
_TEMPLATE_KEYS = {
    'title': ('title', 'name', 'program', 'plan', 'template'),
    'description': ('description', 'summary', 'overview', 'about'),
    'goal': ('goal', 'objective', 'focus'),
    'level': ('level', 'difficulty', 'experience'),
    'workoutDays': ('workoutdays', 'workout_days', 'days', 'schedule', 'weekdays'),
    'estimatedDuration': ('estimatedduration', 'estimated_duration', 'duration', 'time'),
    'equipment': ('equipment', 'gear'),
}
_EXERCISE_KEYS = {
    'name': ('name', 'exercise', 'exercise_name', 'movement', 'title'),
    'sets': ('sets', 'set', 'num_sets'),
    'reps': ('reps', 'rep', 'repetitions', 'reps_time', 'reps/time', 'time'),
    'rest': ('rest', 'rest_time', 'rest_period'),
    'tempo': ('tempo',),
    'weight': ('weight', 'load'),
    'rpe': ('rpe',),
    'notes': ('notes', 'note', 'cues', 'instructions', 'comments', 'coach_notes'),
    'section': ('section', 'block', 'group', 'phase'),
    'type': ('type', 'category', 'kind'),
}


def _pick_value(source: dict, names: tuple) -> str:
    lowered = {str(k).strip().lower(): v for k, v in source.items()}
    for name in names:
        value = lowered.get(name)
        if value is None or value == '' or value == []:
            continue
        if isinstance(value, (list, tuple)):
            value = ' / '.join(str(v).strip() for v in value if str(v).strip())
        return str(value).strip()
    return ''


def normalize_import_template(raw: Any) -> tuple:
    """One imported JSON object -> (clean template data, warnings).  Raises ValueError with a readable reason.
    Over-long text is shortened rather than rejected, so a good file is not refused over one long note."""
    if not isinstance(raw, dict):
        raise ValueError("Not a template object.")
    lowered = {str(k).strip().lower(): v for k, v in raw.items()}
    rows = next((lowered[k] for k in ('exercises', 'workout', 'movements', 'items') if isinstance(lowered.get(k), list)), None)
    if not rows:
        raise ValueError("No exercises found.")
    warnings: List[str] = []
    limits = {'title': 100, 'description': 500, 'goal': 50, 'level': 50, 'workoutDays': 50, 'estimatedDuration': 50, 'equipment': 200}
    data: Dict[str, Any] = {key: _pick_value(raw, names)[:limits[key]] for key, names in _TEMPLATE_KEYS.items()}
    ex_limits = {'name': 150, 'sets': 100, 'reps': 100, 'rest': 100, 'tempo': 100, 'weight': 100, 'rpe': 100,
                 'notes': 500, 'section': 100, 'type': 100}
    exercises = []
    for index, row in enumerate(rows, start=1):
        if not isinstance(row, dict):
            warnings.append(f"Row {index} skipped (not an object).")
            continue
        ex = {key: _pick_value(row, names)[:ex_limits[key]] for key, names in _EXERCISE_KEYS.items()}
        if not ex['name']:
            warnings.append(f"Row {index} skipped (no exercise name).")
            continue
        exercises.append(ex)
    if not exercises:
        raise ValueError("No exercises with a name found.")
    if len(exercises) > 100:
        warnings.append("Only the first 100 exercises were kept.")
        exercises = exercises[:100]
    for i, ex in enumerate(exercises, start=1):
        ex['order'] = str(i)
        ex['id'] = str(i)
    data['exercises'] = exercises
    data['activities'] = f"{len(exercises)} Exercises"
    return data, warnings


@app.post("/coach/{coachId}/templates/import")
def import_templates(coachId: str, payload: ImportTemplatesPayload,
                     user: dict = Depends(require_roles('COACH', 'ADMIN'))):
    """Create several templates at once from parsed JSON. Each is checked on its own: a bad one is
    reported back and skipped, the good ones are still saved."""
    coach_pk = make_pk('COACH', coachId)
    authorize_coach_scope(user, coach_pk)
    if not payload.templates:
        raise HTTPException(status_code=400, detail="The file contains no templates.")
    if len(payload.templates) > IMPORT_MAX_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Import at most {IMPORT_MAX_TEMPLATES} templates at a time.")

    created, skipped = [], []
    for index, raw in enumerate(payload.templates, start=1):
        label = _pick_value(raw, _TEMPLATE_KEYS['title']) if isinstance(raw, dict) else ''
        try:
            data, warnings = normalize_import_template(raw)
            item = build_template_item(coach_pk, data)
            table.put_item(Item=item)
            created.append({**template_out(item), 'warnings': warnings})
        except ValueError as exc:
            skipped.append({'index': index, 'title': label or f"Template {index}", 'reason': str(exc)})
        except HTTPException as exc:
            skipped.append({'index': index, 'title': label or f"Template {index}", 'reason': str(exc.detail)})
    return {"created": created, "skipped": skipped}


@app.get("/coach/{coachId}/clients")
def get_coach_clients(coachId: str, user: dict = Depends(require_roles('COACH', 'ADMIN'))):
    coach_pk = make_pk('COACH', coachId)
    authorize_coach_scope(user, coach_pk)
    inbox = {r['SK']: r for r in query_all(KeyConditionExpression=Key('PK').eq(coach_pk) & Key('SK').begins_with('INBOX#'))}
    rows = []
    for p in coach_clients(coach_pk):
        row = summarize_client(p, with_health=True)[0]
        row['unreadMessages'] = int(inbox.get(inbox_sk(p['PK']), {}).get('unread', 0) or 0)
        rows.append(row)
    rows.sort(key=lambda r: r['name'].lower())
    return parse_decimals({"clients": rows})


@app.get("/coach/{coachId}/dashboard")
def get_coach_dashboard(coachId: str, user: dict = Depends(require_roles('COACH', 'ADMIN'))):
    """Coach overview. Every number comes from what clients actually recorded in the last 7 days:
    check-ins (adherence), daily health snapshots (steps / sleep / water) and workout logs."""
    coach_pk = make_pk('COACH', coachId)
    authorize_coach_scope(user, coach_pk)

    clients = coach_clients(coach_pk)
    today = utc_today()
    days = date_window(today, 7)
    window_end = (datetime.strptime(today, '%Y-%m-%d').date() + timedelta(days=1)).isoformat()

    total = len(clients)
    checked_in = 0
    adherence_scores: List[int] = []
    step_pcts: List[int] = []
    step_values: List[float] = []
    sleep_pcts: List[int] = []
    water_pcts: List[int] = []
    planned_total = done_total = 0
    day_steps: Dict[str, List[int]] = {d: [] for d in days}
    day_work: Dict[str, Dict[str, int]] = {d: {'planned': 0, 'done': 0} for d in days}
    roster: List[dict] = []
    events: List[dict] = []
    online_now = 0

    for profile in clients:
        row, meta = summarize_client(profile)
        pk = profile['PK']
        if meta['days'] is not None and meta['days'] <= 7:
            checked_in += 1
        for c in latest_checkins(pk, 7):
            s = adherence_score(c.get('adherence'))
            if s is not None:
                adherence_scores.append(s)

        health = health_range(pk, days[0], window_end)
        for d, item in health.items():
            if item.get('steps') is not None:
                p = pct_of(item['steps'], STEP_GOAL)
                if p is not None:
                    step_pcts.append(p)
                    step_values.append(float(item['steps']))
                    if d in day_steps:
                        day_steps[d].append(p)
            if item.get('sleepHours') is not None:
                p = pct_of(item['sleepHours'], SLEEP_GOAL)
                if p is not None:
                    sleep_pcts.append(p)
            if item.get('hydration') is not None:
                p = pct_of(item['hydration'], HYDRATION_GOAL)
                if p is not None:
                    water_pcts.append(p)

        schedules = [i for i in query_all(KeyConditionExpression=Key('PK').eq(pk) & Key('SK').begins_with('SCHEDULE#'))
                     if i.get('status', 'ACTIVE') == 'ACTIVE']
        logs = {i['SK']: i for i in query_all(KeyConditionExpression=Key('PK').eq(pk) & Key('SK').begins_with('WORKOUTLOG#'))}
        wk = workout_summary(schedules, logs, today)
        planned_total += wk['planned']
        done_total += wk['done']
        for w in wk['week']:
            if w['date'] in day_work:
                day_work[w['date']]['planned'] += w['planned']
                day_work[w['date']]['done'] += w['done']
        for log in logs.values():
            if log.get('completedAt'):
                events.append({'ts': log['completedAt'], 'client': row['name'], 'id': row['id'],
                               'action': 'Completed a workout', 'status': 'completed'})

        pres = profile_presence(profile)
        online_now += pres['presence'] == 'ONLINE'
        h_day = max(health) if health else None
        h_item = health.get(h_day, {}) if h_day else {}
        sevens = [float(health[d]['steps']) for d in days if d in health and health[d].get('steps') is not None]
        roster.append({
            **row,
            'presence': pres['presence'],
            'lastSeenAt': pres['lastSeenAt'],
            'stepsToday': h_item.get('steps'),
            'stepsDate': h_day,
            'stepsAvg7d': round(sum(sevens) / len(sevens)) if sevens else None,
            'sleepHours': h_item.get('sleepHours'),
            'hydration': h_item.get('hydration'),
            'workoutsDone7d': wk['done'],
            'workoutsPlanned7d': wk['planned'],
            'workoutCompletion': wk['completion'],
        })
        if meta['lastTs']:
            weight = f" • {parse_decimals(meta['weight'])} kg" if meta['weight'] is not None else ''
            events.append({'ts': meta['lastTs'], 'client': row['name'], 'id': row['id'],
                           'action': f"Submitted weekly check-in{weight}",
                           'status': 'completed' if (meta['latestScore'] or 0) >= 75 else 'alert'})

    def avg(values: List[int]) -> Optional[int]:
        return round(sum(values) / len(values)) if values else None

    active = sum(1 for p in clients if p.get('status', 'ACTIVE') != 'INACTIVE')
    retention = f"{round(100 * active / total)}%" if total else '0%'
    workout_completion = round(100 * done_total / planned_total) if planned_total else None
    sleep_consistency = avg(sleep_pcts)
    hydration = avg(water_pcts)
    adherence = avg(adherence_scores)
    steps_pct = avg(step_pcts)
    avg_steps = round(sum(step_values) / len(step_values)) if step_values else None

    weekly = []
    for d in days:
        w = day_work[d]
        weekly.append({
            'date': d,
            'stepsPct': avg(day_steps[d]),
            'workoutPct': round(100 * w['done'] / w['planned']) if w['planned'] else None,
        })

    events.sort(key=lambda e: e['ts'], reverse=True)
    activity = [{"id": f"{e['id']}-{i}", "client": e['client'], "action": e['action'], "status": e['status'],
                 "time": time_ago(e['ts'])} for i, e in enumerate(events[:10])]
    roster.sort(key=lambda r: (0 if r['status'] == 'needs-attention' else 1, r['name'].lower()))

    def stat(label: str, value: Any, icon: str, color: str) -> dict:
        return {"label": label, "name": label, "value": value, "icon": icon, "glowColor": color}

    return parse_decimals({
        "stats": [
            stat("Active Clients", str(total), "Users", "#4facfe"),
            stat("Weekly Check-ins", f"{checked_in}/{total}", "CheckCircle2", "#E5B869"),
            stat("Client Retention", retention, "TrendingUp", "#00E27B"),
            stat("Workout Completion", workout_completion, "Dumbbell", "#5B8CFF"),
            stat("Sleep Consistency", sleep_consistency, "Moon", "#8B7CFF"),
            stat("Hydration", hydration, "Droplets", "#55B7FF"),
            stat("Adherence", adherence, "Activity", "#62C7A5"),
            stat("Steps", steps_pct, "Footprints", "#A08CFF"),
        ],
        "summary": {
            "activeClients": total,
            "onlineNow": online_now,
            "workoutCompletion": workout_completion,
            "sleepConsistency": sleep_consistency,
            "hydration": hydration,
            "adherence": adherence,
            "stepsPct": steps_pct,
            "avgSteps": avg_steps,
            "stepGoal": STEP_GOAL,
        },
        "weekly": weekly,
        "clients": roster,
        "recentActivity": activity,
    })


# ------------------------------- messaging ---------------------------------
# One conversation per client, between that client and the coach they are assigned to.
# Admins are deliberately NOT part of conversations (coach/client chats are private).
class MessagePayload(BaseModel):
    text: str
    clientMsgId: Optional[str] = None


THREAD_META_SK = 'THREAD#META'


def inbox_sk(client_pk: str) -> str:
    return f"INBOX#{short_id(client_pk)}"


def thread_access(user: dict, client_id: str):
    """Resolve a conversation and make sure the caller belongs to it.
    Returns (client_pk, client_profile, coach_pk or None)."""
    client_pk = make_pk('CLIENT', client_id)
    if user['role'] not in ('CLIENT', 'COACH'):
        raise HTTPException(status_code=403, detail="You do not have access to this conversation.")
    if user['role'] == 'CLIENT' and user['pk'] != client_pk:
        raise HTTPException(status_code=403, detail="You do not have access to this conversation.")
    client = get_profile(client_pk)
    if not client or client.get('role') != 'CLIENT':
        raise HTTPException(status_code=404, detail="Conversation not found.")
    coach_ref = client.get('coachId')
    coach_pk = make_pk('COACH', coach_ref) if coach_ref else None
    if user['role'] == 'COACH' and coach_pk != user['pk']:
        raise HTTPException(status_code=403, detail="You do not have access to this conversation.")
    return client_pk, client, coach_pk


def message_out(item: dict, viewer_role: str) -> dict:
    return {
        'id': item['SK'],
        'clientMsgId': item.get('clientMsgId') or None,
        'sender': item.get('sender'),
        'senderName': item.get('senderName', ''),
        'text': item.get('text', ''),
        'createdAt': item.get('createdAt', ''),
        'mine': item.get('sender') == viewer_role,
    }


def unread_message_count(user: dict) -> int:
    """Unread messages for the navigation badge. Never allowed to break the request it rides on."""
    try:
        if user['role'] == 'CLIENT':
            meta = table.get_item(Key={'PK': user['pk'], 'SK': THREAD_META_SK}).get('Item') or {}
            return int(meta.get('clientUnread', 0) or 0)
        if user['role'] == 'COACH':
            rows = query_all(KeyConditionExpression=Key('PK').eq(user['pk']) & Key('SK').begins_with('INBOX#'))
            return sum(int(r.get('unread', 0) or 0) for r in rows)
    except Exception:
        logger.warning('could not count unread messages for %s', user.get('pk'))
    return 0


def peer_summary(profile: Optional[dict], role: str) -> Optional[dict]:
    if not profile:
        return None
    return {'id': short_id(profile['PK']), 'name': profile.get('name') or 'Unnamed', 'role': role,
            **profile_presence(profile)}


@app.get("/messages/threads")
def list_threads(user: dict = Depends(require_roles('CLIENT', 'COACH'))):
    """CLIENT: their single conversation with their coach.  COACH: one row per assigned client, newest first."""
    if user['role'] == 'CLIENT':
        client = get_profile(user['pk']) or {}
        coach_ref = client.get('coachId')
        coach = get_profile(make_pk('COACH', coach_ref)) if coach_ref else None
        meta = table.get_item(Key={'PK': user['pk'], 'SK': THREAD_META_SK}).get('Item') or {}
        last = latest_message(user['pk'])
        return parse_decimals({'threads': [{
            'clientId': short_id(user['pk']),
            'peer': peer_summary(coach, 'COACH'),
            'unread': int(meta.get('clientUnread', 0) or 0),
            'lastMessageAt': last.get('createdAt') if last else None,
            'lastMessageText': (last or {}).get('text', '')[:140],
            'lastSender': (last or {}).get('sender'),
        }]})

    inbox = {r['SK']: r for r in query_all(KeyConditionExpression=Key('PK').eq(user['pk']) & Key('SK').begins_with('INBOX#'))}
    rows = []
    for p in coach_clients(user['pk']):
        box = inbox.get(inbox_sk(p['PK']), {})
        rows.append({
            'clientId': short_id(p['PK']),
            'peer': peer_summary(p, 'CLIENT'),
            'unread': int(box.get('unread', 0) or 0),
            'lastMessageAt': box.get('lastMessageAt'),
            'lastMessageText': box.get('lastMessageText', ''),
            'lastSender': box.get('lastSender'),
        })
    rows.sort(key=lambda r: ((r['lastMessageAt'] or ''), (r['peer'] or {}).get('name', '').lower()), reverse=True)
    return parse_decimals({'threads': rows})


def latest_message(client_pk: str) -> Optional[dict]:
    resp = table.query(KeyConditionExpression=Key('PK').eq(client_pk) & Key('SK').begins_with('MSG#'),
                       ScanIndexForward=False, Limit=1)
    items = resp.get('Items', [])
    return items[0] if items else None


def mark_thread_read(role: str, client_pk: str, ts: str) -> None:
    """Reset the reader's unread counter and move their read-marker (drives the 'Seen' tick)."""
    if role == 'CLIENT':
        table.update_item(Key={'PK': client_pk, 'SK': THREAD_META_SK},
                          UpdateExpression="SET clientUnread = :z, lastClientReadAt = :t",
                          ExpressionAttributeValues={':z': 0, ':t': ts})
    else:
        table.update_item(Key={'PK': client_pk, 'SK': THREAD_META_SK},
                          UpdateExpression="SET lastCoachReadAt = :t",
                          ExpressionAttributeValues={':t': ts})


@app.get("/messages/{clientId}")
def get_messages(clientId: str, after: Optional[str] = None, before: Optional[str] = None,
                 limit: int = 60, markRead: bool = True,
                 user: dict = Depends(require_roles('CLIENT', 'COACH'))):
    """Messages of one conversation, oldest first.
    default: the latest `limit`;  after=<createdAt>: only newer ones (used for polling);  before=<createdAt>: older page."""
    client_pk, client, coach_pk = thread_access(user, clientId)
    limit = max(1, min(int(limit), 100))
    has_more = False
    if after:
        if not parse_iso(after):
            raise HTTPException(status_code=400, detail="Invalid 'after' value.")
        items = table.query(KeyConditionExpression=Key('PK').eq(client_pk) & Key('SK').between(f"MSG#{after}", "MSG#~"),
                            Limit=200).get('Items', [])
    else:
        if before:
            if not parse_iso(before):
                raise HTTPException(status_code=400, detail="Invalid 'before' value.")
            cond = Key('PK').eq(client_pk) & Key('SK').between("MSG#", f"MSG#{before}")
        else:
            cond = Key('PK').eq(client_pk) & Key('SK').begins_with('MSG#')
        items = table.query(KeyConditionExpression=cond, ScanIndexForward=False, Limit=limit + 1).get('Items', [])
        has_more = len(items) > limit
        items = list(reversed(items[:limit]))

    meta = table.get_item(Key={'PK': client_pk, 'SK': THREAD_META_SK}).get('Item') or {}
    viewer = user['role']
    if markRead:
        try:
            if viewer == 'CLIENT':
                if int(meta.get('clientUnread', 0) or 0) > 0:
                    mark_thread_read('CLIENT', client_pk, now_iso())
            else:
                box = table.get_item(Key={'PK': user['pk'], 'SK': inbox_sk(client_pk)}).get('Item') or {}
                if int(box.get('unread', 0) or 0) > 0:
                    table.update_item(Key={'PK': user['pk'], 'SK': inbox_sk(client_pk)},
                                      UpdateExpression="SET unread = :z", ExpressionAttributeValues={':z': 0})
                    mark_thread_read('COACH', client_pk, now_iso())
        except Exception:
            logger.warning('could not mark thread read for %s', user['pk'])

    if viewer == 'CLIENT':
        peer = peer_summary(get_profile(coach_pk) if coach_pk else None, 'COACH')
        peer_read = meta.get('lastCoachReadAt')
    else:
        peer = peer_summary(client, 'CLIENT')
        peer_read = meta.get('lastClientReadAt')
    return parse_decimals({
        'messages': [message_out(i, viewer) for i in items],
        'peer': peer,
        'peerLastReadAt': peer_read,
        'hasMore': has_more,
        'canSend': bool(coach_pk),
        'serverTime': now_iso(),
    })


@app.post("/messages/{clientId}")
def send_message(clientId: str, payload: MessagePayload, user: dict = Depends(require_roles('CLIENT', 'COACH'))):
    client_pk, client, coach_pk = thread_access(user, clientId)
    if not coach_pk:
        raise HTTPException(status_code=409, detail="You do not have a coach assigned yet.")
    text = (payload.text or '').strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(text) > MESSAGE_MAX_LENGTH:
        raise HTTPException(status_code=400, detail=f"Message is too long (max {MESSAGE_MAX_LENGTH} characters).")

    ts = now_iso()
    sender = user['role']
    item = to_dynamo({
        'PK': client_pk,
        'SK': f"MSG#{ts}#{uuid.uuid4().hex[:6]}",
        'type': 'MESSAGE',
        'sender': sender,
        'senderPk': user['pk'],
        'senderName': user.get('name') or '',
        'coachId': coach_pk,
        'text': text,
        'clientMsgId': clean_text(payload.clientMsgId, 64) or None,
        'createdAt': ts,
    })
    table.put_item(Item=item)

    preview = text[:140]
    box_key = {'PK': coach_pk, 'SK': inbox_sk(client_pk)}
    box_values = {':c': short_id(client_pk), ':n': client.get('name') or '', ':t': ts, ':x': preview, ':s': sender}
    if sender == 'CLIENT':
        table.update_item(Key={'PK': client_pk, 'SK': THREAD_META_SK},
                          UpdateExpression="SET lastMessageAt = :t, lastClientReadAt = :t, clientUnread = :z",
                          ExpressionAttributeValues={':t': ts, ':z': 0})
        table.update_item(Key=box_key,
                          UpdateExpression="SET clientId = :c, clientName = :n, lastMessageAt = :t, lastMessageText = :x, lastSender = :s ADD unread :one",
                          ExpressionAttributeValues={**box_values, ':one': 1})
    else:
        table.update_item(Key={'PK': client_pk, 'SK': THREAD_META_SK},
                          UpdateExpression="SET lastMessageAt = :t, lastCoachReadAt = :t ADD clientUnread :one",
                          ExpressionAttributeValues={':t': ts, ':one': 1})
        table.update_item(Key=box_key,
                          UpdateExpression="SET clientId = :c, clientName = :n, lastMessageAt = :t, lastMessageText = :x, lastSender = :s, unread = :z",
                          ExpressionAttributeValues={**box_values, ':z': 0})
    return {'message': message_out(item, sender)}


@app.post("/messages/{clientId}/read")
def mark_messages_read(clientId: str, user: dict = Depends(require_roles('CLIENT', 'COACH'))):
    client_pk, _client, _coach_pk = thread_access(user, clientId)
    ts = now_iso()
    if user['role'] == 'COACH':
        table.update_item(Key={'PK': user['pk'], 'SK': inbox_sk(client_pk)},
                          UpdateExpression="SET unread = :z", ExpressionAttributeValues={':z': 0})
    mark_thread_read(user['role'], client_pk, ts)
    return {'message': 'Marked as read'}


# -------------------------- client check status ----------------------------
@app.get("/athlete/{athleteId}/check-status")
def get_athlete_check_status(athleteId: str, user: dict = Depends(require_roles('CLIENT'))):
    client_pk = make_pk('CLIENT', athleteId)
    authorize_athlete_scope(user, client_pk)
    return parse_decimals(three_day_status(client_pk))


@app.put("/athlete/check-status/3-day-log/{day}")
def save_three_day_log(day: int, payload: ThreeDayLogPayload, user: dict = Depends(require_roles('CLIENT'))):
    client_pk = user['pk']
    validate_three_day_day(day)
    cleaned_meals: Dict[str, str] = {}
    for meal, value in payload.meals.items():
        valid_meal = validate_three_day_meal(meal)
        cleaned_meals[valid_meal] = clean_text(value, 2000) or ''

    ts = now_iso()
    table.put_item(Item=to_dynamo({
        'PK': client_pk,
        'SK': f'3DAYLOG#DAY{day}',
        'type': 'THREE_DAY_LOG',
        'day': day,
        'meals': cleaned_meals,
        'updatedAt': ts,
        'createdAt': ts,
    }))
    status = three_day_status(client_pk)['days'][day - 1]['status']
    return {'message': '3-day log saved', 'day': day, 'status': status}


@app.post("/athlete/check-status/photos/upload-url")
def create_three_day_photo_upload(payload: ThreeDayPhotoUploadPayload, user: dict = Depends(require_roles('CLIENT'))):
    client_pk = user['pk']
    validate_three_day_day(payload.day)
    meal = validate_three_day_meal(payload.meal)
    if not CLIENT_MEDIA_BUCKET:
        raise HTTPException(status_code=503, detail='Photo storage is not configured.')
    if payload.contentType not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail='Unsupported image type.')

    original_name = clean_text(payload.fileName, 180) or 'photo'
    ext = ALLOWED_IMAGE_TYPES[payload.contentType]
    object_key = (
        f"clients/{short_id(client_pk)}/3-day-log/"
        f"day-{payload.day}/{meal.lower()}-{uuid.uuid4().hex}{ext}"
    )

    try:
        post = s3.generate_presigned_post(
            Bucket=CLIENT_MEDIA_BUCKET,
            Key=object_key,
            Fields={'Content-Type': payload.contentType},
            Conditions=[
                {'Content-Type': payload.contentType},
                ['content-length-range', 1, MAX_CLIENT_PHOTO_BYTES],
                ['starts-with', '$key', f'clients/{short_id(client_pk)}/3-day-log/day-{payload.day}/{meal.lower()}-'],
            ],
            ExpiresIn=300,
        )
    except ClientError:
        raise HTTPException(status_code=503, detail='Unable to prepare photo upload.')

    # Store no secret or URL in DynamoDB until the upload is confirmed.
    return {
        'uploadUrl': post['url'],
        'fields': post['fields'],
        'objectKey': object_key,
        'expiresIn': 300,
        'fileName': original_name,
    }


@app.post("/athlete/check-status/photos/complete")
def complete_three_day_photo(payload: ThreeDayPhotoCompletePayload, user: dict = Depends(require_roles('CLIENT'))):
    client_pk = user['pk']
    validate_three_day_day(payload.day)
    meal = validate_three_day_meal(payload.meal)
    if not CLIENT_MEDIA_BUCKET:
        raise HTTPException(status_code=503, detail='Photo storage is not configured.')

    prefix = f"clients/{short_id(client_pk)}/3-day-log/day-{payload.day}/{meal.lower()}-"
    if not payload.objectKey.startswith(prefix):
        raise HTTPException(status_code=403, detail='You do not have access to this upload.')

    try:
        head = s3.head_object(Bucket=CLIENT_MEDIA_BUCKET, Key=payload.objectKey)
    except ClientError:
        raise HTTPException(status_code=400, detail='Uploaded photo could not be verified.')

    content_type = head.get('ContentType', '')
    size = int(head.get('ContentLength', 0))
    if content_type not in ALLOWED_IMAGE_TYPES or size <= 0 or size > MAX_CLIENT_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail='Uploaded photo failed validation.')

    ts = now_iso()
    item = to_dynamo({
        'PK': client_pk,
        'SK': f'3DAYPHOTO#DAY{payload.day}#{meal.upper()}',
        'type': 'THREE_DAY_PHOTO',
        'day': payload.day,
        'meal': meal,
        'objectKey': payload.objectKey,
        'contentType': content_type,
        'size': size,
        'originalFileName': clean_text(payload.originalFileName, 180) or payload.objectKey.rsplit('/', 1)[-1],
        'uploadedAt': ts,
        'createdAt': ts,
    })
    table.put_item(Item=item)

    return {
        'message': 'Photo saved',
        'photo': {
            'id': item['SK'],
            'day': payload.day,
            'meal': meal,
            'originalFileName': item['originalFileName'],
            'contentType': content_type,
            'uploadedAt': ts,
        },
    }


@app.get("/coach/{coachId}/clients/{clientId}/check-status")
def get_coach_client_check_status(coachId: str, clientId: str, user: dict = Depends(require_roles('COACH'))):
    coach_pk = make_pk('COACH', coachId)
    client_pk = make_pk('CLIENT', clientId)
    authorize_coach_scope(user, coach_pk)
    client = get_profile(client_pk)
    if not client or client.get('role') != 'CLIENT':
        raise HTTPException(status_code=404, detail='Client not found.')
    if user['role'] == 'COACH' and client.get('coachId') not in (user['pk'], short_id(user['pk'])):
        raise HTTPException(status_code=403, detail='You do not have access to this resource.')
    return parse_decimals(three_day_status(client_pk))


# ------------------------------- athlete -----------------------------------
def schedule_days(spec: str) -> Optional[set]:
    """'Mon / Wed / Fri' -> {0, 2, 4};  'Mon-Fri' -> {0..4}.  Empty or unreadable -> None (no fixed weekdays)."""
    text = (spec or '').lower()
    found = set()
    for a, b in re.findall(r'\b([a-z]{3})[a-z]*\s*(?:-|–|—|to)\s*([a-z]{3})[a-z]*\b', text):
        if a in WEEKDAYS and b in WEEKDAYS:
            i, j = WEEKDAYS.index(a), WEEKDAYS.index(b)
            found.update(range(i, j + 1) if i <= j else list(range(i, 7)) + list(range(0, j + 1)))
    found.update(WEEKDAYS.index(w) for w in (t.strip()[:3] for t in re.split(r'[^a-z]+', text)) if w in WEEKDAYS)
    return found or None


def workout_summary(schedules: List[dict], logs: Dict[str, dict], day: str) -> dict:
    """Today's sessions from the assigned plans, plus the last-7-days completion numbers."""
    today = datetime.strptime(day, '%Y-%m-%d').date()
    today_rows, planned, done = [], 0, 0
    week: Dict[str, Dict[str, int]] = {}
    for offset in range(7):
        d = today - timedelta(days=offset)
        d_iso = d.isoformat()
        week[d_iso] = {'planned': 0, 'done': 0}
        for sched in schedules:
            if (sched.get('startDate') or '0000-00-00') > d_iso:
                continue
            days = schedule_days(sched.get('workoutDays', ''))
            if days is not None and d.weekday() not in days:
                continue
            logged = f"WORKOUTLOG#{d_iso}#{sched['assignmentId']}" in logs
            planned += 1
            done += 1 if logged else 0
            week[d_iso]['planned'] += 1
            week[d_iso]['done'] += 1 if logged else 0
            if offset == 0:
                count = len(sched.get('exercises') or [])
                bits = [f"{count} exercises" if count else None, sched.get('estimatedDuration') or None]
                today_rows.append({
                    "id": f"SCHEDULE#{sched['assignmentId']}",
                    "assignmentId": sched['assignmentId'],
                    "title": sched.get('templateTitle') or 'Workout',
                    "subtitle": ' · '.join(b for b in bits if b) or 'Assigned workout',
                    "statusText": 'completed' if logged else 'pending',
                    "statusColor": 'green' if logged else 'gold',
                })
    return {"today": today_rows, "done": done, "planned": planned,
            "completion": round(100 * done / planned) if planned else None,
            "week": [{"date": d, **week[d]} for d in sorted(week)]}


@app.put("/athlete/workouts/log")
def log_workout(payload: WorkoutLogPayload, user: dict = Depends(require_roles('CLIENT'))):
    """Mark an assigned workout done (or not done) for a day. Feeds Today's training and the Workout tracker."""
    client_pk = user['pk']
    day = payload.date or datetime.now(timezone.utc).strftime('%Y-%m-%d')
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', day):
        raise HTTPException(status_code=400, detail='Invalid date.')
    sched = table.get_item(Key={'PK': client_pk, 'SK': f'SCHEDULE#{payload.assignmentId}'}).get('Item')
    if not sched or sched.get('status', 'ACTIVE') != 'ACTIVE':
        raise HTTPException(status_code=404, detail='Workout plan not found.')
    sk = f'WORKOUTLOG#{day}#{payload.assignmentId}'
    if payload.completed:
        ts = now_iso()
        table.put_item(Item=to_dynamo({
            'PK': client_pk, 'SK': sk, 'type': 'WORKOUT_LOG', 'assignmentId': payload.assignmentId,
            'date': day, 'completedAt': ts, 'createdAt': ts,
        }))
    else:
        table.delete_item(Key={'PK': client_pk, 'SK': sk})
    return {'message': 'Workout updated', 'date': day, 'assignmentId': payload.assignmentId, 'completed': payload.completed}


@app.get("/athlete/{athleteId}/dashboard")
def get_athlete_dashboard(athleteId: str, date: Optional[str] = None, user: dict = Depends(current_user)):
    """Today's training. The browser passes its LOCAL date (?date=YYYY-MM-DD) so the
    'today' a user in India sees is not shifted by the server running in UTC."""
    client_pk = make_pk('CLIENT', athleteId)
    authorize_athlete_scope(user, client_pk)
    day = date if date and re.match(r'^\d{4}-\d{2}-\d{2}$', date) else utc_today()
    items = query_all(
        KeyConditionExpression=Key('PK').eq(client_pk) & Key('SK').begins_with(f"TRAINING#{day}")
    )
    # Also pull today's health snapshot (best-effort: don't fail if missing)
    health: dict = {}
    try:
        h = table.get_item(Key={'PK': client_pk, 'SK': f"HEALTH#{day}"})
        health = h.get('Item') or {}
    except Exception:
        pass

    schedules = [i for i in query_all(
        KeyConditionExpression=Key('PK').eq(client_pk) & Key('SK').begins_with('SCHEDULE#')
    ) if i.get('status', 'ACTIVE') == 'ACTIVE']
    logs = {i['SK']: i for i in query_all(
        KeyConditionExpression=Key('PK').eq(client_pk) & Key('SK').begins_with('WORKOUTLOG#')
    )}
    workout = workout_summary(schedules, logs, day)

    today_training = [
        {
            "id": i['SK'],
            "title": i.get('title', ''),
            "subtitle": i.get('subtitle', ''),
            "statusText": i.get('statusText', 'pending'),
            "statusColor": i.get('statusColor', 'gold'),
        }
        for i in items
    ] + workout['today']

    # Last 7 days (ending on the athlete's own "today") for the weekly-rhythm bars
    days = date_window(day, 7)
    week_health = health_range(client_pk, days[0], day)
    by_date = {w['date']: w for w in workout['week']}
    weekly = []
    for d in days:
        w = by_date.get(d, {'planned': 0, 'done': 0})
        weekly.append({
            "date": d,
            "workoutPct": round(100 * w['done'] / w['planned']) if w['planned'] else None,
            "stepsPct": pct_of(week_health.get(d, {}).get('steps'), STEP_GOAL),
        })

    out = {
        "date": day,
        "todayTraining": today_training,
        "assignedSchedules": [_schedule_out(i) for i in schedules],
        "steps": health.get('steps'),
        "stepGoal": STEP_GOAL,
        "sleepHours": health.get('sleepHours'),
        "sleepGoal": SLEEP_GOAL,
        "calories": health.get('calories'),
        "hydration": health.get('hydration'),
        "hydrationGoal": HYDRATION_GOAL,
        "heartRate": health.get('heartRate'),
        "healthSource": health.get('source'),
        "healthUpdatedAt": health.get('updatedAt'),
        "workoutsThisWeek": workout['done'],
        "weekly": weekly,
    }
    if health.get('sleepHours') is not None:
        out["recovery"] = pct_of(health.get('sleepHours'), SLEEP_GOAL)      # readiness = how much of the sleep target was met
    if workout['completion'] is not None:
        out["workoutCompletion"] = workout['completion']
    return parse_decimals(out)


@app.post("/athlete/checkin")
def save_checkin(payload: CheckinPayload, user: dict = Depends(require_roles('CLIENT'))):
    client_pk = user['pk']                                  # always the signed-in athlete
    if payload.clientId and make_pk('CLIENT', payload.clientId) != client_pk:
        raise HTTPException(status_code=403, detail="You can only submit your own check-in.")

    check_range('Weight (kg)', payload.weight, 20, 500)
    check_range('Waist (cm)', payload.waist, 20, 300)
    if payload.adherence not in ADHERENCE_SCORES:
        raise HTTPException(status_code=400, detail="Invalid adherence value.")
    if payload.workoutQuality not in WORKOUT_QUALITIES:
        raise HTTPException(status_code=400, detail="Invalid workout quality value.")

    ts = now_iso()
    item = to_dynamo({
        "PK": client_pk,
        "SK": f"CHECKIN#{ts}",
        "type": "CHECKIN",
        "weight": payload.weight,
        "waist": payload.waist,
        "adherence": payload.adherence,
        "workoutQuality": payload.workoutQuality,
        "notes": clean_text(payload.notes, 2000) or None,
        "createdAt": ts,
    })
    table.put_item(Item=item)
    return {"message": "Check-in saved", "checkinId": item['SK']}




def validate_progress_angle(angle: str) -> str:
    clean = (clean_text(angle, 20) or '').lower()
    if clean not in PROGRESS_ANGLES:
        raise HTTPException(status_code=400, detail='Angle must be front, side or back.')
    return clean


def progress_key_prefix(client_pk: str, checkin_id: str, angle: str) -> str:
    stamp = re.sub(r'\D', '', checkin_id.split('#', 1)[-1])
    return f"clients/{short_id(client_pk)}/progress/{stamp}/{angle}-"


def own_checkin(client_pk: str, checkin_id: str) -> dict:
    if not checkin_id.startswith('CHECKIN#'):
        raise HTTPException(status_code=400, detail='Invalid check-in.')
    item = table.get_item(Key={'PK': client_pk, 'SK': checkin_id}).get('Item')
    if not item:
        raise HTTPException(status_code=404, detail='Check-in not found.')
    return item


@app.post("/athlete/checkin/photos/upload-url")
def create_progress_photo_upload(payload: ProgressPhotoUploadPayload, user: dict = Depends(require_roles('CLIENT'))):
    client_pk = user['pk']
    angle = validate_progress_angle(payload.angle)
    own_checkin(client_pk, payload.checkinId)
    if not CLIENT_MEDIA_BUCKET:
        raise HTTPException(status_code=503, detail='Photo storage is not configured.')
    if payload.contentType not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail='Unsupported image type.')
    prefix = progress_key_prefix(client_pk, payload.checkinId, angle)
    object_key = f"{prefix}{uuid.uuid4().hex}{ALLOWED_IMAGE_TYPES[payload.contentType]}"
    try:
        post = s3.generate_presigned_post(
            Bucket=CLIENT_MEDIA_BUCKET,
            Key=object_key,
            Fields={'Content-Type': payload.contentType},
            Conditions=[
                {'Content-Type': payload.contentType},
                ['content-length-range', 1, MAX_CLIENT_PHOTO_BYTES],
                ['starts-with', '$key', prefix],
            ],
            ExpiresIn=300,
        )
    except ClientError:
        raise HTTPException(status_code=503, detail='Unable to prepare photo upload.')
    return {'uploadUrl': post['url'], 'fields': post['fields'], 'objectKey': object_key, 'expiresIn': 300}


@app.post("/athlete/checkin/photos/complete")
def complete_progress_photo(payload: ProgressPhotoCompletePayload, user: dict = Depends(require_roles('CLIENT'))):
    client_pk = user['pk']
    angle = validate_progress_angle(payload.angle)
    own_checkin(client_pk, payload.checkinId)
    if not CLIENT_MEDIA_BUCKET:
        raise HTTPException(status_code=503, detail='Photo storage is not configured.')
    if not payload.objectKey.startswith(progress_key_prefix(client_pk, payload.checkinId, angle)):
        raise HTTPException(status_code=403, detail='You do not have access to this upload.')
    try:
        head = s3.head_object(Bucket=CLIENT_MEDIA_BUCKET, Key=payload.objectKey)
    except ClientError:
        raise HTTPException(status_code=400, detail='Uploaded photo could not be verified.')
    content_type = head.get('ContentType', '')
    size = int(head.get('ContentLength', 0))
    if content_type not in ALLOWED_IMAGE_TYPES or size <= 0 or size > MAX_CLIENT_PHOTO_BYTES:
        raise HTTPException(status_code=400, detail='Uploaded photo failed validation.')
    ts = now_iso()
    item = to_dynamo({
        'PK': client_pk,
        'SK': f"PROGRESSPHOTO#{payload.checkinId.split('#', 1)[1]}#{angle.upper()}",
        'type': 'PROGRESS_PHOTO',
        'checkinId': payload.checkinId,
        'angle': angle,
        'objectKey': payload.objectKey,
        'contentType': content_type,
        'size': size,
        'originalFileName': clean_text(payload.originalFileName, 180) or payload.objectKey.rsplit('/', 1)[-1],
        'uploadedAt': ts,
    })
    table.put_item(Item=item)
    return {'message': 'Photo saved', 'angle': angle, 'objectKey': payload.objectKey}


@app.get("/coach/{coachId}/clients/{clientId}/progress")
def get_client_progress(coachId: str, clientId: str, user: dict = Depends(require_roles('COACH', 'ADMIN'))):
    """Progress Review: real check-in history + progress photos for one assigned client."""
    coach_pk = make_pk('COACH', coachId)
    authorize_coach_scope(user, coach_pk)
    client_pk = make_pk('CLIENT', clientId)
    client = get_profile(client_pk)
    if not client or client.get('role') != 'CLIENT':
        raise HTTPException(status_code=404, detail='Client not found.')
    if user['role'] == 'COACH' and not is_coach_of(client, user['pk']):
        raise HTTPException(status_code=403, detail='You do not have access to this resource.')

    checkins = latest_checkins(client_pk, 12)                 # newest first
    photos = {}
    for p in query_all(KeyConditionExpression=Key('PK').eq(client_pk) & Key('SK').begins_with('PROGRESSPHOTO#')):
        photos.setdefault(p.get('checkinId', ''), []).append(
            {'angle': p.get('angle', ''), 'objectKey': p.get('objectKey', ''), 'uploadedAt': p.get('uploadedAt', '')})

    history = []
    for c in reversed(checkins):                              # oldest -> newest for charts
        history.append({
            'id': c['SK'],
            'date': c['SK'].split('#', 1)[1],
            'weight': c.get('weight'),
            'waist': c.get('waist'),
            'adherence': c.get('adherence'),
            'adherenceScore': adherence_score(c.get('adherence')),
            'workoutQuality': c.get('workoutQuality'),
            'notes': c.get('notes') or '',
            'photos': sorted(photos.get(c['SK'], []), key=lambda x: x['angle']),
        })
    weights = [h['weight'] for h in history if h['weight'] is not None]
    scores = [h['adherenceScore'] for h in history if h['adherenceScore'] is not None]

    # ---- daily activity: steps / sleep / water / calories / heart-rate, last 14 days ----
    today = utc_today()
    days = date_window(today, 14)
    window_end = (datetime.strptime(today, '%Y-%m-%d').date() + timedelta(days=1)).isoformat()
    snapshots = health_range(client_pk, days[0], window_end)
    health = [{'date': d, **health_view(snapshots.get(d)), 'source': snapshots.get(d, {}).get('source')}
              for d in sorted(set(days) | set(snapshots))][-14:]
    recent = health[-7:]

    def mean(key: str) -> Optional[float]:
        vals = [float(h[key]) for h in recent if h.get(key) is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    latest_day = max((h['date'] for h in health if h.get('steps') is not None), default=None)
    latest_snap = snapshots.get(latest_day, {}) if latest_day else {}
    avg_steps = mean('steps')

    schedules = [i for i in query_all(KeyConditionExpression=Key('PK').eq(client_pk) & Key('SK').begins_with('SCHEDULE#'))
                 if i.get('status', 'ACTIVE') == 'ACTIVE']
    logs = {i['SK']: i for i in query_all(KeyConditionExpression=Key('PK').eq(client_pk) & Key('SK').begins_with('WORKOUTLOG#'))}
    wk = workout_summary(schedules, logs, today)
    pres = profile_presence(client)

    return parse_decimals({
        'client': {'id': short_id(client_pk), 'name': client.get('name') or 'Unnamed Athlete',
                   'goal': client.get('primaryGoal') or client.get('goal') or 'Not set'},
        'profile': {
            'email': client.get('email', ''),
            'age': client.get('age'),
            'height': client.get('height'),
            'startWeight': client.get('weight'),
            'activityLevel': client.get('activityLevel'),
            'primaryGoal': client.get('primaryGoal') or client.get('goal'),
            'medicalNotes': client.get('medicalNotes') or '',
            'memberSince': client.get('createdAt'),
            'onboardingCompleted': bool(client.get('onboardingCompleted', False)),
            **pres,
        },
        'checkins': history,
        'health': health,
        'activity': {
            'stepsLatest': latest_snap.get('steps'),
            'stepsLatestDate': latest_day,
            'stepsAvg7d': round(avg_steps) if avg_steps is not None else None,
            'stepGoal': STEP_GOAL,
            'sleepAvg7d': mean('sleepHours'),
            'sleepGoal': SLEEP_GOAL,
            'hydrationAvg7d': mean('hydration'),
            'hydrationGoal': HYDRATION_GOAL,
            'caloriesAvg7d': round(mean('calories')) if mean('calories') is not None else None,
            'heartRateAvg7d': round(mean('heartRate')) if mean('heartRate') is not None else None,
            'daysWithData': sum(1 for h in recent if h.get('steps') is not None),
            'workoutsDone7d': wk['done'],
            'workoutsPlanned7d': wk['planned'],
            'workoutCompletion7d': wk['completion'],
            'lastSyncAt': latest_snap.get('updatedAt'),
            'source': latest_snap.get('source'),
        },
        'summary': {
            'weightChange': round(float(weights[-1]) - float(weights[0]), 1) if len(weights) > 1 else None,
            'averageAdherence': round(sum(scores) / len(scores), 1) if scores else None,
            'totalCheckins': len(history),
        },
    })


@app.put("/athlete/health-metrics")
def save_health_metrics(payload: HealthMetricsPayload, user: dict = Depends(require_roles('CLIENT'))):
    """Store one day's steps / sleep / water / calories / heart-rate for the signed-in athlete.
    Values come either from the phone's health sensors or are typed in by the athlete (iPhone home-screen
    apps cannot read Apple Health). The coach sees the same numbers."""
    client_pk = user['pk']
    today = utc_today()
    day = today
    if payload.date:
        if not re.match(r'^\d{4}-\d{2}-\d{2}$', payload.date):
            raise HTTPException(status_code=400, detail="Invalid date.")
        try:
            gap = abs((datetime.strptime(payload.date, '%Y-%m-%d').date() - datetime.strptime(today, '%Y-%m-%d').date()).days)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date.")
        if gap > 1:          # the phone's "today" can differ from UTC by at most a day
            raise HTTPException(status_code=400, detail="Health data can only be saved for today.")
        day = payload.date

    check_range('Steps', payload.steps, 0, 200000)
    check_range('Sleep (hours)', payload.sleepHours, 0, 24)
    check_range('Calories', payload.calories, 0, 20000)
    check_range('Heart rate', payload.heartRate, 20, 250)
    check_range('Water (litres)', payload.hydration, 0, 15)

    update_map: Dict[str, Any] = {}
    if payload.steps is not None:
        update_map['steps'] = int(payload.steps)
    if payload.sleepHours is not None:
        update_map['sleepHours'] = Decimal(str(round(payload.sleepHours, 2)))
    if payload.calories is not None:
        update_map['calories'] = int(payload.calories)
    if payload.heartRate is not None:
        update_map['heartRate'] = int(payload.heartRate)
    if payload.hydration is not None:
        update_map['hydration'] = Decimal(str(round(payload.hydration, 2)))

    if not update_map:
        raise HTTPException(status_code=400, detail="No health metrics provided.")

    update_map['updatedAt'] = now_iso()
    update_map['type'] = 'HEALTH_SNAPSHOT'
    update_map['source'] = 'manual' if payload.source == 'manual' else 'device'

    set_parts = [f"#{k} = :{k}" for k in update_map]
    expr_names = {f"#{k}": k for k in update_map}
    expr_values = {f":{k}": to_dynamo(v) for k, v in update_map.items()}

    table.update_item(
        Key={'PK': client_pk, 'SK': f"HEALTH#{day}"},
        UpdateExpression="SET " + ", ".join(set_parts),
        ExpressionAttributeNames=expr_names,
        ExpressionAttributeValues=expr_values,
    )
    return {"message": "Health metrics saved", "date": day}


@app.get("/athlete/{athleteId}/health-metrics")
def get_health_metrics(athleteId: str, date: Optional[str] = None, user: dict = Depends(current_user)):
    """Return the stored health snapshot for a day (default: today).
    Athletes see only their own data; coaches see only their assigned clients."""
    client_pk = make_pk('CLIENT', athleteId)
    if user.get('role') == 'CLIENT':
        authorize_athlete_scope(user, client_pk)
    elif user.get('role') == 'COACH':
        if not is_coach_of(get_profile(client_pk), user['pk']):
            raise HTTPException(status_code=403, detail="Not your client.")
    else:
        raise HTTPException(status_code=403, detail="Forbidden.")

    day = date if date and re.match(r'^\d{4}-\d{2}-\d{2}$', date) else utc_today()
    try:
        snapshot = table.get_item(Key={'PK': client_pk, 'SK': f"HEALTH#{day}"}).get('Item') or {}
    except Exception:
        snapshot = {}
    return parse_decimals({
        "date": day,
        **health_view(snapshot),
        "updatedAt": snapshot.get('updatedAt'),
        "source": snapshot.get('source'),
    })


# ---------------------------------------------------------------------------
# TEMPLATE IMAGE VIEWER  (presigned URL for viewing reference image in iframe)
# ---------------------------------------------------------------------------

@app.get("/coach/templates/{templateId}/image-view")
def get_template_image_view(
    templateId: str,
    coachId: Optional[str] = None,
    user: dict = Depends(require_roles('COACH', 'ADMIN')),
):
    """Return a short-lived presigned URL for viewing the template reference image."""
    item = find_template(templateId, template_owner(user, coachId))
    if not item:
        raise HTTPException(status_code=404, detail='Template not found.')
    key = item.get('referenceImageKey', '')
    if key and not key.startswith(f"coaches/{short_id(item['PK'])}/"):
        key = ''   # legacy record pointing outside the coach's own folder: never sign it
    if not key or not CLIENT_MEDIA_BUCKET:
        raise HTTPException(status_code=404, detail='No reference image for this template.')
    try:
        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': CLIENT_MEDIA_BUCKET, 'Key': key},
            ExpiresIn=3600,
        )
    except ClientError:
        raise HTTPException(status_code=503, detail='Could not generate image URL.')
    return {'viewUrl': url, 'objectKey': key}


# ---------------------------------------------------------------------------
# ASSIGN TEMPLATE TO CLIENT  (creates a client schedule from a template)
# ---------------------------------------------------------------------------

@app.post("/coach/{coachId}/templates/{templateId}/assign")
def assign_template_to_client(
    coachId: str,
    templateId: str,
    payload: AssignTemplatePayload,
    user: dict = Depends(require_roles('COACH', 'ADMIN')),
):
    """Assign a template to a client – creates a CLIENT schedule record."""
    coach_pk = make_pk('COACH', coachId)
    authorize_coach_scope(user, coach_pk)

    template_item = find_template(templateId, coach_pk)
    if not template_item:
        raise HTTPException(status_code=404, detail='Template not found.')

    # Verify the client belongs to this coach
    client_pk = make_pk('CLIENT', payload.clientId)
    client_profile = get_profile(client_pk)
    if not client_profile or client_profile.get('role') != 'CLIENT':
        raise HTTPException(status_code=404, detail='Client not found.')
    if not is_coach_of(client_profile, coach_pk):
        raise HTTPException(status_code=403, detail='This client is not assigned to you.')

    start_date = payload.startDate or now_iso()[:10]
    assignment_id = f'asgn_{uuid.uuid4().hex[:8]}'
    now = now_iso()

    # Snapshot the template exercises into the assignment
    schedule_item = to_dynamo({
        'PK': client_pk,
        'SK': f'SCHEDULE#{assignment_id}',
        'type': 'CLIENT_SCHEDULE',
        'assignmentId': assignment_id,
        'templateId': templateId,
        'templateTitle': template_item.get('title', ''),
        'coachId': coach_pk,
        'startDate': start_date,
        'notes': clean_text(payload.notes, 500) or '',
        'exercises': template_item.get('exercises', []),
        'workoutDays': template_item.get('workoutDays', ''),
        'goal': template_item.get('goal', ''),
        'level': template_item.get('level', ''),
        'estimatedDuration': template_item.get('estimatedDuration', ''),
        'equipment': template_item.get('equipment', ''),
        'referenceImageKey': template_item.get('referenceImageKey', ''),
        'status': 'ACTIVE',
        'createdAt': now,
        'updatedAt': now,
    })
    table.put_item(Item=schedule_item)

    return {
        'message': 'Template assigned successfully.',
        'assignmentId': assignment_id,
        'clientId': payload.clientId,
        'startDate': start_date,
    }


@app.get("/coach/{coachId}/clients/{clientId}/schedules")
def get_client_schedules(
    coachId: str,
    clientId: str,
    user: dict = Depends(require_roles('COACH', 'ADMIN')),
):
    """Coach: list all schedules assigned to a specific client."""
    coach_pk = make_pk('COACH', coachId)
    authorize_coach_scope(user, coach_pk)

    client_pk = make_pk('CLIENT', clientId)
    client_profile = get_profile(client_pk)
    if not client_profile or client_profile.get('role') != 'CLIENT':
        raise HTTPException(status_code=404, detail='Client not found.')
    if not is_coach_of(client_profile, coach_pk):
        raise HTTPException(status_code=403, detail='This client is not assigned to you.')

    items = query_all(
        KeyConditionExpression=Key('PK').eq(client_pk) & Key('SK').begins_with('SCHEDULE#')
    )
    return {'schedules': [_schedule_out(i) for i in items]}


def _schedule_out(item: dict) -> dict:
    """Serialize a CLIENT_SCHEDULE DynamoDB item for API responses."""
    out = parse_decimals({
        'assignmentId': item.get('assignmentId', ''),
        'templateId': item.get('templateId', ''),
        'templateTitle': item.get('templateTitle', ''),
        'startDate': item.get('startDate', ''),
        'notes': item.get('notes', ''),
        'exercises': item.get('exercises', []),
        'workoutDays': item.get('workoutDays', ''),
        'goal': item.get('goal', ''),
        'level': item.get('level', ''),
        'estimatedDuration': item.get('estimatedDuration', ''),
        'equipment': item.get('equipment', ''),
        'referenceImageKey': item.get('referenceImageKey', ''),
        'status': item.get('status', 'ACTIVE'),
        'createdAt': item.get('createdAt', ''),
    })
    if out.get('referenceImageKey') and CLIENT_MEDIA_BUCKET:
        try:
            out['referenceImageUrl'] = s3.generate_presigned_url(
                'get_object',
                Params={'Bucket': CLIENT_MEDIA_BUCKET, 'Key': out['referenceImageKey']},
                ExpiresIn=3600,
            )
        except Exception:
            out['referenceImageUrl'] = None
    else:
        out['referenceImageUrl'] = None
    return out


@app.get("/athlete/{athleteId}/schedules")
def get_athlete_schedules(
    athleteId: str,
    user: dict = Depends(require_roles('CLIENT')),
):
    """Client: list their own active schedules."""
    client_pk = user['pk']
    authorize_athlete_scope(user, client_pk)

    items = query_all(
        KeyConditionExpression=Key('PK').eq(client_pk) & Key('SK').begins_with('SCHEDULE#')
    )
    active = [i for i in items if i.get('status', 'ACTIVE') == 'ACTIVE']
    return {'schedules': [_schedule_out(i) for i in active]}


@app.get("/athlete/{athleteId}/schedules/{assignmentId}")
def get_athlete_schedule_detail(
    athleteId: str,
    assignmentId: str,
    user: dict = Depends(require_roles('CLIENT')),
):
    """Client: get full detail of one schedule."""
    client_pk = user['pk']
    authorize_athlete_scope(user, client_pk)

    result = table.get_item(Key={'PK': client_pk, 'SK': f'SCHEDULE#{assignmentId}'})
    item = result.get('Item')
    if not item:
        raise HTTPException(status_code=404, detail='Schedule not found.')
    return _schedule_out(item)


# ---------------------------------------------------------------------------
# S3 IMAGE VIEWER  (presigned URL for any S3 image the coach/client owns)
# ---------------------------------------------------------------------------

@app.get("/media/view")
def get_media_view_url(
    objectKey: str,
    user: dict = Depends(require_roles('CLIENT', 'COACH', 'ADMIN')),
):
    """Return a presigned view URL for a media object the caller is authorised to see."""
    if not CLIENT_MEDIA_BUCKET:
        raise HTTPException(status_code=503, detail='Media storage is not configured.')

    # Authorisation: the object key must be scoped to the caller's own ID
    pk = user['pk']
    caller_short = short_id(pk)
    role = user.get('role', '')

    allowed_prefixes = []
    if role == 'CLIENT':
        allowed_prefixes = [f'clients/{caller_short}/']
    elif role == 'COACH':
        allowed_prefixes = [f'coaches/{caller_short}/']
        parts = unquote(objectKey).split('/')
        if len(parts) > 2 and parts[0] == 'clients':
            # a coach may open photos that belong to a client assigned to them
            if is_coach_of(get_profile(make_pk('CLIENT', parts[1])), pk):
                allowed_prefixes.append(f'clients/{parts[1]}/')
    elif role == 'ADMIN':
        allowed_prefixes = ['clients/', 'coaches/']  # admins can view any media

    decoded_key = unquote(objectKey)
    if '..' in decoded_key.split('/') or not any(decoded_key.startswith(p) for p in allowed_prefixes):
        raise HTTPException(status_code=403, detail='Access denied to this media object.')

    try:
        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': CLIENT_MEDIA_BUCKET, 'Key': decoded_key},
            ExpiresIn=3600,
        )
    except ClientError:
        raise HTTPException(status_code=503, detail='Could not generate view URL.')

    return {'viewUrl': url, 'objectKey': decoded_key}


# Wrap the FastAPI app with Mangum to bridge it to AWS Lambda
handler = Mangum(app)
