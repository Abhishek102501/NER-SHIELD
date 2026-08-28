NER-SHIELD

AI-Powered Landslide Risk Intelligence, Early Warning & Emergency Response Platform

Smart India Hackathon 2026 --- SIH26001
Organization: Ministry of Development of North Eastern Region
(MDoNER)
Theme: Disaster Management

Core USP: Predict → Explain → Simulate → Prioritize → Respond

1. Overview

NER-SHIELD is an enterprise-style disaster intelligence and
decision-support platform designed for the North Eastern Region (NER) of
India.

The platform combines environmental, geospatial, satellite, terrain,
historical, sensor and field-report evidence to estimate landslide risk,
explain contributing factors, assess potential impact, prioritize
emergency response and issue actionable warnings.

NER-SHIELD is designed to move disaster management from reactive
reporting toward predictive, explainable and action-oriented
intelligence.

Important: NER-SHIELD is a decision-support system. It does not
replace official emergency decisions and does not claim guaranteed
prediction of every disaster event.

2. Problem Statement

The North Eastern Region is highly exposed to landslides, flash floods,
road blockages and slope failures associated with heavy rainfall,
fragile terrain and unplanned hill cutting.

Current challenges include:

Limited real-time prediction of landslide-prone zones

Fragmented weather, satellite, terrain, sensor and incident data

Delayed identification of vulnerable slope changes

Difficulty assessing impacts on roads, villages and infrastructure

Manual field reporting and weak connectivity in remote areas

Need for explainable and actionable warnings rather than raw model
outputs

NER-SHIELD addresses these gaps by combining AI/ML, GIS, environmental
intelligence and emergency-response workflows in a unified platform.

3. Vision

Transform disaster management from reactive reporting into predictive, explainable and action-oriented intelligence.

NER-SHIELD follows a continuous operational loop:

PREDICT
   ↓
EXPLAIN
   ↓
SIMULATE
   ↓
PRIORITIZE
   ↓
RESPOND

4. Objectives

Create dynamic landslide risk maps

Estimate spatial and temporal landslide risk

Fuse satellite, environmental, terrain, sensor and field evidence

Provide explainable risk factors and confidence

Identify exposed roads, villages, bridges, schools and hospitals

Support what-if disaster scenarios

Prioritize emergency response

Provide multilingual and multi-channel alerts

Support offline-first field operations

Maintain secure role-based access and audit trails

5. Key Features

🗺️ 5.1 GIS Command Center

The command center provides a centralized operational view of disaster
conditions across the NER.

Features include:

Interactive GIS map

Risk-zone visualization

Terrain visualization

Rainfall overlays

Roads and rivers

Villages and schools

Hospitals, bridges and infrastructure

Incident locations

Layer controls

Zone selection and drill-down

Map recentering and navigation

Risk-focused visualization

The current frontend uses MapLibre GL with GeoJSON-based NER-SHIELD
data layers.

🤖 5.2 AI/ML Risk Intelligence

The AI service is responsible for specialized machine-learning and AI
processing.

Potential inputs include:

Rainfall

Terrain/elevation

Historical landslide information

Satellite-derived evidence

Environmental conditions

Sensor information

Field reports

The system is designed to generate:

Risk scores

Risk classifications

Contributing factors

Confidence information

Spatial risk predictions

Temporal risk trends

Planned/selected ML technologies include:

Scikit-learn

XGBoost / LightGBM

PyTorch where required

🛰️ 5.3 Satellite & Change Analysis

NER-SHIELD is designed to incorporate satellite evidence for detecting
environmental and terrain changes.

Capabilities include:

Satellite feature extraction

Change analysis

Evidence fusion

Computer-vision-assisted field evidence

Potential slope-change detection

The computer vision layer uses:

OpenCV

Suitable vision models

Python geospatial tooling

📍 5.4 Incident & Field Reporting

Field teams and authorized users can report incidents with geospatial
context.

A report can support:

Location

Incident type

Severity

Field observations

Photographs/media

Timestamp

Status

Related risk zone

The platform is designed for remote environments where connectivity may
be unreliable.

📡 5.5 Offline-First Operations

Field operations should continue even with poor connectivity.

The planned workflow is:

FIELD DEVICE
    ↓
Capture Report
    ↓
Local Storage
    ↓
Connectivity Restored
    ↓
Synchronization
    ↓
Backend
    ↓
AI / GIS / Alert Workflow

🚨 5.6 Alerts & Early Warning

NER-SHIELD is designed to generate actionable warnings based on risk
conditions.

Alert capabilities include:

Risk escalation

Incident escalation

Multilingual alerts

Multi-channel notification workflows

Acknowledgement tracking

Response escalation

The system should clearly communicate uncertainty and confidence rather
than presenting AI output as guaranteed prediction.

🏥 5.7 Impact & Exposure Assessment

The platform can assess potentially affected assets such as:

Roads

Bridges

Villages

Schools

Hospitals

Critical infrastructure

This helps authorities answer:

"What is at risk, and what should we respond to first?"

🔬 5.8 Explainable Risk

Instead of only displaying:

Risk = 87%

NER-SHIELD aims to explain the result using contributing factors such
as:

Risk Level: CRITICAL

Contributing Factors
├── Heavy rainfall
├── Steep terrain
├── Historical susceptibility
├── Recent environmental change
└── Nearby infrastructure exposure

🧪 5.9 What-If Simulation

The system is designed to support scenario analysis.

Example:

Scenario:
Rainfall increases significantly
        ↓
Risk recalculation
        ↓
Affected zones
        ↓
Exposed infrastructure
        ↓
Priority ranking
        ↓
Recommended response

This allows decision-makers to explore potential consequences before
acting.

6. System Architecture

NER-SHIELD uses a layered architecture with Spring Boot as the
operational backend and Python as the specialized AI/ML engine.

                         ┌───────────────────────┐
                         │       USERS           │
                         │ Authorities / Field   │
                         │ Teams / Communities   │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │     FRONTEND          │
                         │ Next.js + TypeScript  │
                         │ Tailwind CSS           │
                         │ MapLibre + Three.js   │
                         └───────────┬───────────┘
                                     │
                              REST / WebSocket
                                     │
                                     ▼
                  ┌──────────────────────────────────┐
                  │       SPRING BOOT BACKEND        │
                  │                                  │
                  │ Authentication & Authorization   │
                  │ Business APIs                    │
                  │ GIS APIs                         │
                  │ Incidents                        │
                  │ Field Reports                    │
                  │ Alerts                           │
                  │ Response Workflows               │
                  │ Audit Logs                       │
                  │ Orchestration                    │
                  └───────────────┬──────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
        ┌─────────────────────┐       ┌─────────────────────┐
        │ PostgreSQL +        │       │ Python AI SERVICE   │
        │ PostGIS             │       │                     │
        │                     │       │ FastAPI             │
        │ Spatial data        │       │ ML inference        │
        │ Incidents           │       │ Training            │
        │ Assets              │       │ Computer Vision     │
        │ Reports             │       │ GeoAI processing    │
        └─────────────────────┘       └──────────┬──────────┘
                                                  │
                                                  ▼
                                    ┌────────────────────────┐
                                    │ AI / ML STACK           │
                                    │ Scikit-learn            │
                                    │ XGBoost / LightGBM      │
                                    │ PyTorch                 │
                                    │ OpenCV                  │
                                    │ GeoPandas               │
                                    │ Rasterio / GDAL         │
                                    └────────────────────────┘

7. Technology Stack

Frontend

Technology          Purpose

Next.js             Web application framework
React               UI architecture
TypeScript          Type-safe development
Tailwind CSS        UI styling
Lucide React        Interface icons
Framer Motion       UI animation and motion
Recharts            Charts and analytics
MapLibre GL         Interactive GIS map
Three.js            3D graphics and advanced visualization
React Three Fiber   React integration for Three.js
React Three Drei    Three.js helper components

Current Frontend Versions

The current NER-SHIELD frontend package configuration includes:

Next.js        16.3.3
React          19.2.8
TypeScript     5.x
MapLibre GL    6.6.x
Three.js       0.185.1
Framer Motion  13.1.1
Recharts       3.10.1

Exact installed patch versions should be checked from
package-lock.json/the package manager lockfile when reproducing an
environment.

Core Backend

Technology          Purpose

Java 21             Core backend language
Spring Boot         Operational backend
Spring Security     Authentication and authorization
JWT / OAuth2        Secure identity/access
Spring Data JPA     Persistence layer
REST APIs           Frontend/backend communication
WebSocket / STOMP   Real-time updates

Spring Boot owns the main business and operational responsibilities.

AI / ML Service

Technology     Purpose

Python         AI/ML service
FastAPI        AI service API
Scikit-learn   Classical ML
XGBoost        Gradient-boosting models
LightGBM       Gradient-boosting models
PyTorch        Deep learning where required
OpenCV         Computer vision
GeoPandas      Geospatial processing
Rasterio       Raster/geospatial processing
GDAL           Geospatial data processing

Python is intentionally separated from the core backend so the ML
ecosystem can evolve independently.

Database

Technology   Purpose

PostgreSQL   Primary relational database
PostGIS      Spatial/geographic data
Redis        Caching and fast-access state

PostgreSQL + PostGIS is the central spatial data layer.

Maps & Geospatial

Technology    Purpose

MapLibre GL   Interactive web mapping
GeoJSON       Risk zones and spatial feature data
Terrain DEM   Elevation/terrain visualization
Three.js      Advanced 3D visualization
GeoPandas     Vector geospatial analysis
Rasterio      Raster processing
GDAL          Geospatial data transformation

DevOps & Cloud

Technology       Purpose

Docker           Containerization
Git              Version control
GitHub           Source control and collaboration
GitHub Actions   CI/CD
AWS              Cloud deployment target
Amazon S3        Object/media storage

Kafka or RabbitMQ may be introduced later if high-volume asynchronous
processing justifies it.

8. Data Strategy

NER-SHIELD is designed around multi-source evidence fusion.

Weather
   │
Satellite
   │
Terrain
   │
Historical Data
   │
Sensors
   │
Field Reports
   │
   ▼
DATA INGESTION
   │
   ▼
NORMALIZATION / VALIDATION
   │
   ▼
