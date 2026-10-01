import json
import os
import boto3
from datetime import datetime, timezone

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLE_NAME'))

def handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        client_id = body.get('clientId', 'CLIENT#TEST123')
        
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        checkin_id = f"CHECKIN#{timestamp}"
        
        item = {
            'PK': client_id,
            'SK': checkin_id,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        item.update(body)
        
        table.put_item(Item=item)
        
        return {
            'statusCode': 200,
            'headers': { "Access-Control-Allow-Origin": "*" },
            'body': json.dumps({'message': 'Check-in logged successfully', 'checkinId': checkin_id})
        }
    except Exception as e:
        print(f"DynamoDB Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': { "Access-Control-Allow-Origin": "*" },
            'body': json.dumps({'error': str(e)})
        }