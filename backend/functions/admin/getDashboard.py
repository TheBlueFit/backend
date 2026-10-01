import json
import os
import boto3
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('TABLE_NAME'))

def handler(event, context):
    try:
        response = table.scan(
            FilterExpression=Attr('SK').eq('PROFILE#BASELINE')
        )
        items = response.get('Items', [])
        
        total_users = len(items)
        active_coaches = sum(1 for u in items if u.get('role') == 'COACH')

        admin_stats = {
            "stats": [
                { "label": 'Total Users', "value": str(total_users), "icon": 'Users', "glowColor": 'var(--text-primary)' },
                { "label": 'Active Coaches', "value": str(active_coaches), "icon": 'Shield', "glowColor": '#60A5FA' },
                { "label": 'Generated Diets', "value": '840', "icon": 'Utensils', "glowColor": 'var(--accent-gold)' },
                { "label": 'System Health', "value": '99.9%', "icon": 'Activity', "glowColor": 'var(--accent-green)', "isPulse": True },
            ]
        }

        return {
            'statusCode': 200,
            'headers': { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
            'body': json.dumps(admin_stats)
        }
    except Exception as e:
        print(f"DynamoDB Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': { "Access-Control-Allow-Origin": "*" },
            'body': json.dumps({'error': str(e)})
        }