import json

def handler(event, context):
    try:
        # Mock data mapping exactly to CoachDashboard.tsx
        dashboard_data = {
            "stats": [
                { "label": 'Active Clients', "value": '24', "icon": 'Users', "glowColor": 'var(--text-primary)' },
                { "label": "Today's Adherence", "value": '82%', "icon": 'TrendingUp', "glowColor": 'var(--accent-green)', "isPulse": True },
                { "label": 'Pending Reviews', "value": '3', "icon": 'CheckCircle2', "glowColor": 'var(--accent-gold)' },
                { "label": 'Missed Check-ins', "value": '2', "icon": 'AlertCircle', "glowColor": '#FF453A' },
            ],
            "recentActivity": [
                { "id": 1, "client": 'Kavitha M.', "action": 'Logged Workout', "time": '2 hours ago', "status": 'completed' },
                { "id": 2, "client": 'Prudhvi R.', "action": 'Missed Weekly Check-in', "time": '4 hours ago', "status": 'missed' },
                { "id": 3, "client": 'Sarah Jenkins', "action": 'Uploaded Progress Photos', "time": '5 hours ago', "status": 'completed' },
            ]
        }

        return {
            'statusCode': 200,
            'headers': { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
            'body': json.dumps(dashboard_data)
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': { "Access-Control-Allow-Origin": "*" },
            'body': json.dumps({'error': str(e)})
        }