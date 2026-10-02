from __future__ import annotations

import argparse
import os
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import boto3
from boto3.dynamodb.conditions import Key


TABLE_NAME = os.environ.get("TABLE_NAME", "BlueFit-Table")
REGION = os.environ.get("AWS_DEFAULT_REGION") or os.environ.get("AWS_REGION")

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)


# ---------------------------------------------------------------------------
# Trial clients currently assigned to CHV001
# ---------------------------------------------------------------------------

DEFAULT_CLIENTS = [
    "1790114363298",  # Hemanth
    "CLS001",         # Sandeep
    "CLS002",         # Suresh
]


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def put(item: dict[str, Any]) -> None:
    table.put_item(Item=item)


def delete_simulation_records(client_pk: str) -> int:
    response = table.query(
        KeyConditionExpression=Key("PK").eq(client_pk)
    )

    deleted = 0

    for item in response.get("Items", []):
        sk = str(item.get("SK", ""))

        if (
            sk.startswith("CHECKIN#SIM#")
            or sk.startswith("TRAINING#SIM#")
        ):
            table.delete_item(
                Key={
                    "PK": client_pk,
                    "SK": sk,
                }
            )
            deleted += 1

    return deleted


def profile(client_pk: str) -> dict | None:
    response = table.get_item(
        Key={
            "PK": client_pk,
            "SK": "PROFILE#BASELINE",
        },
        ConsistentRead=True,
    )

    return response.get("Item")


def simulate_client(
    client_id: str,
    pattern: str,
    days: int = 7,
    clear_existing: bool = True,
) -> dict[str, Any]:

    client_pk = f"CLIENT#{client_id}"

    client = profile(client_pk)

    if not client:
        raise RuntimeError(f"Client not found: {client_pk}")

    if client.get("role") != "CLIENT":
        raise RuntimeError(f"{client_pk} is not a CLIENT")

    if clear_existing:
        deleted = delete_simulation_records(client_pk)
    else:
        deleted = 0

    # Different behavioral patterns make the UI easier to validate.
    patterns = {
        "high": {
            "steps": [11200, 10400, 12100, 9800, 11600, 10800, 12500],
            "sleep": [7.8, 7.5, 8.0, 7.2, 7.7, 7.9, 8.1],
            "hydration": [2.8, 2.6, 3.0, 2.5, 2.9, 2.7, 3.1],
            "adherence": [100, 100, 90, 100, 100, 90, 100],
            "workout": [True, True, True, True, True, True, True],
        },
        "mixed": {
            "steps": [8200, 9100, 6800, 10400, 7600, 8700, 7200],
            "sleep": [6.8, 7.1, 5.9, 7.4, 6.5, 7.0, 6.2],
            "hydration": [2.1, 2.3, 1.8, 2.5, 2.0, 2.2, 1.9],
            "adherence": [75, 75, 40, 100, 75, 75, 40],
            "workout": [True, True, False, True, True, False, True],
        },
        "low": {
            "steps": [5400, 6100, 4800, 6900, 5200, 5800, 4300],
            "sleep": [5.8, 6.2, 5.5, 6.0, 5.7, 6.3, 5.4],
            "hydration": [1.5, 1.7, 1.4, 1.9, 1.6, 1.8, 1.3],
            "adherence": [40, 75, 40, 40, 75, 40, 40],
            "workout": [False, True, False, False, True, False, False],
        },
    }

    data = patterns[pattern]

    now = datetime.now(timezone.utc)

    checkins = 0
    training = 0

    for index in range(days):
        day = now - timedelta(days=days - 1 - index)

        date_key = day.strftime("%Y-%m-%d")
        timestamp = iso(day)

        # ---------------------------------------------------------------
        # Daily activity / check-in
        # ---------------------------------------------------------------

        adherence_score = data["adherence"][index % len(data["adherence"])]

        if adherence_score >= 90:
            adherence = "strict"
            workout_quality = "strong"
        elif adherence_score >= 70:
            adherence = "mostly"
            workout_quality = "maintained"
        else:
            adherence = "struggled"
            workout_quality = "weak"

        put(
            {
                "PK": client_pk,
                "SK": f"CHECKIN#SIM#{date_key}",
                "type": "CHECKIN",
                "seed": "TRIAL_SIMULATION",

                "weight": Decimal(
                    str(
                        round(
                            float(client.get("weight", 78))
                            - (index * 0.12),
                            1,
                        )
                    )
                ),

                "waist": Decimal("86.5"),

                "adherence": adherence,
                "adherenceScore": Decimal(str(adherence_score)),

                "workoutQuality": workout_quality,
                "workoutCompleted": data["workout"][index % len(data["workout"])],

                "steps": Decimal(
                    str(data["steps"][index % len(data["steps"])])
                ),

                "sleepHours": Decimal(
                    str(data["sleep"][index % len(data["sleep"])])
                ),

                "hydrationLiters": Decimal(
                    str(data["hydration"][index % len(data["hydration"])])
                ),

                "notes": (
                    "Trial simulation activity record. "
                    "Used only for pre-launch dashboard validation."
                ),

                "createdAt": timestamp,
                "updatedAt": timestamp,
            }
        )

        checkins += 1

        # ---------------------------------------------------------------
        # Daily training task
        # ---------------------------------------------------------------

        completed = data["workout"][index % len(data["workout"])]

        put(
            {
                "PK": client_pk,
                "SK": f"TRAINING#SIM#{date_key}#01",
                "type": "TRAINING",
                "seed": "TRIAL_SIMULATION",

                "title": "Daily Training Session",
                "subtitle": "Strength + conditioning",

                "statusText": "Completed" if completed else "Missed",
                "statusColor": "completed" if completed else "red",

                "completed": completed,

                "createdAt": timestamp,
                "updatedAt": timestamp,
            }
        )

        training += 1

    return {
        "client": client_pk,
        "pattern": pattern,
        "days": days,
        "checkins": checkins,
        "training": training,
        "deleted": deleted,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed 7-day simulated activity for Blue Fit trial clients."
    )

    parser.add_argument(
        "--coach",
        default="CHV001",
        help="Coach short ID. Default: CHV001",
    )

    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Number of simulated days. Default: 7",
    )

    parser.add_argument(
        "--clear-existing",
        action="store_true",
        help="Remove previous TRIAL_SIMULATION records before inserting new ones.",
    )

    args = parser.parse_args()

    if args.days < 1 or args.days > 30:
        raise SystemExit("--days must be between 1 and 30.")

    # Deliberately different behavior profiles.
    simulations = [
        (DEFAULT_CLIENTS[0], "high"),
        (DEFAULT_CLIENTS[1], "mixed"),
        (DEFAULT_CLIENTS[2], "low"),
    ]

    print()
    print("==============================================")
    print(" BLUE FIT — 7 DAY ACTIVITY SIMULATION")
    print("==============================================")
    print(f"Table:  {TABLE_NAME}")
    print(f"Region: {REGION}")
    print(f"Coach:  COACH#{args.coach}")
    print()

    for client_id, pattern in simulations:
        result = simulate_client(
            client_id=client_id,
            pattern=pattern,
            days=args.days,
            clear_existing=args.clear_existing,
        )

        print(
            f"{result['client']}: "
            f"{result['pattern']} | "
            f"{result['checkins']} check-ins | "
            f"{result['training']} training records | "
            f"deleted={result['deleted']}"
        )

    print()
    print("Simulation completed successfully.")
    print()
    print("Client behavior:")
    print("  Hemanth -> HIGH")
    print("  Sandeep -> MIXED")
    print("  Suresh  -> LOW")
    print()


if __name__ == "__main__":
    main()