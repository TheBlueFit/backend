import json, time, base64, hmac, hashlib
from harness import main, TABLE, HTTPException

passed = failed = 0
def check(label, cond):
    global passed, failed
    if cond: passed += 1; print(f"  PASS  {label}")
    else: failed += 1; print(f"  FAIL  {label}")

def raises(status, fn, *a, **k):
    try: fn(*a, **k)
    except HTTPException as e: return e.status_code == status
    return False

def auth(token): return main.current_user(authorization=f"Bearer {token}")
M = main

print("\n== setup: admin created the way scripts/create_admin.py does ==")
TABLE.put_item({"PK": "ADMIN#ADH001", "SK": M.PROFILE_SK, "role": "ADMIN", "name": "Master Admin", "email": "a@x.com",
                "userCode": "ADH001", "status": "ACTIVE", "passwordHash": M.hash_password("AdminPass123"),
                "mustChangePassword": False, "onboardingCompleted": True, "pwdChangedAt": int(time.time()) - 5})

print("\n== passwords & tokens ==")
h = M.hash_password("Secret123")
check("hash is salted scrypt, not plain/sha256", h.startswith("scrypt$") and "Secret123" not in h)
check("same password hashes differently (salt)", M.hash_password("Secret123") != h)
check("verify accepts right / rejects wrong", M.verify_password("Secret123", h) and not M.verify_password("secret123", h))
check("verify rejects garbage hash safely", M.verify_password("x", "garbage") is False)

print("\n== login ==")
r = M.login(M.LoginPayload(identifier="adh001", password="AdminPass123", role="CLIENT"))
check("admin can log in (ID case-insensitive, any role toggle)", r["role"] == "ADMIN" and "token" in r)
check("login response has no hash / internal fields", not ({"passwordHash", "failedAttempts", "lockedUntil", "SK"} & set(r)))
admin_tok = r["token"]
check("wrong password -> 401", raises(401, M.login, M.LoginPayload(identifier="ADH001", password="nope")))
check("unknown user -> 401 (same error, no enumeration)", raises(401, M.login, M.LoginPayload(identifier="ZZZ999", password="nope")))
try: M.login(M.LoginPayload(identifier="ZZZ999", password="x"))
except HTTPException as e: unknown_detail = e.detail
try: M.login(M.LoginPayload(identifier="ADH001", password="x"))
except HTTPException as e: wrong_detail = e.detail
check("unknown-user and wrong-password messages identical", unknown_detail == wrong_detail)
for _ in range(4): raises(401, M.login, M.LoginPayload(identifier="ADH001", password="bad"))
check("account locks after repeated failures (429, even with right password)",
      raises(429, M.login, M.LoginPayload(identifier="ADH001", password="AdminPass123")))
TABLE.d[("ADMIN#ADH001", M.PROFILE_SK)]["lockedUntil"] = 0   # simulate lock expiry

print("\n== authentication / authorization ==")
check("no token -> 401", raises(401, M.current_user, authorization=None))
check("garbage token -> 401", raises(401, M.current_user, authorization="Bearer abc.def.ghi"))
tok = admin_tok.split('.')
forged = f"{tok[0]}.{base64.urlsafe_b64encode(json.dumps({'sub':'ADMIN#ADH001','role':'ADMIN','iat':1,'exp':9999999999}).encode()).rstrip(b'=').decode()}.{tok[2]}"
check("tampered payload (bad signature) -> 401", raises(401, M.current_user, authorization=f"Bearer {forged}"))
none_hdr = base64.urlsafe_b64encode(b'{"alg":"none","typ":"JWT"}').rstrip(b'=').decode()
check("alg=none token -> 401", raises(401, M.current_user, authorization=f"Bearer {none_hdr}.{tok[1]}."))
exp_body = base64.urlsafe_b64encode(json.dumps({"sub": "ADMIN#ADH001", "role": "ADMIN", "iat": 1, "exp": 2}).encode()).rstrip(b'=').decode()
exp_sig = base64.urlsafe_b64encode(hmac.new(M.signing_key(), f"{tok[0]}.{exp_body}".encode(), hashlib.sha256).digest()).rstrip(b'=').decode()
check("expired (but correctly signed) token -> 401", raises(401, M.current_user, authorization=f"Bearer {tok[0]}.{exp_body}.{exp_sig}"))
admin = auth(admin_tok)

