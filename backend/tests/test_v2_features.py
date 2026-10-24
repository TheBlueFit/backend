"""Tests for: sessions (refresh/logout), presence + Monitor accuracy, messaging, coach analytics (steps / client data),
health logging, bulk template import, CORS defaults, weekday ranges."""
import time
from datetime import datetime, timezone, timedelta
from harness import main, TABLE, HTTPException

M = main
passed = failed = 0


def check(label, cond):
    global passed, failed
    if cond:
        passed += 1; print(f"  PASS  {label}")
    else:
        failed += 1; print(f"  FAIL  {label}")


def raises(status, fn, *a, **k):
    try:
        fn(*a, **k)
    except HTTPException as e:
        return e.status_code == status
    return False


def auth(tok):
    return M.current_user(authorization=f"Bearer {tok}")


def mk(pk, role, name, **extra):
    TABLE.put_item({"PK": pk, "SK": M.PROFILE_SK, "role": role, "name": name, "email": f"{name.lower()}@x.com",
                    "status": "ACTIVE", "passwordHash": M.hash_password("Passw0rd123"), "mustChangePassword": False,
                    "onboardingCompleted": True, "pwdChangedAt": int(time.time()) - 10,
                    "createdAt": "2026-01-01T00:00:00+00:00", **extra})


def login(code, role):
    return M.login(M.LoginPayload(identifier=code, password="Passw0rd123", role=role))


mk("ADMIN#AD1", "ADMIN", "Boss")
mk("COACH#CH1", "COACH", "Rakesh")
mk("COACH#CH2", "COACH", "Maya")
mk("CLIENT#CL1", "CLIENT", "Asha", coachId="COACH#CH1", age=29, height=165, weight=61, primaryGoal="fat_loss")
mk("CLIENT#CL2", "CLIENT", "Ben", coachId="CH1")
mk("CLIENT#CL3", "CLIENT", "Cara")                       # no coach

print("\n== configuration ==")
check("production web app + localhost are allowed origins by default",
      "https://bluefit-1g5.pages.dev" in M.DEFAULT_ORIGINS.split(',') and "http://localhost:3000" in M.DEFAULT_ORIGINS.split(','))
check("sessions last 30 days", M.TOKEN_TTL_SECONDS == 30 * 24 * 3600)

print("\n== sessions: refresh + logout ==")
r_admin, r_coach, r_c1, r_c2 = (login(c, r) for c, r in (("AD1", "ADMIN"), ("CH1", "COACH"), ("CL1", "CLIENT"), ("CL2", "CLIENT")))
admin, coach, c1, c2 = (auth(r["token"]) for r in (r_admin, r_coach, r_c1, r_c2))
import base64, json
claims = json.loads(base64.urlsafe_b64decode(r_c1["token"].split('.')[1] + "=="))
check("token expires ~30 days out", 29 * 86400 < claims["exp"] - claims["iat"] <= 30 * 86400)
count_before = TABLE.d[("CLIENT#CL1", M.PROFILE_SK)]["loginCount"]
time.sleep(1.1)
fresh = M.refresh_session(user=c1)
check("refresh returns a new working token", fresh["token"] != r_c1["token"] and auth(fresh["token"])["pk"] == "CLIENT#CL1")
check("refresh is not counted as a login", TABLE.d[("CLIENT#CL1", M.PROFILE_SK)]["loginCount"] == count_before)
check("refresh response has no secrets", not ({"passwordHash", "SK"} & set(fresh)))

print("\n== presence: ping / logout ==")
ping = M.presence_ping(user=c1)
check("ping answers with server time and unread count", "serverTime" in ping and ping["unreadMessages"] == 0)
check("a fresh login is ONLINE", M.profile_presence(TABLE.d[("CLIENT#CL1", M.PROFILE_SK)])["presence"] == "ONLINE")
M.logout(user=c1)
prof = TABLE.d[("CLIENT#CL1", M.PROFILE_SK)]
check("sign-out is recorded", prof.get("lastLogoutAt"))
check("a signed-out person is no longer ONLINE", M.profile_presence(prof)["presence"] == "TODAY")
time.sleep(0.01)
prof["lastActiveAt"] = M.now_iso()        # opening the app again (new request after logout)
check("activity after sign-out makes them ONLINE again", M.profile_presence(prof)["presence"] == "ONLINE")
prof["lastActiveAt"] = (datetime.now(timezone.utc) - timedelta(minutes=4)).isoformat(timespec='milliseconds')
check("4 minutes of silence = not online (heartbeat stopped)", M.profile_presence(prof)["presence"] == "TODAY")

