#!/usr/bin/env python3
"""Development-only seed utility for The Blue Fit.

Seeds realistic sample data for ONE existing client who is assigned to ONE existing coach.
It does not create users. It can optionally set the client's coachId with --assign.

Usage examples:
  TABLE_NAME=BlueFit-Table AWS_DEFAULT_REGION=ap-south-1 \
    python tools/seed_test_data.py --coach CHR001 --client CLS001 --assign

  python tools/seed_test_data.py --coach CHR001 --client CLS001 --clear-existing

This script is intentionally outside the Lambda handler and should never be exposed as an API route.
"""

from __future__ import annotations

import argparse
import io
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import boto3
from botocore.exceptions import ClientError
from PIL import Image, ImageDraw, ImageFont


table_name = os.environ.get("TABLE_NAME", "BlueFit-Table")
region = os.environ.get("AWS_DEFAULT_REGION") or os.environ.get("AWS_REGION")


dynamodb = boto3.resource("dynamodb", region_name=region)
table = dynamodb.Table(table_name)
s3 = boto3.client("s3", region_name=region)


MEALS = ["Breakfast", "Brunch", "Lunch", "Snacks", "Dinner"]

SAMPLE_MEALS = {
    1: {
        "Breakfast": "3 eggs, 2 slices whole-grain toast, black coffee",
        "Brunch": "Greek yogurt with berries and almonds",
        "Lunch": "Grilled chicken, basmati rice, mixed vegetables",
        "Snacks": "Banana and whey protein shake",
        "Dinner": "Paneer tikka, roti, cucumber salad",
    },
    2: {
        "Breakfast": "Oats with milk, banana, chia seeds",
        "Brunch": "Two boiled eggs and an apple",
        "Lunch": "Chicken wrap, curd and salad",
        "Snacks": "Roasted peanuts and buttermilk",
        "Dinner": "Fish, rice and sautéed vegetables",
    },
    3: {
        "Breakfast": "Omelette with vegetables and toast",
        "Brunch": "Protein smoothie with banana and oats",
        "Lunch": "Paneer rice bowl with vegetables",
        "Snacks": "Greek yogurt and fruit",
        "Dinner": "Chicken curry, roti and salad",
    },
}


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def short_id(pk: str) -> str:
    return pk.split("#", 1)[1] if "#" in pk else pk


def profile(pk: str) -> dict[str, Any] | None:
    response = table.get_item(Key={"PK": pk, "SK": "PROFILE#BASELINE"}, ConsistentRead=True)
    return response.get("Item")


def delete_matching(pk: str, prefixes: tuple[str, ...]) -> int:
    response = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("PK").eq(pk)
    )
    deleted = 0
    for item in response.get("Items", []):
        sk = str(item.get("SK", ""))
        if any(sk.startswith(prefix) for prefix in prefixes):
            table.delete_item(Key={"PK": pk, "SK": sk})
            deleted += 1
    return deleted


def put(item: dict[str, Any]) -> None:
    table.put_item(Item=item)


def seed_logs(client_pk: str, clear_existing: bool) -> int:
    if clear_existing:
        delete_matching(client_pk, ("3DAYLOG#DAY", "3DAYPHOTO#DAY"))

    now = datetime.now(timezone.utc)
    count = 0
    for day in (1, 2, 3):
        created = now - timedelta(days=3 - day)
        put(
            {
                "PK": client_pk,
                "SK": f"3DAYLOG#DAY{day}",
                "type": "THREE_DAY_LOG",
                "day": day,
                "meals": SAMPLE_MEALS[day],
                "createdAt": iso(created),
                "updatedAt": iso(created),
            }
        )
        count += 1
    return count


def seed_checkins(client_pk: str, clear_existing: bool) -> int:
    if clear_existing:
        delete_matching(client_pk, ("CHECKIN#SEED#",))

    now = datetime.now(timezone.utc)
    values = [
        (28, 176.0, 82.5, "excellent", "strong", "Completed all planned sessions and stayed on nutrition plan."),
        (21, 176.0, 82.0, "good", "good", "Minor fatigue mid-week; sleep improved after adjusting training volume."),
        (14, 176.0, 81.7, "excellent", "excellent", "Good recovery and consistent meals."),
        (7, 176.0, 81.4, "good", "good", "One missed accessory session; otherwise consistent."),
    ]

    count = 0
    for days_ago, height, weight, adherence, quality, notes in values:
        ts = now - timedelta(days=days_ago)
        sk = f"CHECKIN#SEED#{ts.strftime('%Y%m%dT%H%M%SZ')}"
        put(
            {
                "PK": client_pk,
                "SK": sk,
                "type": "CHECKIN",
                "weight": Decimal(str(weight)),
                "waist": Decimal("88.0"),
                "adherence": adherence,
                "workoutQuality": quality,
                "notes": notes,
                "createdAt": iso(ts),
            }
        )
        count += 1
    return count


def seed_training(client_pk: str, clear_existing: bool) -> int:
    date_key = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if clear_existing:
        # Only remove rows created by this development seed utility.
        delete_matching(client_pk, (f"TRAINING#{date_key}#SEED#",))

    rows = [
        (1, "Upper Body Strength", "Chest, shoulders and triceps", "Completed", "completed"),
        (2, "Lower Body Strength", "Squat, hinge and unilateral work", "Pending", "pending"),
        (3, "Zone 2 Cardio", "25 min easy-moderate conditioning", "Pending", "pending"),
    ]

    now = iso(datetime.now(timezone.utc))
    count = 0
    for n, title, subtitle, status_text, status_color in rows:
        put(
            {
                "PK": client_pk,
                "SK": f"TRAINING#{date_key}#SEED#{n:02d}",
                "type": "TRAINING",
                "seed": "DEV",
                "title": title,
                "subtitle": subtitle,
                "statusText": status_text,
                "statusColor": status_color,
                "createdAt": now,
                "updatedAt": now,
            }
        )
        count += 1
    return count


def make_sample_png(day: int, meal: str) -> bytes:
    """Create a simple local sample image so the signed photo viewer can be tested."""
    image = Image.new("RGB", (900, 600), (22, 24, 28))
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 52)
        small = ImageFont.truetype("DejaVuSans.ttf", 28)
    except OSError:
        font = ImageFont.load_default()
        small = font

    title = f"Blue Fit • Day {day}"
    subtitle = f"Sample {meal} photo"
    bbox = draw.textbbox((0, 0), title, font=font)
    draw.text(((900 - (bbox[2] - bbox[0])) / 2, 220), title, fill=(225, 228, 232), font=font)
    bbox2 = draw.textbbox((0, 0), subtitle, font=small)
    draw.text(((900 - (bbox2[2] - bbox2[0])) / 2, 300), subtitle, fill=(155, 160, 168), font=small)

    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


def seed_photos(client_pk: str, clear_existing: bool, bucket: str | None) -> int:
    if not bucket:
        raise SystemExit("--sample-photos requires CLIENT_MEDIA_BUCKET or --bucket.")

    if clear_existing:
        delete_matching(client_pk, ("3DAYPHOTO#DAY",))

    client_code = short_id(client_pk)
    now = iso(datetime.now(timezone.utc))
    count = 0

    for day in (1, 2, 3):
        for meal in MEALS:
            file_name = f"day-{day}-{meal.lower()}-sample.png"
            object_key = (
                f"clients/{client_code}/3-day-log/day-{day}/"
                f"{meal.lower()}-seed.png"
            )
            content = make_sample_png(day, meal)
            s3.put_object(
                Bucket=bucket,
                Key=object_key,
                Body=content,
                ContentType="image/png",
                ServerSideEncryption="AES256",
            )
            put(
                {
                    "PK": client_pk,
                    "SK": f"3DAYPHOTO#DAY{day}#{meal.upper()}",
                    "type": "THREE_DAY_PHOTO",
                    "seed": "DEV",
                    "day": day,
                    "meal": meal,
                    "objectKey": object_key,
                    "contentType": "image/png",
                    "size": len(content),
                    "originalFileName": file_name,
                    "uploadedAt": now,
                    "createdAt": now,
                }
            )
            count += 1
    return count

def assign_client(client_pk: str, coach_pk: str) -> None:
    table.update_item(
        Key={"PK": client_pk, "SK": "PROFILE#BASELINE"},
        UpdateExpression="SET coachId = :coach",
        ExpressionAttributeValues={":coach": coach_pk},
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed Blue Fit development/test data for an assigned client.")
    parser.add_argument("--coach", required=True, help="Coach short ID, e.g. CHR001")
    parser.add_argument("--client", required=True, help="Client short ID, e.g. CLS001")
    parser.add_argument("--assign", action="store_true", help="Assign the client to this coach before seeding")
    parser.add_argument("--clear-existing", action="store_true", help="Clear existing seeded check-status/check-in/training rows before seeding")
    parser.add_argument("--sample-photos", action="store_true", help="Also upload sample PNGs to the private client media bucket and seed their DynamoDB metadata")
    parser.add_argument("--bucket", help="S3 bucket for --sample-photos; defaults to CLIENT_MEDIA_BUCKET")
    args = parser.parse_args()

    coach_pk = f"COACH#{args.coach.strip()}"
    client_pk = f"CLIENT#{args.client.strip()}"

    coach = profile(coach_pk)
    client = profile(client_pk)
    if not coach or coach.get("role") != "COACH":
        raise SystemExit(f"Coach not found: {coach_pk}")
    if not client or client.get("role") != "CLIENT":
        raise SystemExit(f"Client not found: {client_pk}")

    current_assignment = client.get("coachId")
    if args.assign:
        assign_client(client_pk, coach_pk)
        current_assignment = coach_pk
    elif current_assignment not in (coach_pk, args.coach.strip()):
        raise SystemExit(
            f"Client {client_pk} is not assigned to {coach_pk}. "
            f"Current coachId={current_assignment!r}. Run again with --assign if this is a dev/test environment."
        )

    logs = seed_logs(client_pk, args.clear_existing)
    checkins = seed_checkins(client_pk, args.clear_existing)
    training = seed_training(client_pk, args.clear_existing)
    photos = seed_photos(client_pk, args.clear_existing, args.bucket or os.environ.get("CLIENT_MEDIA_BUCKET")) if args.sample_photos else 0

    print("Seed completed.")
    print(f"Table:       {table_name}")
    print(f"Coach:       {coach_pk} ({coach.get('name', '')})")
    print(f"Client:      {client_pk} ({client.get('name', '')})")
    print(f"Assigned to: {current_assignment}")
    print(f"3-day logs:  {logs}")
    print(f"Check-ins:   {checkins}")
    print(f"Training:    {training}")
    print(f"Photos:      {photos}")


if __name__ == "__main__":
    try:
        main()
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "Unknown")
        message = exc.response.get("Error", {}).get("Message", str(exc))
        raise SystemExit(f"AWS error {code}: {message}") from exc