print("\n== admin provisioning ==")
c1 = M.save_onboarding(M.OnboardingPayload(name="Suresh Babu", role="client", email="Suresh@Mail.com", age=30.0, height=175.5,
                       weight=82.5, activityLevel="moderate", primaryGoal="fat_loss", medicalNotes="knee"), user=admin)
check("client id format CLIENT#CLS0001", c1["userId"] == "CLIENT#CLS0001" and c1["userCode"] == "CLS0001")
check("temp password returned once, TBF-xxxxxxxx", c1["tempPassword"].startswith("TBF-") and len(c1["tempPassword"]) == 12)
stored = TABLE.d[("CLIENT#CLS0001", M.PROFILE_SK)]
check("only a hash is stored, never the temp password", c1["tempPassword"] not in json.dumps(stored, default=str) and stored["passwordHash"].startswith("scrypt$"))
check("floats stored as Decimal (DynamoDB-safe)", stored["weight"] == 82.5)
c2 = M.save_onboarding(M.OnboardingPayload(name="Suresh Two", role="CLIENT", email="s2@mail.com"), user=admin)
check("sequential id CLIENT#CLS0002", c2["userId"] == "CLIENT#CLS0002")
co = M.save_onboarding(M.OnboardingPayload(name="Rakesh", role="COACH", email="rakesh@mail.com", specialization="hypertrophy"), user=admin)
co2 = M.save_onboarding(M.OnboardingPayload(name="Maya", role="COACH", email="maya@mail.com"), user=admin)
check("coach id COACH#CHR0001", co["userId"] == "COACH#CHR0001")
check("duplicate email -> 409", raises(409, M.save_onboarding, M.OnboardingPayload(name="X", role="CLIENT", email="suresh@mail.com"), user=admin))
check("cannot provision ADMIN via API -> 400", raises(400, M.save_onboarding, M.OnboardingPayload(name="X", role="ADMIN", email="x@x.com"), user=admin))
check("bad email -> 400", raises(400, M.save_onboarding, M.OnboardingPayload(name="X", role="CLIENT", email="nope"), user=admin))
check("out-of-range weight -> 400", raises(400, M.save_onboarding, M.OnboardingPayload(name="Y", role="CLIENT", email="y@x.com", weight=5000.0), user=admin))

print("\n== first login & forced password change ==")
r = M.login(M.LoginPayload(identifier="CLS0001", password=c1["tempPassword"], role="CLIENT"))
check("temp-password login: mustChangePassword and NO token", r["mustChangePassword"] is True and "token" not in r)
check("role toggle mismatch (COACH) -> 401", raises(401, M.login, M.LoginPayload(identifier="CLS0001", password=c1["tempPassword"], role="COACH")))
base = dict(userId="CLIENT#CLS0001", currentPassword=c1["tempPassword"])
check("wrong current password -> 401", raises(401, M.complete_setup, M.CompleteSetupPayload(userId="CLIENT#CLS0001", currentPassword="wrong", newPassword="Newpass123")))
check("weak new password -> 400", raises(400, M.complete_setup, M.CompleteSetupPayload(newPassword="short1", **base)))
check("letters-only password -> 400", raises(400, M.complete_setup, M.CompleteSetupPayload(newPassword="onlyletters", **base)))
check("same-as-temp password -> 400", raises(400, M.complete_setup, M.CompleteSetupPayload(newPassword=c1["tempPassword"], **base)))
res = M.complete_setup(M.CompleteSetupPayload(newPassword="MyNewPass123", age=31.0, weight=81.0, **base))
check("setup completes and returns a session token", "token" in res["user"] and res["user"]["mustChangePassword"] is False)
check("setup is one-time (409 on repeat)", raises(409, M.complete_setup, M.CompleteSetupPayload(newPassword="Another123x", userId="CLIENT#CLS0001", currentPassword="MyNewPass123")))
check("temp password no longer works", raises(401, M.login, M.LoginPayload(identifier="CLS0001", password=c1["tempPassword"])))
r = M.login(M.LoginPayload(identifier="suresh@mail.com", password="MyNewPass123", role="CLIENT"))
check("email login with new password works and returns token", "token" in r)
client_tok = r["token"]; client = auth(client_tok)
# coach first login
rc = M.complete_setup(M.CompleteSetupPayload(userId="COACH#CHR0001", currentPassword=co["tempPassword"], newPassword="CoachPass123", specialization="strength"))
coach_tok = rc["user"]["token"]; coach = auth(coach_tok)
rc2 = M.complete_setup(M.CompleteSetupPayload(userId=co2["userId"], currentPassword=co2["tempPassword"], newPassword="CoachPass456"))
coach2 = auth(rc2["user"]["token"])

