"""Tests for: media access, objectKey, progress review + photos, today's workout, activity tracking, admin monitor."""
import time
from datetime import datetime, timezone, timedelta
from harness import main, TABLE, HTTPException

M = main
passed = failed = 0
def check(label, cond):
    global passed, failed
    if cond: passed += 1; print(f"  PASS  {label}")
    else: failed += 1; print(f"  FAIL  {label}")
def raises(status, fn, *a, **k):
    try: fn(*a, **k)
    except HTTPException as e: return e.status_code == status
    return False
def auth(tok): return M.current_user(authorization=f"Bearer {tok}")

class FakeS3:
    def generate_presigned_url(self, op, Params, ExpiresIn): return f"https://s3.example/{Params['Key']}?sig=1"
    def generate_presigned_post(self, Bucket, Key, Fields, Conditions, ExpiresIn):
        return {'url': 'https://s3.example', 'fields': {**Fields, 'key': Key}}
    def head_object(self, Bucket, Key): return {'ContentType': 'image/jpeg', 'ContentLength': 1234}
M.s3 = FakeS3(); M.CLIENT_MEDIA_BUCKET = 'bucket'

def mk(pk, role, name, **extra):
    TABLE.put_item({"PK": pk, "SK": M.PROFILE_SK, "role": role, "name": name, "email": f"{name.lower()}@x.com",
                    "status": "ACTIVE", "passwordHash": M.hash_password("Passw0rd123"), "mustChangePassword": False,
                    "onboardingCompleted": True, "pwdChangedAt": int(time.time()) - 10, "createdAt": "2026-01-01T00:00:00+00:00", **extra})

mk("ADMIN#AD1", "ADMIN", "Boss")
mk("COACH#CH1", "COACH", "Rakesh")
mk("COACH#CH2", "COACH", "Maya")
mk("CLIENT#CL1", "CLIENT", "Asha", coachId="COACH#CH1")      # full-key coachId
mk("CLIENT#CL2", "CLIENT", "Ben", coachId="CH1")             # bare-id coachId
mk("CLIENT#CL3", "CLIENT", "Cara")                           # unassigned, never signs in

def login(code, role):
    return M.login(M.LoginPayload(identifier=code, password="Passw0rd123", role=role))

print("\n== activity tracking ==")
r_admin = login("AD1", "ADMIN"); r_coach = login("CH1", "COACH"); r_c1 = login("CL1", "CLIENT"); r_c2 = login("CL2", "CLIENT")
admin, coach, c1, c2 = (auth(r["token"]) for r in (r_admin, r_coach, r_c1, r_c2))
p = TABLE.d[("CLIENT#CL1", M.PROFILE_SK)]
check("login stamps lastLoginAt / lastActiveAt / loginCount", p["lastLoginAt"] and p["lastActiveAt"] and p["loginCount"] == 1)
login("CL1", "CLIENT")
check("second login increments loginCount", TABLE.d[("CLIENT#CL1", M.PROFILE_SK)]["loginCount"] == 2)
before = TABLE.d[("CLIENT#CL1", M.PROFILE_SK)]["lastActiveAt"]
auth(r_c1["token"])
check("requests inside the throttle window do not rewrite lastActiveAt", TABLE.d[("CLIENT#CL1", M.PROFILE_SK)]["lastActiveAt"] == before)
TABLE.d[("CLIENT#CL1", M.PROFILE_SK)]["lastActiveAt"] = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
auth(r_c1["token"])
check("an old lastActiveAt is refreshed by the next request", M.parse_iso(TABLE.d[("CLIENT#CL1", M.PROFILE_SK)]["lastActiveAt"]) > datetime.now(timezone.utc) - timedelta(seconds=30))

print("\n== 3-day photos return objectKey; media access ==")
key = "clients/CL1/3-day-log/day-1/lunch-abc.jpg"
TABLE.put_item({"PK": "CLIENT#CL1", "SK": "3DAYPHOTO#DAY1#LUNCH", "meal": "Lunch", "objectKey": key, "contentType": "image/jpeg", "uploadedAt": "2026-10-01T10:00:00+00:00"})
st = M.get_athlete_check_status("CL1", user=c1)
photo = st["days"][0]["photos"][0]
check("check-status photo carries objectKey (so the app can open it in the in-app viewer)", photo["objectKey"] == key)
check("client can view own photo", M.get_media_view_url(key, user=c1)["objectKey"] == key)
check("assigned coach (full-key coachId) can view client photo", M.get_media_view_url(key, user=coach)["objectKey"] == key)
key2 = "clients/CL2/progress/1/front-x.jpg"
check("assigned coach (bare coachId) can view client photo", M.get_media_view_url(key2, user=coach)["viewUrl"].startswith("https://"))
key3 = "clients/CL3/progress/1/front-x.jpg"
check("coach cannot view an unassigned client's photo -> 403", raises(403, M.get_media_view_url, key3, user=coach))
check("client cannot view another client's photo -> 403", raises(403, M.get_media_view_url, key, user=c2))
check("path traversal rejected -> 403", raises(403, M.get_media_view_url, "clients/CL1/../CL2/x.jpg", user=c1))
check("admin can view anything", M.get_media_view_url(key3, user=admin)["objectKey"] == key3)