POSTGRESQL + POSTGIS
   │
   ├───────────────┐
   ▼               ▼
GIS ENGINE       AI ENGINE
   │               │
   └───────┬───────┘
           ▼
      RISK INTELLIGENCE
           │
     ┌─────┼─────┐
     ▼     ▼     ▼
  Explain Impact Alerts
     │     │     │
     └─────┼─────┘
           ▼
     RESPONSE ACTION

9. Risk Intelligence Workflow

1. Collect Evidence
        ↓
2. Validate & Normalize
        ↓
3. Spatial Processing
        ↓
4. AI/ML Risk Inference
        ↓
5. Explain Risk Factors
        ↓
6. Estimate Exposure
        ↓
7. Run What-If Scenario
        ↓
8. Prioritize Response
        ↓
9. Generate Warning
        ↓
10. Field Acknowledgement
        ↓
11. Feedback & Recalibration

10. GIS Map Architecture

The current frontend map is organized around MapLibre and GeoJSON data
sources.

LiveMap
│
├── Risk Zones
├── Rainfall Heatmap
├── Roads
├── Rivers
├── Villages
├── Schools
├── Infrastructure
└── Incidents

The map supports:

Layer visibility

Zone selection

Map recentering

Smooth camera movement

Risk visualization

Incident visualization

Terrain visualization

Future 3D/animated overlays

The intended premium visualization direction is:

3D Terrain
     ↓
Northeast India
     ↓
Risk Zones
     ↓
Rainfall
     ↓
Incidents
     ↓
Infrastructure Exposure
     ↓
Animated Intelligence Layers

11. User Roles

The platform is designed to support role-based access.

Potential roles include:

System Administrator

Disaster Management Authority

Command Center Operator

Field Response Team

Analyst

Citizen / Community Reporter

Permissions should follow least-privilege principles.

12. Security & Privacy

Security requirements include:

Role-based access control

Authentication and authorization

JWT/OAuth2

API protection

Rate limiting

Audit trails

Secure secret management

Minimal collection of citizen personal data

No secrets committed to source control

Controlled access to sensitive operational information

13. Reliability & Resilience

NER-SHIELD is designed for environments where external services and
connectivity may fail.

Strategies include:

Offline-first field operations

Last-known AI result when AI service is unavailable

Retry mechanisms

Service-state visibility

Caching

Fallback data sources where applicable

API failure handling

Explicit uncertainty and confidence indicators

14. Testing & Validation

Backend

JUnit

Mockito

Spring integration tests

API tests

Security tests

Testcontainers

Frontend

Component testing

End-to-end testing

UI interaction testing

AI/ML

Metrics may include:

Precision

Recall

F1-score

MAE

RMSE

False-alarm rate

Missed-event rate

Calibration

Warning lead time

Spatial validation

Temporal validation

AI performance claims should only be presented when supported by
documented validation.

15. SIH Demonstration Flow

The recommended SIH demonstration scenario is:

Command Center
      ↓
Rainfall Anomaly
      ↓
Risk Escalation
      ↓
Explainable Risk Factors
      ↓
Affected Roads / Villages / Infrastructure
      ↓
What-If Scenario
      ↓
Response Prioritization
      ↓
Field Photo / Report
      ↓
Python Computer Vision Analysis
      ↓
Updated Incident / Risk
      ↓
Multilingual Warning
      ↓
Acknowledgement

This demonstrates the complete Predict → Explain → Simulate →
Prioritize → Respond workflow.

16. Development Phases

Phase 0 --- Feasibility

Dataset identification

Baseline ML model

GIS prototype

Spring Boot skeleton

Python AI proof of concept

Phase 1 --- MVP

Authentication

RBAC

PostGIS

GIS dashboard

Risk model

Core APIs

Phase 2 --- Intelligence

Satellite features

Explainability

Computer vision

Field reports

Phase 3 --- Operations

Alerts

Impact assessment

Response prioritization

Offline synchronization

Multilingual support

Phase 4 --- Differentiation

Digital twin

What-if simulation

Optimization

Advanced validation

SIH presentation polish

17. Project Structure

The repository is organized around a modern Next.js frontend and a
modular backend architecture.

Current frontend structure

frontend/
│
├── app/
│   └── ...                     # Next.js application routes
│
├── components/
│   └── map/
│       ├── CommandMap.tsx
│       ├── LayerControl.tsx
│       ├── LiveMap.tsx
│       ├── MapLegend.tsx
│       ├── PrimaryActions.tsx
│       └── ZoneDetailPanel.tsx
│
├── data/
│   ├── geo.ts
│   ├── incidents.ts
│   └── layers.ts
│
├── lib/
│   └── ...                     # Shared application logic
│
├── types/
│   └── ...                     # TypeScript types
│
├── package.json
└── ...

Planned full-stack structure

NER-SHIELD/
│
├── frontend/
│   └── Next.js + TypeScript
│
├── backend/
│   └── Spring Boot + Java 21
│
├── ai-service/
│   └── Python + FastAPI
│
├── database/
│   └── PostgreSQL + PostGIS
│
├── docker/
│   └── Docker configuration
│
└── docs/
    └── Architecture / SRS / API documentation