print("\n== privacy: what the admin directory exposes ==")
users = M.get_users(user=admin)
blob = json.dumps(users)
check("directory lists users", len(users) == 5)
check("no password hashes anywhere", "scrypt$" not in blob and "passwordHash" not in blob)
check("no health notes / body metrics / lockout fields", not any(k in blob for k in ("medicalNotes", "knee", "weight", "height", "failedAttempts", "lockedUntil")))
check("clients/coaches cannot call admin routes (403)", raises(403, M.require_roles('ADMIN'), user=client) and raises(403, M.require_roles('ADMIN'), user=coach))

print("\n== assignment ==")
M.assign_coach("CLIENT#CLS0001", M.AssignPayload(coachId="COACH#CHR0001"), user=admin)
check("coachId stored on client", TABLE.d[("CLIENT#CLS0001", M.PROFILE_SK)]["coachId"] == "COACH#CHR0001")
check("assign to unknown coach -> 404", raises(404, M.assign_coach, "CLIENT#CLS0001", M.AssignPayload(coachId="COACH#NOPE"), user=admin))
check("assign unknown client -> 404", raises(404, M.assign_coach, "CLIENT#NOPE", M.AssignPayload(coachId="COACH#CHR0001"), user=admin))

print("\n== check-in (athlete) ==")
ok = M.save_checkin(M.CheckinPayload(weight=80.5, adherence="strict", workoutQuality="strong", waist=82.0, notes="  felt good "), user=client)
check("check-in saved under the signed-in athlete", ok["checkinId"].startswith("CHECKIN#"))
check("bad adherence -> 400", raises(400, M.save_checkin, M.CheckinPayload(weight=80.0, adherence="hack", workoutQuality="strong"), user=client))
check("weight out of range -> 400", raises(400, M.save_checkin, M.CheckinPayload(weight=900.0, adherence="strict", workoutQuality="strong"), user=client))
check("cannot file a check-in for someone else -> 403", raises(403, M.save_checkin, M.CheckinPayload(weight=80.0, adherence="strict", workoutQuality="strong", clientId="CLIENT#CLS0002"), user=client))
check("coach cannot submit athlete check-ins -> 403", raises(403, M.require_roles('CLIENT'), user=coach))

