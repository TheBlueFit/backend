# Blue Fit - 3-Day Check Status update

This update adds a real 3-Day Check Status flow.

## Client routes
- `/client/check-status` - view onboarding/3-day status, edit meal entries, optionally upload photos.

## Coach route
- `/coach/clients/[clientId]/check-status` - assigned coach can review a client's entries and view authorized photo links.

## Storage
- Meal text and photo metadata live in DynamoDB.
- Actual images live in a private S3 bucket.
- Browser uploads use short-lived S3 presigned POSTs.
- Browser viewing uses short-lived S3 presigned GET URLs.
- Photos are optional. No client is blocked from completing the log because they skipped a photo.

## Deploy
1. Replace `backend/functions/core_api/main.py` and `backend/template.yaml` with the versions in this package.
2. From `backend/`, run `sam build`.
3. Run `sam deploy` with your existing stack.
4. After deploy, rebuild/restart the frontend.

## Security
The new routes use the existing signed-session authorization. A coach is only allowed to read a client when the client is assigned to that coach. Direct object access is restricted by server-generated S3 keys and IAM permissions.
