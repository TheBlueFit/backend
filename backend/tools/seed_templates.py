#!/usr/bin/env python3
"""
seed_templates.py
=================
Seed workout templates directly into DynamoDB — no AI, no image upload.

Usage
-----
  python seed_templates.py \
      --coach-id COACH#CHR001 \
      --file templates.json \
      [--table BlueFit-Table] \
      [--region eu-west-1] \
      [--dry-run]

JSON format
-----------
The script accepts either one template object or an array of template objects.
For app-side import, one template object per JSON file is recommended.

[
  {
    "title": "6-Week Hypertrophy Block",
    "description": "Progressive overload for muscle growth.",
    "goal": "Muscle Gain",
    "level": "Intermediate",
    "workoutDays": "Mon / Wed / Fri",
    "estimatedDuration": "60 min",
    "equipment": "Barbell, Dumbbells, Cable Machine",
    "exercises": [
      {
        "name": "Barbell Back Squat",
        "sets": "4",
        "reps": "8-10",
        "rpe": "8",
        "notes": "Pause 1s at bottom"
      }
    ]
  }
]

Notes
-----
- Run with AWS credentials that have PutItem on the BlueFit-Table.
- Each template gets a new SK  TEMPLATE#tpl_<8-char hex>  so re-running the
  script never overwrites existing templates.
- Use --dry-run to preview what would be written without touching DynamoDB.
"""

import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional


# ── DynamoDB helpers ────────────────────────────────────────────────────────────

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def to_dynamo(obj: Any) -> Any:
    """Recursively convert float → Decimal and drop None values (DynamoDB requirements)."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: to_dynamo(v) for k, v in obj.items() if v is not None}
    if isinstance(obj, list):
        return [to_dynamo(v) for v in obj]
    return obj


def clean(value: Optional[Any], limit: int = 500) -> str:
    """Coerce to str, strip whitespace, truncate to limit."""
    if value is None:
        return ""
    s = str(value).strip()
    if len(s) > limit:
        print(f"  ⚠  Value truncated to {limit} chars: {s[:40]}…", file=sys.stderr)
        s = s[:limit]
    return s


# ── Template builder ────────────────────────────────────────────────────────────

def build_template_item(coach_pk: str, raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convert one JSON template object into a DynamoDB item ready for put_item.
    Unknown fields are ignored so the JSON can carry extra metadata.
    """
    exercises_raw: List[Dict[str, Any]] = raw.get("exercises") or []
    if len(exercises_raw) > 100:
        raise ValueError(f"Template '{raw.get('title')}' has {len(exercises_raw)} exercises (max 100).")

    exercises = []
    for ex in exercises_raw:
        exercises.append({
            "id":      clean(ex.get("id") or uuid.uuid4().hex[:8], 100),
            "order":   clean(ex.get("order") or len(exercises) + 1, 20),
            "section": clean(ex.get("section"), 100),
            "type":    clean(ex.get("type"), 100),
            "name":    clean(ex.get("name"), 150),
            "sets":    clean(ex.get("sets"), 100),
            "reps":    clean(ex.get("reps"), 100),
            "rest":    clean(ex.get("rest"), 100),
            "tempo":   clean(ex.get("tempo"), 100),
            "weight":  clean(ex.get("weight"), 100),
            "rpe":     clean(ex.get("rpe"), 100),
            "notes":   clean(ex.get("notes"), 500),
        })

    now = now_iso()
    template_id = f"tpl_{uuid.uuid4().hex[:8]}"
    activities = clean(raw.get("activities")) or f"{len(exercises)} Exercises"

    return {
        "PK":                coach_pk,
        "SK":                f"TEMPLATE#{template_id}",
        "type":              "TEMPLATE",
        "title":             clean(raw.get("title"), 100) or "Untitled Template",
        "description":       clean(raw.get("description"), 500),
        "goal":              clean(raw.get("goal"), 50) or "General Fitness",
        "workoutDays":       clean(raw.get("workoutDays"), 50),
        "activities":        activities,
        "exercises":         exercises,
        "level":             clean(raw.get("level"), 50),
        "estimatedDuration": clean(raw.get("estimatedDuration"), 50),
        "equipment":         clean(raw.get("equipment"), 200),
        "referenceImageKey": clean(raw.get("referenceImageKey"), 500),
        "createdAt":         now,
        "updatedAt":         now,
    }


