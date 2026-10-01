# The Blue Fit: Technical Documentation

## Overview
The Blue Fit is a serverless, full-stack fitness and nutrition orchestration platform. It provides role-based portals for Athletes (Clients), Coaches, and Administrators, utilizing a high-performance Next.js frontend and an AWS-native serverless backend.

## Technology Stack
*   **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide Icons.
*   **Backend:** AWS Serverless Application Model (SAM), Amazon API Gateway, AWS Lambda (Node.js / Python).
*   **Database:** Amazon DynamoDB (Single Table Design).
*   **Design System:** Custom glassmorphism UI utilizing native CSS variables alongside Tailwind utility classes.

## Application Structure
### Frontend Routing (`src/app/`)
*   `/client`: Athlete portal featuring daily adherence tracking, task management, and the diet planner orchestrator.
*   `/coach`: Coach portal featuring client overviews, KPI tracking, and workout template management.
*   `/admin`: Master control panel for user directory management, global analytics, and role-based provisioning.
*   `/admin/onboarding`: Multi-step client intake and baseline assessment form.

### Database Schema (Single Table Design)
The DynamoDB table uses a unified structure to handle multiple entities without requiring relational joins:
*   **Partition Key (PK):** `[ROLE]#[TIMESTAMP]` (e.g., `CLIENT#1726880000000`, `COACH#1726880000000`)
*   **Sort Key (SK):** Entity type identifier (e.g., `PROFILE#BASELINE`)

## Deployment Instructions
1.  **Backend Deployment:** Navigate to the `backend/` directory and execute `sam build && sam deploy` to provision the API Gateway, Lambda functions, and DynamoDB tables.
2.  **Frontend Deployment:** Configure the local `.env` file with the generated API Gateway endpoint URL, then execute `npm run dev` to launch the Next.js Turbopack compiler.

## Pending Architecture Implementations
1.  **State Management:** Bind physical attribute inputs in `InitialAssessment` to React state for payload injection.
2.  **Data Retrieval:** Develop Lambda functions and API Gateway `GET` routes to populate the Coach and Admin directories dynamically.
3.  **Authentication:** Secure API endpoints and frontend routes using an authentication provider.