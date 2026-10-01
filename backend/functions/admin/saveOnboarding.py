import json
import os
import boto3
from datetime import datetime, timezone

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLE_NAME'))

def handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        role = body.get('role', 'CLIENT').upper()
        
        # Generate ID based on current timestamp
        timestamp = int(datetime.now(timezone.utc).timestamp() * 1000)
        user_id = f"{role}#{timestamp}"
        
        item = {
            'PK': user_id,
            'SK': 'PROFILE#BASELINE',
            'createdAt': datetime.now(timezone.utc).isoformat()
        }
        item.update(body) 
        
        table.put_item(Item=item)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'message': f"{role} profile provisioned successfully",
                'userId': user_id
            })
        }
    except Exception as e:
        print(f"DynamoDB Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }