# CLAUDE.md — NER-SHIELD

## Project Overview

NER-SHIELD is a Smart India Hackathon 2026 project for landslide risk analysis and early warning in the North Eastern Region of India.

The system consists of:

* Next.js frontend
* Spring Boot backend
* PostgreSQL + PostGIS database
* Python/FastAPI geospatial susceptibility model
* Future rainfall-triggered early warning model

## Architecture

Frontend → Spring Boot Backend → Python/FastAPI ML Services → Database

The frontend should communicate primarily with the Spring Boot backend.

Do not unnecessarily expose internal Python ML services directly to the frontend.

## Frontend

Location:

frontend/

Rules:

* Preserve the existing UI and design.
* Do not unnecessarily rewrite working components.
* Use environment variables for API URLs.
* Do not hardcode backend URLs.
* Do not expose secrets.
* Handle loading and error states correctly.

## Backend

Location:

backend/

Responsibilities:

* Primary API layer
* Business logic
* Database integration
* Authentication and authorization
* Communication with Python/FastAPI ML services

Rules:

* Keep controllers, services, DTOs, and repositories properly separated.
* Use environment variables for secrets and service URLs.
* Configure CORS correctly.
* Preserve existing API contracts where possible.

## Python ML Services

The Python susceptibility model has its own implementation rules.

Before modifying the susceptibility model, read the CLAUDE.md located inside the model directory.

Do not modify model invariants without explicit justification.

## API Integration

Expected flow:

User
→ Next.js Frontend
→ Spring Boot Backend
→ Python/FastAPI Service
→ Database / ML Model
→ Spring Boot Response
→ Frontend UI Update

Before changing APIs:

1. Inspect existing endpoints.
2. Inspect frontend API calls.
3. Inspect request and response DTOs.
4. Avoid creating duplicate endpoints.
5. Preserve existing functionality.

## Environment Variables

Never hardcode:

* API keys
* Database passwords
* Secrets
* Service credentials
* Production URLs

Use environment variables and ensure secret files are ignored by Git.

Maintain .env.example files without real secrets.

## Testing

Do not claim something works without testing it.

For integration work:

1. Run the backend.
2. Run the frontend.
3. Test APIs.
4. Check backend logs.
5. Check browser console errors.
6. Test end-to-end flows.
7. Run existing automated tests.
8. Run production builds where possible.

Fix the root cause of problems.

## Before Completing Work

Always report:

1. Summary of changes
2. Files changed
3. APIs tested
4. Test results
5. Build results
6. Issues fixed
7. Remaining limitations
8. Commands required to run the project