# ── Main ────────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed workout templates into BlueFit DynamoDB from a JSON file."
    )
    parser.add_argument(
        "--coach-id",
        required=True,
        help='Full PK of the coach, e.g. COACH#CHR001',
    )
    parser.add_argument(
        "--file",
        required=True,
        help="Path to a JSON file containing an array of template objects.",
    )
    parser.add_argument(
        "--table",
        default="BlueFit-Table",
        help="DynamoDB table name (default: BlueFit-Table).",
    )
    parser.add_argument(
        "--region",
        default=None,
        help="AWS region (default: from environment / ~/.aws/config).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the items that would be written without touching DynamoDB.",
    )
    args = parser.parse_args()

    # ── Validate coach-id format ───────────────────────────────────────────────
    coach_pk: str = args.coach_id.strip()
    if not coach_pk.startswith("COACH#"):
        # Accept bare codes too, e.g. CHR001
        coach_pk = f"COACH#{coach_pk}"

    # ── Load JSON ──────────────────────────────────────────────────────────────
    try:
        with open(args.file, "r", encoding="utf-8") as fh:
            data = json.load(fh)
    except FileNotFoundError:
        print(f"❌  File not found: {args.file}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as exc:
        print(f"❌  Invalid JSON in {args.file}: {exc}", file=sys.stderr)
        sys.exit(1)

    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        print("❌  JSON must be a template object or an array of template objects.", file=sys.stderr)
        sys.exit(1)

    if not data:
        print("⚠  No templates found in file — nothing to do.")
        return

    # ── Build items ────────────────────────────────────────────────────────────
    items: List[Dict[str, Any]] = []
    for i, raw in enumerate(data):
        try:
            item = build_template_item(coach_pk, raw)
            items.append(item)
        except (ValueError, TypeError) as exc:
            print(f"❌  Template #{i + 1} is invalid: {exc}", file=sys.stderr)
            sys.exit(1)

    # ── Dry-run preview ────────────────────────────────────────────────────────
    if args.dry_run:
        print(f"\n🔍  DRY RUN — {len(items)} template(s) would be seeded into "
              f"'{args.table}' for coach '{coach_pk}':\n")
        for item in items:
            exs = item.get("exercises", [])
            print(f"  ✦ [{item['SK']}]  {item['title']}")
            print(f"      goal={item['goal']}  level={item['level']}  "
                  f"days={item['workoutDays']}  exercises={len(exs)}")
        print("\nRe-run without --dry-run to write to DynamoDB.\n")
        return

    # ── Write to DynamoDB ──────────────────────────────────────────────────────
    try:
        import boto3  # type: ignore
    except ImportError:
        print("❌  boto3 is not installed.  Run: pip install boto3", file=sys.stderr)
        sys.exit(1)

    kwargs: Dict[str, Any] = {}
    if args.region:
        kwargs["region_name"] = args.region

    dynamodb = boto3.resource("dynamodb", **kwargs)
    table = dynamodb.Table(args.table)

    ok = 0
    failed = 0
    for item in items:
        dynamo_item = to_dynamo(item)
        try:
            table.put_item(Item=dynamo_item)
            print(f"  ✅  Seeded: {item['title']}  ({item['SK']})")
            ok += 1
        except Exception as exc:  # noqa: BLE001
            print(f"  ❌  Failed to seed '{item['title']}': {exc}", file=sys.stderr)
            failed += 1

    print(f"\nDone — {ok} seeded, {failed} failed.\n")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