print("\n== coach views are scoped ==")
dash = M.get_coach_dashboard("COACH#CHR0001", user=coach)
check("coach dashboard counts the client + activity feed", dash["stats"][0]["value"] == "1" and dash["recentActivity"][0]["client"] == "Suresh Babu")
roster = M.get_coach_clients("COACH%23CHR0001", user=coach)["clients"]
check("roster (URL-encoded id) shows only safe fields", len(roster) == 1 and {"id", "name", "goal", "adherence", "lastCheckIn", "status", "stepsToday"} <= set(roster[0]) and not ({"passwordHash", "email", "PK", "medicalNotes"} & set(roster[0])))
check("roster row has no email / notes / hash", "mail" not in json.dumps(roster) and "knee" not in json.dumps(roster))
check("other coach cannot read this coach's dashboard -> 403", raises(403, M.get_coach_dashboard, "COACH#CHR0001", user=coach2))
check("other coach cannot read this roster -> 403", raises(403, M.get_coach_clients, "COACH#CHR0001", user=coach2))
check("admin can read any coach", M.get_coach_clients("COACH#CHR0001", user=admin)["clients"][0]["id"] == "CLS0001")

print("\n== athlete dashboard scope ==")
TABLE.put_item({"PK": "CLIENT#CLS0001", "SK": "TRAINING#2026-10-01#1", "title": "Push", "subtitle": "x", "statusText": "pending", "statusColor": "gold"})
check("athlete sees own training", len(M.get_athlete_dashboard("CLIENT#CLS0001", date="2026-10-01", user=client)["todayTraining"]) == 1)
check("athlete cannot read another athlete (IDOR) -> 403", raises(403, M.get_athlete_dashboard, "CLIENT#CLS0002", date="2026-10-01", user=client))
check("assigned coach can read their athlete", len(M.get_athlete_dashboard("CLS0001", date="2026-10-01", user=coach)["todayTraining"]) == 1)
check("unassigned coach cannot -> 403", raises(403, M.get_athlete_dashboard, "CLIENT#CLS0001", user=coach2))
check("bad date format falls back safely", "date" in M.get_athlete_dashboard("CLIENT#CLS0001", date="x'; drop", user=client))

print("\n== templates ==")
t = M.create_template("COACH#CHR0001", M.TemplatePayload(title="PPL", goal="Muscle", exercises=[{"id": 1, "name": "Squat", "sets": 3, "reps": "8", "rpe": "7", "evil": "x"}]), user=coach)
tid = t["id"]
check("template created; unknown exercise keys dropped", {"id", "name", "sets", "reps", "rpe"} <= t["exercises"][0].keys() and "evil" not in t["exercises"][0])
check("coach lists own templates", len(M.get_coach_templates("COACH#CHR0001", user=coach)["templates"]) == 1)
upd = M.update_template(tid, M.TemplatePayload(exercises=[{"id": "1", "name": "Squat"}, {"id": "2", "name": "RDL"}]), user=coach)
check("update recalculates activities", upd["activities"] == "2 Exercises")
check("other coach cannot read/edit it (pinned to own partition) -> 404", raises(404, M.get_template, tid, user=coach2) and raises(404, M.update_template, tid, M.TemplatePayload(title="hax"), user=coach2))
check("other coach cannot list it -> 403", raises(403, M.get_coach_templates, "COACH#CHR0001", user=coach2))
check("coach passing someone else's coachId is ignored (still pinned)", raises(404, M.get_template, tid, coachId="COACH#CHR0001", user=coach2))
check("admin can open any template", M.get_template(tid, user=admin)["title"] == "PPL")
check("overlong title -> 400", raises(400, M.update_template, tid, M.TemplatePayload(title="x" * 101), user=coach))

print("\n== delete & session revocation ==")
check("admin accounts cannot be deleted -> 403", raises(403, M.delete_user, "ADMIN%23ADH001", user=admin))
check("delete unknown -> 404", raises(404, M.delete_user, "CLIENT%23NOPE", user=admin))
check("delete needs full key -> 400", raises(400, M.delete_user, "CLS0002", user=admin))
M.delete_user("CLIENT%23CLS0001", user=admin)
check("deleted user's token stops working immediately -> 401", raises(401, M.current_user, authorization=f"Bearer {client_tok}"))
check("stats endpoint returns live counts", M.get_admin_dashboard(user=admin)["stats"][0]["value"] == "4")

print(f"\n{passed} passed, {failed} failed")
raise SystemExit(1 if failed else 0)