mon = M.get_admin_monitor(user=admin)
by_id = {c["id"]: c for c in mon["clients"]}
check("monitor lists clients + coaches", len(mon["clients"]) == 3 and len(mon["coaches"]) == 2)
check("monitor: never-signed-in client is NEVER", by_id["CL3"]["presence"] == "NEVER")
check("monitor: online coach counted", any(c["presence"] == "ONLINE" for c in mon["coaches"]))
check("monitor: client who went quiet is not counted online", by_id["CL1"]["presence"] == "TODAY")
check("monitor: coach name shown for bare-id and full-key assignments", by_id["CL1"]["coachName"] == "Rakesh" and by_id["CL2"]["coachName"] == "Rakesh")
check("monitor: unassigned client flagged", mon["summary"]["unassignedClients"] == 1)
check("monitor: sorted events have a timestamp each", all("T" in e["at"] for e in mon["recentEvents"]))

print("\n== messaging ==")
check("client with no coach cannot send", raises(409, M.send_message, "CL3", M.MessagePayload(text="hi"), user=auth(login("CL3", "CLIENT")["token"])))
check("empty message rejected", raises(400, M.send_message, "CL1", M.MessagePayload(text="   "), user=c1))
check("over-long message rejected", raises(400, M.send_message, "CL1", M.MessagePayload(text="x" * 2001), user=c1))
m1 = M.send_message("CL1", M.MessagePayload(text="Hi coach, knee feels better", clientMsgId="abc"), user=c1)["message"]
check("client message stored, marked as mine", m1["mine"] and m1["sender"] == "CLIENT" and m1["clientMsgId"] == "abc")
check("coach sees 1 unread via heartbeat", M.presence_ping(user=coach)["unreadMessages"] == 1)
threads = M.list_threads(user=coach)["threads"]
t1 = next(t for t in threads if t["clientId"] == "CL1")
check("coach inbox row: unread + preview + client presence", t1["unread"] == 1 and "knee" in t1["lastMessageText"] and t1["peer"]["name"] == "Asha")
check("coach inbox lists clients without messages too", {t["clientId"] for t in threads} == {"CL1", "CL2"})
check("conversations with messages sort first", threads[0]["clientId"] == "CL1")
check("coach of someone else cannot open it", raises(403, M.get_messages, "CL1", user=auth(login("CH2", "COACH")["token"])))
check("other client cannot open it", raises(403, M.get_messages, "CL1", user=c2))
check("admin cannot read private chats", raises(403, M.get_messages, "CL1", user=admin))
got = M.get_messages("CL1", user=coach)
check("coach reads the thread", [m["text"] for m in got["messages"]] == ["Hi coach, knee feels better"] and not got["messages"][0]["mine"])
check("reading clears the coach's unread count", M.presence_ping(user=coach)["unreadMessages"] == 0)
check("client sees 'seen' marker after coach reads", M.get_messages("CL1", user=c1)["peerLastReadAt"] is not None)
time.sleep(0.01)
r1 = M.send_message("CL1", M.MessagePayload(text="Great! Keep the tempo slow."), user=coach)["message"]
check("client gets unread badge from the coach reply", M.presence_ping(user=c1)["unreadMessages"] == 1)
poll = M.get_messages("CL1", after=m1["createdAt"], markRead=False, user=c1)
check("polling with ?after returns only newer messages", [m["text"] for m in poll["messages"] if m["id"] != m1["id"]] == ["Great! Keep the tempo slow."])
check("markRead=false leaves unread alone", M.presence_ping(user=c1)["unreadMessages"] == 1)
full = M.get_messages("CL1", user=c1)
check("client reads thread in order", [m["text"] for m in full["messages"]] == ["Hi coach, knee feels better", "Great! Keep the tempo slow."])
check("client unread cleared on read", M.presence_ping(user=c1)["unreadMessages"] == 0)
check("client thread summary shows coach", M.list_threads(user=c1)["threads"][0]["peer"]["name"] == "Rakesh")
for i in range(5):
    time.sleep(0.003)
    M.send_message("CL1", M.MessagePayload(text=f"note {i}"), user=c1)