18. Local Development

Frontend Requirements

Node.js 20.9+

npm

Git

Install

cd frontend
npm install

Run Development Server

npm run dev

The frontend runs on:

http://localhost:3000

The command center is available at:

http://localhost:3000/command

Production Build

npm run build

Start Production Server

npm start

Lint

npm run lint

19. Environment Variables

Secrets and environment-specific configuration should never be committed
to Git.

Use:

.env.local

for local frontend configuration and appropriate environment
configuration for backend/AI services.

Example structure:

NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_MAP_STYLE_URL=
API_URL=
AI_SERVICE_URL=
DATABASE_URL=
JWT_SECRET=

Only variables actually required by the implementation should be
added. Do not commit real credentials.

20. Git Collaboration Workflow

NER-SHIELD is intended to support parallel team development.

Recommended workflow

main
 │
 ├── feature/3d-map
 │
 ├── feature/dashboard
 │
 ├── feature/backend
 │
 ├── feature/ai-risk-engine
 │
 └── feature/alerts

Each contributor should:

git checkout main
git pull origin main

git checkout -b feature/<feature-name>

Commit changes:

git add .
git commit -m "feat: describe the change"

Push:

git push -u origin feature/<feature-name>

Then open a Pull Request.

Collaboration rules

Do not directly push feature work to main

Use one branch per feature

Keep commits focused

Pull/merge the latest main before major work

Review Pull Requests before merging

Avoid unnecessary changes to files owned by another feature

Keep main deployable/stable

21. Current Implementation vs Planned Architecture

Implemented / Present in the current frontend

Next.js frontend

React + TypeScript

Tailwind CSS

MapLibre GL

Interactive GIS map

GeoJSON risk zones

Rainfall heatmap layer

Roads

Rivers

Villages

Schools

Infrastructure

Incidents

Layer visibility controls

Risk-zone selection

Map navigation

Responsive map resizing

Three.js / React Three Fiber dependencies

Architecture / Implementation Target

Java 21 + Spring Boot backend

Spring Security

JWT/OAuth2

PostgreSQL + PostGIS

Python + FastAPI AI service

ML inference and training

Computer vision

Satellite analysis

Redis caching

Real-time WebSocket communication

Offline-first field workflows

Alert orchestration

AWS deployment

Docker

GitHub Actions

Future Scope

Kafka/RabbitMQ for high-volume asynchronous processing

GPU model serving where justified

Drone imagery

Multi-hazard intelligence

Advanced digital twin

Climate-risk forecasting

Infrastructure vulnerability assessment

Inter-agency integrations

22. Limitations

NER-SHIELD intentionally does not claim:

Guaranteed prediction of every landslide

Autonomous evacuation orders

Fully autonomous drones

Engineering-grade slope-stability certification

Nationwide production deployment in the initial MVP

The platform is designed to assist authorized decision-makers, not
replace them.

23. Risks & Mitigation

Risk                                Mitigation

Data scarcity                       Multiple permitted sources,
validation and uncertainty

AI unavailable                      Last-known result, service-state
indicator and retry

False alarms                        Calibration, baselines and human
verification

Missed events                       Data fusion and escalation

Low connectivity                    Offline-first field application

API downtime                        Caching and fallback sources

Scope creep                         MVP-first development

Backend complexity                  Modular monolith before unnecessary
microservices

24. Success Criteria

The target platform should provide:

Working Spring Boot core backend

Secure APIs

Working Python AI service

PostgreSQL/PostGIS spatial model

Operational GIS risk dashboard

Measured AI validation

Geo-tagged field reporting

Impact assessment

Response prioritization

Alert workflow

Offline capture and synchronization

At least one what-if scenario

Docker/AWS deployment path

Documented limitations

Reproducible demonstration

25. Why NER-SHIELD?

Traditional disaster monitoring often focuses on reporting what has
already happened.

NER-SHIELD aims to answer five operational questions:

1. WHAT IS LIKELY TO HAPPEN?
            ↓
2. WHY IS THE RISK INCREASING?
            ↓
3. WHAT COULD BE AFFECTED?
            ↓
4. WHAT HAPPENS IF CONDITIONS CHANGE?
            ↓
5. WHAT SHOULD WE PRIORITIZE NOW?

This turns raw environmental and geospatial information into an
operational decision-support workflow.

26. Core USP

Predict → Explain → Simulate → Prioritize → Respond

NER-SHIELD is not intended to be just another map or another prediction
model.

It combines:

AI + GIS + Environmental Intelligence + Explainability + Impact
Assessment + Scenario Simulation + Emergency Response

into a single disaster-management workflow.

27. Project Status

Project: NER-SHIELD
Problem Statement: SIH26001
Domain: Disaster Management
Target Region: North Eastern Region of India
Current Stage: Active development / SIH prototype

28. Team

Add your team members here:

Team Lead:
- Name

Team Members:
- Name
- Name
- Name
- Name

29. License

Add the project's final license here once the team decides on the
appropriate licensing model.

30. Acknowledgement

Built as a solution for Smart India Hackathon 2026, aligned with the
disaster-management challenge concerning AI-based early warning and
landslide risk monitoring in the North Eastern Region.NER-SHIELD

