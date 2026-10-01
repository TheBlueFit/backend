// Define the core keys every item in the table will share
export interface DynamoDBBaseItem {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  createdAt: string;
  updatedAt: string;
}

// Client Profile Entity
export interface ClientProfile extends DynamoDBBaseItem {
  type: 'CLIENT';
  coachId: string; // Used to build GSI1PK
  name: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  baseline: {
    weight: number;
    height: number;
    goals: string;
  };
}

// Daily Tracking Log Entity
export interface DailyLog extends DynamoDBBaseItem {
  type: 'DAILY_LOG';
  date: string; // YYYY-MM-DD
  adherenceScore: number;
  tasks: {
    water: number;
    steps: number;
    proteinHit: boolean;
    workoutCompleted: boolean;
  };
}

// Diet Plan Assignment Entity
export interface DietPlan extends DynamoDBBaseItem {
  type: 'DIET_PLAN';
  status: 'ACTIVE' | 'ARCHIVED';
  targetCalories: number;
  targetProtein: number;
  mealsCount: number;
  items: Array<{
    name: string;
    portionGrams: number;
    calories: number;
    protein: number;
  }>;
}