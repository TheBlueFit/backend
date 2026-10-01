"""
Create (or reset) the Master Admin account.

The password is typed at a hidden prompt, hashed with salted scrypt, and only the hash is
written to DynamoDB. It is never printed, logged, or stored anywhere else.

Usage (run from the backend/ folder, with your normal AWS credentials configured):
    pip install boto3
    python scripts/create_admin.py --email you@example.com
    python scripts/create_admin.py --email you@example.com --reset     # change the password later
"""
import argparse
import getpass
import hashlib
import os
import sys
import time
from datetime import datetime, timezone

import boto3


def hash_password(raw: str) -> str:
    # MUST match hash_password() in functions/core_api/main.py
    salt = os.urandom(16)
    digest = hashlib.scrypt(raw.encode('utf-8'), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)
    return f"scrypt${salt.hex()}${digest.hex()}"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--email', required=True)
    parser.add_argument('--code', default='ADH001', help='Admin login ID (default ADH001)')
    parser.add_argument('--table', default='BlueFit-Table')
    parser.add_argument('--region', default='us-east-1')
    parser.add_argument('--reset', action='store_true', help='Replace the password of an existing admin')
    args = parser.parse_args()

    pw1 = getpass.getpass('New admin password (min 12 characters): ')
    pw2 = getpass.getpass('Repeat password: ')
    if pw1 != pw2:
        print('Passwords do not match.'); return 1
    if len(pw1) < 12 or pw1.isalpha() or pw1.isdigit():
        print('Use at least 12 characters, mixing letters and numbers.'); return 1

    table = boto3.resource('dynamodb', region_name=args.region).Table(args.table)
    code = args.code.strip().upper()
    pk = f"ADMIN#{code}"
    now = datetime.now(timezone.utc).isoformat(timespec='milliseconds')
    existing = table.get_item(Key={'PK': pk, 'SK': 'PROFILE#BASELINE'}).get('Item')

    if existing and not args.reset:
        print(f'{pk} already exists. Re-run with --reset to change its password.'); return 1

    table.put_item(Item={
        'PK': pk, 'SK': 'PROFILE#BASELINE',
        'role': 'ADMIN', 'name': 'Master Admin', 'email': args.email.strip().lower(),
        'userCode': code, 'status': 'ACTIVE',
        'passwordHash': hash_password(pw1),
        'mustChangePassword': False, 'onboardingCompleted': True,
        'failedAttempts': 0, 'lockedUntil': 0,
        'pwdChangedAt': int(time.time()),                     # signs out every older session
        'createdAt': existing['createdAt'] if existing else now, 'updatedAt': now,
    })
    print(f'{"Updated" if existing else "Created"} admin {pk}. Sign in with ID "{code}" and the password you just set.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