page = M.get_messages("CL1", limit=3, user=c1)
check("history is paged (latest 3 + hasMore)", len(page["messages"]) == 3 and page["hasMore"] and page["messages"][-1]["text"] == "note 4")
older = M.get_messages("CL1", before=page["messages"][0]["createdAt"], limit=50, user=c1)
check("older page ends before the first loaded message", all(m["createdAt"] < page["messages"][0]["createdAt"] for m in older["messages"]) and len(older["messages"]) == 4)
check("bad cursor -> 400", raises(400, M.get_messages, "CL1", after="nope", user=c1))
M.mark_messages_read("CL1", user=coach)
check("explicit mark-read zeroes the coach badge", M.presence_ping(user=coach)["unreadMessages"] == 0)
M.assign_coach("CLIENT#CL1", M.AssignPayload(coachId="COACH#CH2"), user=admin)
check("re-assigning a client removes the old coach's inbox row", ("COACH#CH1", "INBOX#CL1") not in TABLE.d)
check("previous coach loses access after re-assignment", raises(403, M.get_messages, "CL1", user=coach))
M.assign_coach("CLIENT#CL1", M.AssignPayload(coachId="COACH#CH1"), user=admin)

print("\n== health logging + coach analytics ==")
today = M.utc_today()
yday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%d')
check("steps must be sane", raises(400, M.save_health_metrics, M.HealthMetricsPayload(steps=-5), user=c1))
check("sleep must be sane", raises(400, M.save_health_metrics, M.HealthMetricsPayload(sleepHours=40.0), user=c1))
check("only today (±1 day) can be written", raises(400, M.save_health_metrics, M.HealthMetricsPayload(steps=100, date="2020-01-01"), user=c1))
check("empty payload rejected", raises(400, M.save_health_metrics, M.HealthMetricsPayload(), user=c1))
M.save_health_metrics(M.HealthMetricsPayload(steps=6500, sleepHours=7.0, hydration=2.0, date=yday, source="manual"), user=c1)
M.save_health_metrics(M.HealthMetricsPayload(steps=8200, sleepHours=7.6, hydration=2.6, calories=410, heartRate=71, date=today, source="manual"), user=c1)
snap = TABLE.d[("CLIENT#CL1", f"HEALTH#{today}")]
check("snapshot stored for the phone's date with source", snap["steps"] == 8200 and snap["source"] == "manual")
check("coach can read a client's snapshot (bare-id coachId works too)", M.get_health_metrics("CL2", user=coach)["steps"] is None and M.get_health_metrics("CL1", user=coach)["steps"] == 8200)
check("unrelated coach cannot", raises(403, M.get_health_metrics, "CL1", user=auth(login("CH2", "COACH")["token"])))

prog = M.get_client_progress("CH1", "CL1", user=coach)
check("progress: client profile data for the coach", prog["profile"]["age"] == 29 and prog["profile"]["height"] == 165 and prog["profile"]["email"] == "asha@x.com")
check("progress: no password hash / lock fields leaked", not ({"passwordHash", "failedAttempts"} & set(prog["profile"])))
check("progress: 14-day health series", len(prog["health"]) >= 14 and prog["health"][-1]["steps"] in (8200, None))
check("progress: step count + averages for the coach", prog["activity"]["stepsLatest"] == 8200 and prog["activity"]["stepsAvg7d"] == 7350 and prog["activity"]["stepGoal"] == 10000)
check("progress: sleep / water averages", prog["activity"]["sleepAvg7d"] == 7.3 and prog["activity"]["hydrationAvg7d"] == 2.3)

print("\n== coach dashboard uses real data ==")
dash = M.get_coach_dashboard("CH1", user=coach)
stats = {s["label"]: s["value"] for s in dash["stats"]}
check("dashboard: steps tracker is no longer always 0", stats["Steps"] is not None and stats["Steps"] > 0)
check("dashboard: sleep + hydration trackers", stats["Sleep Consistency"] == 92 and stats["Hydration"] == 77)
check("dashboard: nothing planned -> workout completion is empty, not 0", stats["Workout Completion"] is None)
row = next(c for c in dash["clients"] if c["id"] == "CL1")
check("dashboard: per-client steps for the coach", row["stepsToday"] == 8200 and row["stepsAvg7d"] == 7350)
check("dashboard: 7-day rhythm", len(dash["weekly"]) == 7 and dash["weekly"][-1]["stepsPct"] == 82)
check("dashboard: summary has the step goal", dash["summary"]["stepGoal"] == 10000 and dash["summary"]["avgSteps"] == 7350)
roster = M.get_coach_clients("CH1", user=coach)["clients"]
check("roster shows steps, presence and unread", next(c for c in roster if c["id"] == "CL1")["stepsToday"] == 8200 and "unreadMessages" in roster[0])