AI-Powered Landslide Risk Intelligence, Early Warning & Emergency Response Platform

Smart India Hackathon 2026 --- SIH26001
Organization: Ministry of Development of North Eastern Region
(MDoNER)
Theme: Disaster Management

Core USP: Predict → Explain → Simulate → Prioritize → Respond

1. Overview

NER-SHIELD is an enterprise-style disaster intelligence and
decision-support platform designed for the North Eastern Region (NER) of
India.

The platform combines environmental, geospatial, satellite, terrain,
historical, sensor and field-report evidence to estimate landslide risk,
explain contributing factors, assess potential impact, prioritize
emergency response and issue actionable warnings.

NER-SHIELD is designed to move disaster management from reactive
reporting toward predictive, explainable and action-oriented
intelligence.

Important: NER-SHIELD is a decision-support system. It does not
replace official emergency decisions and does not claim guaranteed
prediction of every disaster event.

2. Problem Statement

The North Eastern Region is highly exposed to landslides, flash floods,
road blockages and slope failures associated with heavy rainfall,
fragile terrain and unplanned hill cutting.

Current challenges include:

Limited real-time prediction of landslide-prone zones

Fragmented weather, satellite, terrain, sensor and incident data

Delayed identification of vulnerable slope changes

Difficulty assessing impacts on roads, villages and infrastructure

Manual field reporting and weak connectivity in remote areas

Need for explainable and actionable warnings rather than raw model
outputs

NER-SHIELD addresses these gaps by combining AI/ML, GIS, environmental
intelligence and emergency-response workflows in a unified platform.

3. Vision

Transform disaster management from reactive reporting into predictive, explainable and action-oriented intelligence.

NER-SHIELD follows a continuous operational loop:

PREDICT
   ↓
EXPLAIN
   ↓
SIMULATE
   ↓
PRIORITIZE
   ↓
RESPOND

4. Objectives

Create dynamic landslide risk maps

Estimate spatial and temporal landslide risk

Fuse satellite, environmental, terrain, sensor and field evidence

Provide explainable risk factors and confidence

Identify exposed roads, villages, bridges, schools and hospitals

Support what-if disaster scenarios

Prioritize emergency response

Provide multilingual and multi-channel alerts

Support offline-first field operations

Maintain secure role-based access and audit trails

5. Key Features

🗺️ 5.1 GIS Command Center

The command center provides a centralized operational view of disaster
conditions across the NER.

Features include:

Interactive GIS map

Risk-zone visualization

Terrain visualization

Rainfall overlays

Roads and rivers

Villages and schools

Hospitals, bridges and infrastructure

Incident locations

Layer controls

Zone selection and drill-down

Map recentering and navigation

Risk-focused visualization

The current frontend uses MapLibre GL with GeoJSON-based NER-SHIELD
data layers.

🤖 5.2 AI/ML Risk Intelligence

The AI service is responsible for specialized machine-learning and AI
processing.

Potential inputs include:

Rainfall

Terrain/elevation

Historical landslide information

Satellite-derived evidence

Environmental conditions

Sensor information

Field reports

The system is designed to generate:

Risk scores

Risk classifications

Contributing factors

Confidence information

Spatial risk predictions

Temporal risk trends

Planned/selected ML technologies include:

Scikit-learn

XGBoost / LightGBM

PyTorch where required

🛰️ 5.3 Satellite & Change Analysis

NER-SHIELD is designed to incorporate satellite evidence for detecting
environmental and terrain changes.

Capabilities include:

Satellite feature extraction

Change analysis

Evidence fusion

Computer-vision-assisted field evidence

Potential slope-change detection

The computer vision layer uses:

OpenCV

Suitable vision models

Python geospatial tooling

📍 5.4 Incident & Field Reporting

Field teams and authorized users can report incidents with geospatial
context.

A report can support:

Location

Incident type

Severity

Field observations

Photographs/media

Timestamp

Status

Related risk zone

The platform is designed for remote environments where connectivity may
be unreliable.

📡 5.5 Offline-First Operations

Field operations should continue even with poor connectivity.

The planned workflow is:

FIELD DEVICE
    ↓
Capture Report
    ↓
Local Storage
    ↓
Connectivity Restored
    ↓
Synchronization
    ↓
Backend
    ↓
AI / GIS / Alert Workflow

🚨 5.6 Alerts & Early Warning

NER-SHIELD is designed to generate actionable warnings based on risk
conditions.

Alert capabilities include:

Risk escalation

Incident escalation

Multilingual alerts

Multi-channel notification workflows

Acknowledgement tracking

Response escalation

The system should clearly communicate uncertainty and confidence rather
than presenting AI output as guaranteed prediction.

🏥 5.7 Impact & Exposure Assessment

The platform can assess potentially affected assets such as:

Roads

Bridges

Villages

Schools

Hospitals

Critical infrastructure

This helps authorities answer:

"What is at risk, and what should we respond to first?"

🔬 5.8 Explainable Risk

Instead of only displaying:

Risk = 87%

NER-SHIELD aims to explain the result using contributing factors such
as:

Risk Level: CRITICAL