print("\n== check-in + progress photos + progress review ==")
ck = M.save_checkin(M.CheckinPayload(weight=80.0, adherence="strict", workoutQuality="strong", waist=82.0, notes="good"), user=c1)["checkinId"]
time.sleep(0.01)
ck2 = M.save_checkin(M.CheckinPayload(weight=79.0, adherence="mostly", workoutQuality="maintained"), user=c1)["checkinId"]
up = M.create_progress_photo_upload(M.ProgressPhotoUploadPayload(checkinId=ck2, angle="Front", fileName="a.jpg", contentType="image/jpeg"), user=c1)
check("progress upload key is under the client's progress folder", up["objectKey"].startswith("clients/CL1/progress/") and "/front-" in up["objectKey"])
check("bad angle -> 400", raises(400, M.create_progress_photo_upload, M.ProgressPhotoUploadPayload(checkinId=ck2, angle="top", fileName="a.jpg", contentType="image/jpeg"), user=c1))
check("unknown check-in -> 404", raises(404, M.create_progress_photo_upload, M.ProgressPhotoUploadPayload(checkinId="CHECKIN#nope", angle="front", fileName="a.jpg", contentType="image/jpeg"), user=c1))
check("cannot attach to someone else's check-in", raises(404, M.create_progress_photo_upload, M.ProgressPhotoUploadPayload(checkinId=ck2, angle="front", fileName="a.jpg", contentType="image/jpeg"), user=c2))
check("complete rejects a foreign object key -> 403", raises(403, M.complete_progress_photo, M.ProgressPhotoCompletePayload(checkinId=ck2, angle="front", objectKey="clients/CL2/progress/1/front-x.jpg"), user=c1))
M.complete_progress_photo(M.ProgressPhotoCompletePayload(checkinId=ck2, angle="front", objectKey=up["objectKey"], originalFileName="a.jpg"), user=c1)
prog = M.get_client_progress("CH1", "CL1", user=coach)
check("progress review returns real check-ins oldest->newest", [c["weight"] for c in prog["checkins"]] == [80.0, 79.0])
check("progress review summary: weight change and avg adherence", prog["summary"]["weightChange"] == -1.0 and prog["summary"]["averageAdherence"] == 87.5)
check("progress photo is attached to its check-in", prog["checkins"][1]["photos"][0]["objectKey"] == up["objectKey"] and prog["checkins"][0]["photos"] == [])
check("progress photo is viewable by the coach through /media/view", M.get_media_view_url(up["objectKey"], user=coach)["objectKey"] == up["objectKey"])
coach2 = auth(login("CH2", "COACH")["token"])
check("unassigned coach cannot open another coach's client progress -> 403", raises(403, M.get_client_progress, "CH2", "CL1", user=coach2))
check("coach cannot read another coach's id path -> 403", raises(403, M.get_client_progress, "CH1", "CL1", user=coach2))
check("bare-id coachId client is reachable", M.get_client_progress("CH1", "CL2", user=coach)["client"]["name"] == "Ben")

print("\n== assign + today's workout ==")
TABLE.put_item({"PK": "COACH#CH1", "SK": "TEMPLATE#t1", "title": "Push Day", "goal": "Muscle", "workoutDays": "Mon / Wed / Fri",
                "estimatedDuration": "45 min", "exercises": [{"id": "1", "name": "Bench"}, {"id": "2", "name": "Row"}]})