# workouts feed the tracker
TABLE.put_item({"PK": "CLIENT#CL1", "SK": "SCHEDULE#asgn_1", "assignmentId": "asgn_1", "templateTitle": "Push", "startDate": "2020-01-01",
                "workoutDays": "Mon-Sun", "exercises": [{"name": "x"}], "status": "ACTIVE"})
M.log_workout(M.WorkoutLogPayload(assignmentId="asgn_1", date=today, completed=True), user=c1)
dash = M.get_coach_dashboard("CH1", user=coach)
stats = {s["label"]: s["value"] for s in dash["stats"]}
check("dashboard: workout completion from logs (1 of 7 days)", stats["Workout Completion"] == 14)
check("dashboard: workout appears in the activity feed", any("workout" in a["action"].lower() for a in dash["recentActivity"]))
ath = M.get_athlete_dashboard("CL1", date=today, user=c1)
check("athlete dashboard: real weekly bars + recovery from sleep", len(ath["weekly"]) == 7 and ath["weekly"][-1]["workoutPct"] == 100 and ath["recovery"] == 95)

print("\n== weekday ranges ==")
check("Mon-Fri expands", M.schedule_days("Mon-Fri") == {0, 1, 2, 3, 4})
check("Mon / Wed / Fri", M.schedule_days("Mon / Wed / Fri") == {0, 2, 4})
check("Monday to Wednesday", M.schedule_days("Monday to Wednesday") == {0, 1, 2})
check("Sat-Mon wraps the week", M.schedule_days("Sat-Mon") == {5, 6, 0})
check("empty = no fixed days", M.schedule_days("") is None)

print("\n== template import ==")
sample = [
    {"title": "6-Week Hypertrophy", "goal": "Muscle Gain", "workoutDays": ["Mon", "Wed", "Fri"], "exercises": [
        {"name": "Squat", "sets": 4, "reps": "8-10", "rpe": 8}, {"exercise": "Leg Press", "set": "3", "rep": "12", "notes": "n" * 900}]},
    {"name": "Alias plan", "duration": "45 min", "exercises": [{"Exercise": "Burpee", "Sets": "3", "Reps": "10"}, {"sets": "3"}]},
    {"title": "Broken one", "exercises": []},
    "not an object",
]
res = M.import_templates("CH1", M.ImportTemplatesPayload(templates=sample), user=coach)
check("import saves the good templates", len(res["created"]) == 2)
check("import reports the bad ones with a reason", {s["index"] for s in res["skipped"]} == {3, 4} and all(s["reason"] for s in res["skipped"]))
t0 = res["created"][0]
check("import: list-valued days and numeric sets are converted", t0["workoutDays"] == "Mon / Wed / Fri" and t0["exercises"][0]["sets"] == "4" and t0["exercises"][0]["rpe"] == "8")
check("import: over-long notes are shortened, not rejected", len(t0["exercises"][1]["notes"]) == 500 and t0["exercises"][1]["name"] == "Leg Press")
t1 = res["created"][1]
check("import: alias field names understood; nameless rows skipped with a warning", t1["title"] == "Alias plan" and t1["estimatedDuration"] == "45 min" and len(t1["exercises"]) == 1 and t1["warnings"])
check("imported templates show up in the coach's list", len(M.get_coach_templates("CH1", user=coach)["templates"]) == 2)
check("another coach cannot import into this account", raises(403, M.import_templates, "CH1", M.ImportTemplatesPayload(templates=sample), user=auth(login("CH2", "COACH")["token"])))
check("empty import rejected", raises(400, M.import_templates, "CH1", M.ImportTemplatesPayload(templates=[]), user=coach))
check("too many templates rejected", raises(400, M.import_templates, "CH1", M.ImportTemplatesPayload(templates=[sample[0]] * 26), user=coach))

print(f"\n{passed} passed, {failed} failed")
raise SystemExit(1 if failed else 0)