Contributing Factors
├── Heavy rainfall
├── Steep terrain
├── Historical susceptibility
├── Recent environmental change
└── Nearby infrastructure exposure

🧪 5.9 What-If Simulation

The system is designed to support scenario analysis.

Example:

Scenario:
Rainfall increases significantly
        ↓
Risk recalculation
        ↓
Affected zones
        ↓
Exposed infrastructure
        ↓
Priority ranking
        ↓
Recommended response

This allows decision-makers to explore potential consequences before
acting.

6. System Architecture

NER-SHIELD uses a layered architecture with Spring Boot as the
operational backend and Python as the specialized AI/ML engine.

                         ┌───────────────────────┐
                         │       USERS           │
                         │ Authorities / Field   │
                         │ Teams / Communities   │
                         └───────────┬───────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │     FRONTEND          │
                         │ Next.js + TypeScript  │
                         │ Tailwind CSS           │
                         │ MapLibre + Three.js   │
                         └───────────┬───────────┘
                                     │
                              REST / WebSocket
                                     │
                                     ▼
                  ┌──────────────────────────────────┐
                  │       SPRING BOOT BACKEND        │
                  │                                  │
                  │ Authentication & Authorization   │
                  │ Business APIs                    │
                  │ GIS APIs                         │
                  │ Incidents                        │
                  │ Field Reports                    │
                  │ Alerts                           │
                  │ Response Workflows               │
                  │ Audit Logs                       │
                  │ Orchestration                    │
                  └───────────────┬──────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
        ┌─────────────────────┐       ┌─────────────────────┐
        │ PostgreSQL +        │       │ Python AI SERVICE   │
        │ PostGIS             │       │                     │
        │                     │       │ FastAPI             │
        │ Spatial data        │       │ ML inference        │
        │ Incidents           │       │ Training            │
        │ Assets              │       │ Computer Vision     │
        │ Reports             │       │ GeoAI processing    │
        └─────────────────────┘       └──────────┬──────────┘
                                                  │
                                                  ▼
                                    ┌────────────────────────┐
                                    │ AI / ML STACK           │
                                    │ Scikit-learn            │
                                    │ XGBoost / LightGBM      │
                                    │ PyTorch                 │
                                    │ OpenCV                  │
                                    │ GeoPandas               │
                                    │ Rasterio / GDAL         │
                                    └────────────────────────┘

7. Technology Stack

Frontend

Technology          Purpose

Next.js             Web application framework
React               UI architecture
TypeScript          Type-safe development
Tailwind CSS        UI styling
Lucide React        Interface icons
Framer Motion       UI animation and motion
Recharts            Charts and analytics
MapLibre GL         Interactive GIS map
Three.js            3D graphics and advanced visualization
React Three Fiber   React integration for Three.js
React Three Drei    Three.js helper components

Current Frontend Versions

The current NER-SHIELD frontend package configuration includes:

Next.js        16.3.3
React          19.2.8
TypeScript     5.x
MapLibre GL    6.6.x
Three.js       0.185.1
Framer Motion  13.1.1
Recharts       3.10.1

Exact installed patch versions should be checked from
package-lock.json/the package manager lockfile when reproducing an
environment.

Core Backend

Technology          Purpose

Java 21             Core backend language
Spring Boot         Operational backend
Spring Security     Authentication and authorization
JWT / OAuth2        Secure identity/access
Spring Data JPA     Persistence layer
REST APIs           Frontend/backend communication
WebSocket / STOMP   Real-time updates

Spring Boot owns the main business and operational responsibilities.

AI / ML Service

Technology     Purpose

Python         AI/ML service
FastAPI        AI service API
Scikit-learn   Classical ML
XGBoost        Gradient-boosting models
LightGBM       Gradient-boosting models
PyTorch        Deep learning where required
OpenCV         Computer vision
GeoPandas      Geospatial processing
Rasterio       Raster/geospatial processing
GDAL           Geospatial data processing

Python is intentionally separated from the core backend so the ML
ecosystem can evolve independently.

Database

Technology   Purpose

PostgreSQL   Primary relational database
PostGIS      Spatial/geographic data
Redis        Caching and fast-access state

PostgreSQL + PostGIS is the central spatial data layer.

Maps & Geospatial

Technology    Purpose

MapLibre GL   Interactive web mapping
GeoJSON       Risk zones and spatial feature data
Terrain DEM   Elevation/terrain visualization
Three.js      Advanced 3D visualization
GeoPandas     Vector geospatial analysis
Rasterio      Raster processing
GDAL          Geospatial data transformation

DevOps & Cloud

Technology       Purpose

Docker           Containerization
Git              Version control
GitHub           Source control and collaboration
GitHub Actions   CI/CD
AWS              Cloud deployment target
Amazon S3        Object/media storage

Kafka or RabbitMQ may be introduced later if high-volume asynchronous
processing justifies it.

8. Data Strategy

NER-SHIELD is designed around multi-source evidence fusion.

Weather
   │
Satellite
   │
Terrain
   │
Historical Data
   │
Sensors
   │
Field Reports
   │
   ▼
DATA INGESTION
   │
   ▼
NORMALIZATION / VALIDATION
   │
   ▼
