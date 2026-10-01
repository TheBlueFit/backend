import json

def handler(event, context):
    client_data = {
        "workout": "Push Day",
        "diet": "High-protein, 2500 kcal",
        "adherence": "90%"
    }
    
    return {
        'statusCode': 200,
        'headers': { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        'body': json.dumps(client_data)
    }