mon = "2026-10-19"   # a Monday
res = M.assign_template_to_client("CH1", "t1", M.AssignTemplatePayload(clientId="CL2", startDate="2026-10-01"), user=coach)
check("assign works when the client's coachId is the bare id", res["assignmentId"].startswith("asgn_"))
asg = M.assign_template_to_client("CH1", "t1", M.AssignTemplatePayload(clientId="CL1", startDate="2026-10-01"), user=coach)["assignmentId"]
dash = M.get_athlete_dashboard("CL1", date=mon, user=c1)
check("Monday: today's training shows the assigned plan as pending", any(t["title"] == "Push Day" and t["statusText"] == "pending" for t in dash["todayTraining"]))
check("dashboard includes assignedSchedules", len(dash["assignedSchedules"]) == 1)
check("Tuesday: plan not scheduled", not M.get_athlete_dashboard("CL1", date="2026-10-20", user=c1)["todayTraining"])
M.log_workout(M.WorkoutLogPayload(assignmentId=asg, date=mon, completed=True), user=c1)
dash = M.get_athlete_dashboard("CL1", date=mon, user=c1)
check("logging the workout flips today's card to completed", dash["todayTraining"][0]["statusText"] == "completed")
check("workoutsThisWeek / workoutCompletion are computed", dash["workoutsThisWeek"] == 1 and dash["workoutCompletion"] == 33)
M.log_workout(M.WorkoutLogPayload(assignmentId=asg, date=mon, completed=False), user=c1)
check("un-logging reverts it", M.get_athlete_dashboard("CL1", date=mon, user=c1)["todayTraining"][0]["statusText"] == "pending")
check("cannot log someone else's plan -> 404", raises(404, M.log_workout, M.WorkoutLogPayload(assignmentId=asg, date=mon), user=c2))
check("bad date -> 400", raises(400, M.log_workout, M.WorkoutLogPayload(assignmentId=asg, date="x"), user=c1))
check("no plans -> no workoutCompletion key (UI shows 'no data')", "workoutCompletion" not in M.get_athlete_dashboard("CL3", date=mon, user=M.current_user.__globals__['get_profile']("CLIENT#CL3") and {"pk": "CLIENT#CL3", "role": "CLIENT"}))
check("schedule_days parsing", M.schedule_days("Mon / Wed / Fri") == {0, 2, 4} and M.schedule_days("") is None and M.schedule_days("Daily") is None)

print("\n== admin monitor ==")
mon_data = M.get_admin_monitor(user=admin)
s = mon_data["summary"]
check("summary counts roles", s["totalClients"] == 3 and s["totalCoaches"] == 2)
check("online now counts people who just signed in", s["onlineNow"] >= 3)
check("never-signed-in and unassigned are surfaced", s["neverSignedIn"] == 1 and s["unassignedClients"] == 1)
rows = {r["id"]: r for r in mon_data["clients"]}
check("client row: presence, coach name, plan + checkin stats", rows["CL1"]["presence"] == "ONLINE" and rows["CL1"]["coachName"] == "Rakesh" and rows["CL1"]["plansAssigned"] == 1 and rows["CL1"]["checkinsTotal"] == 2)
check("bare-id coachId resolves to coach name", rows["CL2"]["coachName"] == "Rakesh")
check("unassigned never-signed-in client", rows["CL3"]["presence"] == "NEVER" and rows["CL3"]["coachName"] is None)
crow = {r["id"]: r for r in mon_data["coaches"]}
check("coach row: client count + online clients", crow["CH1"]["clientCount"] == 2 and crow["CH1"]["clientsOnlineNow"] == 2)
check("recent events include logins and check-ins", {"login", "checkin"} <= {e["type"] for e in mon_data["recentEvents"]})
blob = str(mon_data)
check("no password hashes / lock counters leak", "scrypt$" not in blob and "passwordHash" not in blob and "failedAttempts" not in blob)
check("non-admin cannot call monitor (403)", raises(403, M.require_roles('ADMIN'), user=coach))
TABLE.d[("CLIENT#CL2", M.PROFILE_SK)]["lastActiveAt"] = (datetime.now(timezone.utc) - timedelta(days=20)).isoformat()
TABLE.d[("CLIENT#CL2", M.PROFILE_SK)]["lastLoginAt"] = TABLE.d[("CLIENT#CL2", M.PROFILE_SK)]["lastActiveAt"]
for k in [k for k in TABLE.d if k[0] == "CLIENT#CL2" and k[1].startswith("CHECKIN#")]: del TABLE.d[k]
check("a 20-day-old client is INACTIVE", {r["id"]: r for r in M.get_admin_monitor(user=admin)["clients"]}["CL2"]["presence"] == "INACTIVE")

print("\n== template reference image can't point at other people's media ==")
check("create with a client's photo key -> 400", raises(400, M.create_template, "CH1", M.TemplatePayload(title="x", referenceImageKey="clients/CL1/3-day-log/day-1/lunch-abc.jpg"), user=coach))
check("create with own coaches/ key works", M.create_template("CH1", M.TemplatePayload(title="ok", referenceImageKey="coaches/CH1/ref.jpg"), user=coach)["referenceImageKey"] == "coaches/CH1/ref.jpg")
check("update to a foreign key -> 400", raises(400, M.update_template, "t1", M.TemplatePayload(referenceImageKey="clients/CL2/progress/1/front-x.jpg"), user=coach))
check("traversal key -> 400", raises(400, M.update_template, "t1", M.TemplatePayload(referenceImageKey="coaches/CH1/../../clients/CL1/a.jpg"), user=coach))
TABLE.d[("COACH#CH1", "TEMPLATE#legacy")] = {"PK": "COACH#CH1", "SK": "TEMPLATE#legacy", "title": "old", "referenceImageKey": "clients/CL1/3-day-log/day-1/lunch-abc.jpg"}
check("legacy template pointing at a client photo is never signed -> 404", raises(404, M.get_template_image_view, "legacy", user=coach))

print(f"\n{passed} passed, {failed} failed")
raise SystemExit(1 if failed else 0)