POSTGRESQL + POSTGIS
   │
   ├───────────────┐
   ▼               ▼
GIS ENGINE       AI ENGINE
   │               │
   └───────┬───────┘
           ▼
      RISK INTELLIGENCE
           │
     ┌─────┼─────┐
     ▼     ▼     ▼
  Explain Impact Alerts
     │     │     │
     └─────┼─────┘
           ▼
     RESPONSE ACTION

9. Risk Intelligence Workflow

1. Collect Evidence
        ↓
2. Validate & Normalize
        ↓
3. Spatial Processing
        ↓
4. AI/ML Risk Inference
        ↓
5. Explain Risk Factors
        ↓
6. Estimate Exposure
        ↓
7. Run What-If Scenario
        ↓
8. Prioritize Response
        ↓
9. Generate Warning
        ↓
10. Field Acknowledgement
        ↓
11. Feedback & Recalibration

10. GIS Map Architecture

The current frontend map is organized around MapLibre and GeoJSON data
sources.

LiveMap
│
├── Risk Zones
├── Rainfall Heatmap
├── Roads
├── Rivers
├── Villages
├── Schools
├── Infrastructure
└── Incidents

The map supports:

Layer visibility

Zone selection

Map recentering

Smooth camera movement

Risk visualization

Incident visualization

Terrain visualization

Future 3D/animated overlays

The intended premium visualization direction is:

3D Terrain
     ↓
Northeast India
     ↓
Risk Zones
     ↓
Rainfall
     ↓
Incidents
     ↓
Infrastructure Exposure
     ↓
Animated Intelligence Layers

11. User Roles

The platform is designed to support role-based access.

Potential roles include:

System Administrator

Disaster Management Authority

Command Center Operator

Field Response Team

Analyst

Citizen / Community Reporter

Permissions should follow least-privilege principles.

12. Security & Privacy

Security requirements include:

Role-based access control

Authentication and authorization

JWT/OAuth2

API protection

Rate limiting

Audit trails

Secure secret management

Minimal collection of citizen personal data

No secrets committed to source control

Controlled access to sensitive operational information

13. Reliability & Resilience

NER-SHIELD is designed for environments where external services and
connectivity may fail.

Strategies include:

Offline-first field operations

Last-known AI result when AI service is unavailable

Retry mechanisms

Service-state visibility

Caching

Fallback data sources where applicable

API failure handling

Explicit uncertainty and confidence indicators

14. Testing & Validation

Backend

JUnit

Mockito

Spring integration tests

API tests

Security tests

Testcontainers

Frontend

Component testing

End-to-end testing

UI interaction testing

AI/ML

Metrics may include:

Precision

Recall

F1-score

MAE

RMSE

False-alarm rate

Missed-event rate

Calibration

Warning lead time

Spatial validation

Temporal validation

AI performance claims should only be presented when supported by
documented validation.

15. SIH Demonstration Flow

The recommended SIH demonstration scenario is:

Command Center
      ↓
Rainfall Anomaly
      ↓
Risk Escalation
      ↓
Explainable Risk Factors
      ↓
Affected Roads / Villages / Infrastructure
      ↓
What-If Scenario
      ↓
Response Prioritization
      ↓
Field Photo / Report
      ↓
Python Computer Vision Analysis
      ↓
Updated Incident / Risk
      ↓
Multilingual Warning
      ↓
Acknowledgement

This demonstrates the complete Predict → Explain → Simulate →
Prioritize → Respond workflow.

16. Development Phases

Phase 0 --- Feasibility

Dataset identification

Baseline ML model

GIS prototype

Spring Boot skeleton

Python AI proof of concept

Phase 1 --- MVP

Authentication

RBAC

PostGIS

GIS dashboard

Risk model

Core APIs

Phase 2 --- Intelligence

Satellite features

Explainability

Computer vision

Field reports

Phase 3 --- Operations

Alerts

Impact assessment

Response prioritization

Offline synchronization

Multilingual support

Phase 4 --- Differentiation

Digital twin

What-if simulation

Optimization

Advanced validation

SIH presentation polish

17. Project Structure

The repository is organized around a modern Next.js frontend and a
modular backend architecture.

Current frontend structure

frontend/
│
├── app/
│   └── ...                     # Next.js application routes
│
├── components/
│   └── map/
│       ├── CommandMap.tsx
│       ├── LayerControl.tsx
│       ├── LiveMap.tsx
│       ├── MapLegend.tsx
│       ├── PrimaryActions.tsx
│       └── ZoneDetailPanel.tsx
│
├── data/
│   ├── geo.ts
│   ├── incidents.ts
│   └── layers.ts
│
├── lib/
│   └── ...                     # Shared application logic
│
├── types/
│   └── ...                     # TypeScript types
│
├── package.json
└── ...

Planned full-stack structure

NER-SHIELD/
│
├── frontend/
│   └── Next.js + TypeScript
│
├── backend/
│   └── Spring Boot + Java 21
│
├── ai-service/
│   └── Python + FastAPI
│
├── database/
│   └── PostgreSQL + PostGIS
│
├── docker/
│   └── Docker configuration
│
└── docs/
    └── Architecture / SRS / API documentation

18. Local Development

Frontend Requirements

Node.js 20.9+

npm

Git

Install

cd frontend
npm install

Run Development Server

npm run dev

The frontend runs on:

http://localhost:3000

The command center is available at:

http://localhost:3000/command

Production Build

npm run build

Start Production Server

npm start

Lint

npm run lint

19. Environment Variables

Secrets and environment-specific configuration should never be committed
to Git.

Use:

.env.local

for local frontend configuration and appropriate environment
configuration for backend/AI services.

Example structure:

NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_MAP_STYLE_URL=
API_URL=
AI_SERVICE_URL=
DATABASE_URL=
JWT_SECRET=

Only variables actually required by the implementation should be
added. Do not commit real credentials.

20. Git Collaboration Workflow

NER-SHIELD is intended to support parallel team development.

Recommended workflow

main
 │
 ├── feature/3d-map
 │
 ├── feature/dashboard
 │
 ├── feature/backend
 │
 ├── feature/ai-risk-engine
 │
 └── feature/alerts

Each contributor should:

git checkout main
git pull origin main

git checkout -b feature/<feature-name>

Commit changes:

git add .
git commit -m "feat: describe the change"

Push:

git push -u origin feature/<feature-name>

Then open a Pull Request.

Collaboration rules

Do not directly push feature work to main

Use one branch per feature

Keep commits focused

Pull/merge the latest main before major work

Review Pull Requests before merging

Avoid unnecessary changes to files owned by another feature

Keep main deployable/stable

21. Current Implementation vs Planned Architecture

Implemented / Present in the current frontend

Next.js frontend

React + TypeScript

Tailwind CSS

MapLibre GL

Interactive GIS map

GeoJSON risk zones

Rainfall heatmap layer

Roads

Rivers

Villages

Schools

Infrastructure

Incidents

Layer visibility controls

Risk-zone selection

Map navigation

Responsive map resizing

Three.js / React Three Fiber dependencies

Architecture / Implementation Target

Java 21 + Spring Boot backend

Spring Security

JWT/OAuth2

PostgreSQL + PostGIS

Python + FastAPI AI service

ML inference and training

Computer vision

Satellite analysis

Redis caching

Real-time WebSocket communication

Offline-first field workflows

Alert orchestration

AWS deployment

Docker

GitHub Actions

Future Scope

Kafka/RabbitMQ for high-volume asynchronous processing

GPU model serving where justified

Drone imagery

Multi-hazard intelligence

Advanced digital twin

Climate-risk forecasting

Infrastructure vulnerability assessment

Inter-agency integrations

22. Limitations

NER-SHIELD intentionally does not claim:

Guaranteed prediction of every landslide

Autonomous evacuation orders

Fully autonomous drones

Engineering-grade slope-stability certification

Nationwide production deployment in the initial MVP

The platform is designed to assist authorized decision-makers, not
replace them.

23. Risks & Mitigation

Risk                                Mitigation

Data scarcity                       Multiple permitted sources,
validation and uncertainty

AI unavailable                      Last-known result, service-state
indicator and retry

False alarms                        Calibration, baselines and human
verification

Missed events                       Data fusion and escalation

Low connectivity                    Offline-first field application

API downtime                        Caching and fallback sources

Scope creep                         MVP-first development

Backend complexity                  Modular monolith before unnecessary
microservices

24. Success Criteria

The target platform should provide:

Working Spring Boot core backend

Secure APIs

Working Python AI service

PostgreSQL/PostGIS spatial model

Operational GIS risk dashboard

Measured AI validation

Geo-tagged field reporting

Impact assessment

Response prioritization

Alert workflow

Offline capture and synchronization

At least one what-if scenario

Docker/AWS deployment path

Documented limitations

Reproducible demonstration

25. Why NER-SHIELD?

Traditional disaster monitoring often focuses on reporting what has
already happened.

NER-SHIELD aims to answer five operational questions:

1. WHAT IS LIKELY TO HAPPEN?
            ↓
2. WHY IS THE RISK INCREASING?
            ↓
3. WHAT COULD BE AFFECTED?
            ↓
4. WHAT HAPPENS IF CONDITIONS CHANGE?
            ↓
5. WHAT SHOULD WE PRIORITIZE NOW?

This turns raw environmental and geospatial information into an
operational decision-support workflow.

26. Core USP

Predict → Explain → Simulate → Prioritize → Respond

NER-SHIELD is not intended to be just another map or another prediction
model.

It combines:

AI + GIS + Environmental Intelligence + Explainability + Impact
Assessment + Scenario Simulation + Emergency Response

into a single disaster-management workflow.

27. Project Status

Project: NER-SHIELD
Problem Statement: SIH26001
Domain: Disaster Management
Target Region: North Eastern Region of India
Current Stage: Active development / SIH prototype

28. Team

Add your team members here:

Team Lead:
- Name

Team Members:
- Name
- Name
- Name
- Name

29. License

Add the project's final license here once the team decides on the
appropriate licensing model.

30. Acknowledgement

Built as a solution for Smart India Hackathon 2026, aligned with the
disaster-management challenge concerning AI-based early warning and
landslide risk monitoring in the North Eastern Region.
