<div align="center">

<img src="https://img.shields.io/badge/%F0%9F%9B%A1%EF%B8%8F-NER--SHIELD-B31217?style=for-the-badge&labelColor=0D1117" alt="NER-SHIELD" height="42" />

# NER-SHIELD

### AI-Powered Landslide Risk Intelligence, Early Warning & Emergency Response Platform

**Predict → Explain → Simulate → Prioritize → Respond**

<br />

<img src="https://img.shields.io/badge/Smart_India_Hackathon-2026-FF6B00?style=flat-square&labelColor=0D1117" alt="SIH 2026" />
<img src="https://img.shields.io/badge/Problem_Statement-SIH26001-1F6FEB?style=flat-square&labelColor=0D1117" alt="SIH26001" />
<img src="https://img.shields.io/badge/Theme-Disaster_Management-B31217?style=flat-square&labelColor=0D1117" alt="Disaster Management" />
<img src="https://img.shields.io/badge/Ministry-MDoNER-2EA043?style=flat-square&labelColor=0D1117" alt="MDoNER" />
<img src="https://img.shields.io/badge/Status-Active_Development-FFB000?style=flat-square&labelColor=0D1117" alt="Status" />

<br /><br />

<img src="https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 21" />
<img src="https://img.shields.io/badge/Spring_Boot-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot" />
<img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
<img src="https://img.shields.io/badge/Python-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
<img src="https://img.shields.io/badge/PostgreSQL-PostGIS-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL + PostGIS" />
<img src="https://img.shields.io/badge/MapLibre_GL-295DAA?style=for-the-badge&logo=maplibre&logoColor=white" alt="MapLibre GL" />

<br />

<table>
<tr>
<td align="center" width="20%"><b>🔮<br />PREDICT</b><br /><sub>Spatial & temporal<br />landslide risk</sub></td>
<td align="center" width="20%"><b>🔬<br />EXPLAIN</b><br /><sub>Contributing factors<br />& confidence</sub></td>
<td align="center" width="20%"><b>🧪<br />SIMULATE</b><br /><sub>What-if scenario<br />analysis</sub></td>
<td align="center" width="20%"><b>🎯<br />PRIORITIZE</b><br /><sub>Exposure-ranked<br />response</sub></td>
<td align="center" width="20%"><b>🚨<br />RESPOND</b><br /><sub>Multilingual<br />early warning</sub></td>
</tr>
</table>

</div>

---

<details>
<summary><b>📑 Table of Contents</b></summary>

- [1. Overview](#1-overview)
- [2. Problem Statement](#2-problem-statement)
- [3. Vision & Core Loop](#3-vision--core-loop)
- [4. Objectives](#4-objectives)
- [5. Key Features](#5-key-features)
- [6. System Architecture](#6-system-architecture)
- [7. Data Strategy](#7-data-strategy)
- [8. Risk Intelligence Workflow](#8-risk-intelligence-workflow)
- [9. Offline-First Field Operations](#9-offline-first-field-operations)
- [10. Explainable Risk](#10-explainable-risk)
- [11. What-If Simulation](#11-what-if-simulation)
- [12. Technology Stack](#12-technology-stack)
- [13. GIS Map Architecture](#13-gis-map-architecture)
- [14. User Roles](#14-user-roles)
- [15. Security & Privacy](#15-security--privacy)
- [16. Reliability & Resilience](#16-reliability--resilience)
- [17. Testing & Validation](#17-testing--validation)
- [18. Project Structure](#18-project-structure)
- [19. Local Development](#19-local-development)
- [20. Environment Variables](#20-environment-variables)
- [21. Git Collaboration Workflow](#21-git-collaboration-workflow)
- [22. Development Phases](#22-development-phases)
- [23. Current vs Planned](#23-current-vs-planned)
- [24. SIH Demonstration Flow](#24-sih-demonstration-flow)
- [25. Limitations](#25-limitations)
- [26. Risks & Mitigation](#26-risks--mitigation)
- [27. Success Criteria](#27-success-criteria)
- [28. Team](#28-team)
- [29. License](#29-license)
- [30. Acknowledgement](#30-acknowledgement)

</details>

---

## 1. Overview

**NER-SHIELD** is an enterprise-style disaster intelligence and decision-support platform built for the **North Eastern Region (NER) of India**.

It fuses environmental, geospatial, satellite, terrain, historical, sensor and field-report evidence to estimate landslide risk, explain the contributing factors, assess potential impact, prioritize emergency response, and issue actionable warnings.

The goal is to move disaster management from **reactive reporting** toward **predictive, explainable and action-oriented intelligence**.

> [!IMPORTANT]
> NER-SHIELD is a **decision-support system**. It does not replace official emergency decisions and does not claim guaranteed prediction of every disaster event.

---

## 2. Problem Statement

The North Eastern Region is highly exposed to landslides, flash floods, road blockages and slope failures driven by heavy rainfall, fragile terrain and unplanned hill cutting.

<table>
<tr><th width="42%">Challenge</th><th>Operational Impact</th></tr>
<tr><td>Limited real-time prediction of landslide-prone zones</td><td>Warnings arrive after the event, not before</td></tr>
<tr><td>Fragmented weather, satellite, terrain, sensor and incident data</td><td>No single operational picture for decision-makers</td></tr>
<tr><td>Delayed identification of vulnerable slope changes</td><td>Deteriorating slopes go unnoticed until failure</td></tr>
<tr><td>Difficulty assessing impact on roads, villages and infrastructure</td><td>Response cannot be prioritized by exposure</td></tr>
<tr><td>Manual field reporting and weak connectivity in remote areas</td><td>Ground truth is slow, lossy or never reaches the centre</td></tr>
<tr><td>Raw model outputs without explanation</td><td>Authorities cannot justify or trust an alert</td></tr>
</table>

NER-SHIELD closes these gaps by combining **AI/ML + GIS + environmental intelligence + emergency-response workflows** in one platform.

---

## 3. Vision & Core Loop

> **Transform disaster management from reactive reporting into predictive, explainable and action-oriented intelligence.**

```mermaid
flowchart LR
    P["🔮 PREDICT<br/>Risk scores<br/>& classification"]
    E["🔬 EXPLAIN<br/>Contributing<br/>factors"]
    S["🧪 SIMULATE<br/>What-if<br/>scenarios"]
    R["🎯 PRIORITIZE<br/>Exposure-based<br/>ranking"]
    A["🚨 RESPOND<br/>Alerts &<br/>field action"]
    F["♻️ FEEDBACK<br/>Recalibration"]

    P --> E --> S --> R --> A --> F
    F -.-> P

    classDef stage fill:#0D1117,stroke:#B31217,stroke-width:2px,color:#F0F6FC
    classDef loop fill:#0D1117,stroke:#2EA043,stroke-width:2px,color:#F0F6FC,stroke-dasharray: 5 5
    class P,E,S,R,A stage
    class F loop
```

---

## 4. Objectives

<table>
<tr>
<td width="50%" valign="top">

- Create dynamic landslide risk maps
- Estimate spatial and temporal landslide risk
- Fuse satellite, environmental, terrain, sensor and field evidence
- Provide explainable risk factors and confidence
- Identify exposed roads, villages, bridges, schools and hospitals

</td>
<td width="50%" valign="top">

- Support what-if disaster scenarios
- Prioritize emergency response
- Provide multilingual and multi-channel alerts
- Support offline-first field operations
- Maintain secure role-based access and audit trails

</td>
</tr>
</table>

---

## 5. Key Features

<table>
<tr>
<td width="33%" valign="top" align="center">

### 🗺️
**GIS Command Center**

Centralized operational view: interactive MapLibre GL map with risk zones, terrain, rainfall overlays, roads, rivers, villages, schools, hospitals, bridges and live incidents — with layer controls and zone drill-down.

</td>
<td width="33%" valign="top" align="center">

### 🤖
**AI/ML Risk Intelligence**

Python service producing risk scores, classifications, contributing factors, confidence values, spatial predictions and temporal trends using Scikit-learn, XGBoost/LightGBM and PyTorch where required.

</td>
<td width="33%" valign="top" align="center">

### 🛰️
**Satellite & Change Analysis**

Satellite feature extraction, change analysis, evidence fusion and computer-vision-assisted field evidence for potential slope-change detection using OpenCV and Python geospatial tooling.

</td>
</tr>
<tr>
<td valign="top" align="center">

### 📍
**Incident & Field Reporting**

Geo-tagged reports carrying location, incident type, severity, observations, media, timestamp, status and the related risk zone — designed for remote terrain.

</td>
<td valign="top" align="center">

### 📡
**Offline-First Operations**

Capture in the field without connectivity, store locally, and synchronize automatically once the network returns. Field work never blocks on the network.

</td>
<td valign="top" align="center">

### 🚨
**Alerts & Early Warning**

Risk and incident escalation, multilingual alerts, multi-channel delivery, acknowledgement tracking and response escalation — always communicating uncertainty.

</td>
</tr>
<tr>
<td valign="top" align="center">

### 🏥
**Impact & Exposure**

Assesses roads, bridges, villages, schools, hospitals and critical infrastructure to answer: *what is at risk, and what do we respond to first?*

</td>
<td valign="top" align="center">

### 🔬
**Explainable Risk**

Never just `Risk = 87%`. Every score is decomposed into the drivers that produced it, with an explicit confidence indicator.

</td>
<td valign="top" align="center">

### 🧪
**What-If Simulation**

Explore consequences before acting: change rainfall assumptions and watch risk, exposure and response priority recompute.

</td>
</tr>
</table>

---

## 6. System Architecture

NER-SHIELD uses a layered architecture with **Spring Boot as the operational backend** and **Python as the specialized AI/ML engine**.

```mermaid
flowchart TB
    subgraph USERS["👥 USERS"]
        U1["Authorities"]
        U2["Field Teams"]
        U3["Communities"]
    end

    subgraph FE["🖥️ FRONTEND — Next.js + TypeScript"]
        F1["Tailwind CSS UI"]
        F2["MapLibre GL — GIS"]
        F3["Three.js — 3D terrain"]
        F4["Recharts — analytics"]
    end

    subgraph BE["☕ SPRING BOOT BACKEND — Java 21"]
        B1["Auth & Authorization"]
        B2["Business + GIS APIs"]
        B3["Incidents & Field Reports"]
        B4["Alerts & Response Workflows"]
        B5["Audit Logs & Orchestration"]
    end

    subgraph DATA["🗄️ DATA LAYER"]
        D1["PostgreSQL + PostGIS"]
        D2["Redis Cache"]
        D3["Amazon S3 — media"]
    end

    subgraph AI["🐍 PYTHON AI SERVICE — FastAPI"]
        A1["ML Inference & Training"]
        A2["Computer Vision"]
        A3["GeoAI Processing"]
    end

    subgraph STACK["🧠 AI / ML STACK"]
        S1["Scikit-learn"]
        S2["XGBoost / LightGBM"]
        S3["PyTorch"]
        S4["OpenCV"]
        S5["GeoPandas"]
        S6["Rasterio / GDAL"]
    end

    USERS --> FE
    FE -->|"REST / WebSocket"| BE
    BE --> DATA
    BE <-->|"Internal API"| AI
    AI --> STACK
    AI --> DATA

    classDef users fill:#0D1117,stroke:#8B949E,stroke-width:2px,color:#F0F6FC
    classDef front fill:#0D1117,stroke:#1F6FEB,stroke-width:2px,color:#F0F6FC
    classDef back fill:#0D1117,stroke:#6DB33F,stroke-width:2px,color:#F0F6FC
    classDef data fill:#0D1117,stroke:#4169E1,stroke-width:2px,color:#F0F6FC
    classDef ai fill:#0D1117,stroke:#FFB000,stroke-width:2px,color:#F0F6FC
    classDef stack fill:#0D1117,stroke:#B31217,stroke-width:2px,color:#F0F6FC

    class U1,U2,U3 users
    class F1,F2,F3,F4 front
    class B1,B2,B3,B4,B5 back
    class D1,D2,D3 data
    class A1,A2,A3 ai
    class S1,S2,S3,S4,S5,S6 stack
```

---

## 7. Data Strategy

NER-SHIELD is built around **multi-source evidence fusion** — no single feed is trusted alone.

```mermaid
flowchart TD
    W["🌧️ Weather"] --> ING
    SAT["🛰️ Satellite"] --> ING
    TER["⛰️ Terrain / DEM"] --> ING
    HIS["📚 Historical Data"] --> ING
    SEN["📡 Sensors"] --> ING
    FLD["📍 Field Reports"] --> ING

    ING["📥 DATA INGESTION"] --> NORM["🧹 NORMALIZATION & VALIDATION"]
    NORM --> DB[("🗄️ PostgreSQL + PostGIS")]

    DB --> GIS["🗺️ GIS ENGINE"]
    DB --> MLE["🤖 AI ENGINE"]

    GIS --> RI["⚡ RISK INTELLIGENCE"]
    MLE --> RI

    RI --> EXP["🔬 Explain"]
    RI --> IMP["🏥 Impact"]
    RI --> ALR["🚨 Alerts"]

    EXP --> ACT["🎯 RESPONSE ACTION"]
    IMP --> ACT
    ALR --> ACT

    classDef src fill:#0D1117,stroke:#8B949E,stroke-width:1.5px,color:#F0F6FC
    classDef proc fill:#0D1117,stroke:#1F6FEB,stroke-width:2px,color:#F0F6FC
    classDef store fill:#0D1117,stroke:#4169E1,stroke-width:2px,color:#F0F6FC
    classDef intel fill:#0D1117,stroke:#FFB000,stroke-width:2px,color:#F0F6FC
    classDef action fill:#0D1117,stroke:#B31217,stroke-width:3px,color:#F0F6FC

    class W,SAT,TER,HIS,SEN,FLD src
    class ING,NORM,GIS,MLE proc
    class DB store
    class RI,EXP,IMP,ALR intel
    class ACT action
```

---

## 8. Risk Intelligence Workflow

```mermaid
flowchart TD
    S1["1️⃣ Collect Evidence"] --> S2["2️⃣ Validate & Normalize"]
    S2 --> S3["3️⃣ Spatial Processing"]
    S3 --> S4["4️⃣ AI/ML Risk Inference"]
    S4 --> S5["5️⃣ Explain Risk Factors"]
    S5 --> S6["6️⃣ Estimate Exposure"]
    S6 --> S7["7️⃣ Run What-If Scenario"]
    S7 --> S8["8️⃣ Prioritize Response"]
    S8 --> S9["9️⃣ Generate Warning"]
    S9 --> S10["🔟 Field Acknowledgement"]
    S10 --> S11["♻️ Feedback & Recalibration"]
    S11 -.->|"model improves"| S4

    classDef step fill:#0D1117,stroke:#1F6FEB,stroke-width:2px,color:#F0F6FC
    classDef ai fill:#0D1117,stroke:#FFB000,stroke-width:2px,color:#F0F6FC
    classDef out fill:#0D1117,stroke:#B31217,stroke-width:2px,color:#F0F6FC
    class S1,S2,S3,S6,S7,S8 step
    class S4,S5,S11 ai
    class S9,S10 out
```

---

## 9. Offline-First Field Operations

Field operations continue even when connectivity does not.

```mermaid
sequenceDiagram
    autonumber
    participant FT as 📱 Field Device
    participant LS as 💾 Local Storage
    participant BE as ☕ Spring Boot
    participant AI as 🐍 AI Service
    participant CC as 🖥️ Command Center

    FT->>FT: Capture report + photo + GPS
    FT->>LS: Persist locally (no network)
    Note over FT,LS: Work continues fully offline

    LS-->>LS: Queue pending reports
    Note over LS: Connectivity restored ✅

    LS->>BE: Sync queued reports
    BE->>BE: Validate, de-duplicate, audit
    BE->>AI: Request CV + risk re-inference
    AI-->>BE: Updated risk, factors, confidence
    BE->>CC: Push update via WebSocket
    CC-->>FT: Acknowledgement / tasking
```

---

## 10. Explainable Risk

Instead of showing an opaque `Risk = 87%`, NER-SHIELD decomposes every score into its drivers.

```mermaid
flowchart LR
    R["⚠️ Risk Level: CRITICAL<br/>Score 87 · Confidence 0.78"]

    R --> F1["🌧️ Heavy rainfall<br/>past 72h anomaly"]
    R --> F2["⛰️ Steep terrain<br/>slope & aspect"]
    R --> F3["📚 Historical susceptibility<br/>past failures nearby"]
    R --> F4["🛰️ Recent environmental change<br/>satellite-detected"]
    R --> F5["🏥 Nearby infrastructure exposure<br/>road + village + school"]

    classDef risk fill:#0D1117,stroke:#B31217,stroke-width:3px,color:#F0F6FC
    classDef factor fill:#0D1117,stroke:#FFB000,stroke-width:2px,color:#F0F6FC
    class R risk
    class F1,F2,F3,F4,F5 factor
```

> [!NOTE]
> Confidence and uncertainty are surfaced alongside every prediction. AI output is presented as evidence, never as a guarantee.

---

## 11. What-If Simulation

```mermaid
flowchart TD
    SC["🧪 Scenario:<br/>Rainfall increases 40% over 24h"] --> RC["♻️ Risk recalculation"]
    RC --> AZ["🗺️ Affected zones identified"]
    AZ --> EI["🏗️ Exposed infrastructure listed"]
    EI --> PR["🎯 Priority ranking generated"]
    PR --> RR["📋 Recommended response"]

    classDef scenario fill:#0D1117,stroke:#1F6FEB,stroke-width:3px,color:#F0F6FC
    classDef step fill:#0D1117,stroke:#FFB000,stroke-width:2px,color:#F0F6FC
    classDef result fill:#0D1117,stroke:#2EA043,stroke-width:3px,color:#F0F6FC
    class SC scenario
    class RC,AZ,EI,PR step
    class RR result
```

This lets decision-makers explore consequences **before** committing resources.

---

## 12. Technology Stack

<details open>
<summary><b>🖥️ Frontend</b></summary>
<br />

| Technology | Purpose | Version |
|:--|:--|:--|
| Next.js | Web application framework | `16.3.3` |
| React | UI architecture | `19.2.8` |
| TypeScript | Type-safe development | `5.x` |
| Tailwind CSS | UI styling | — |
| MapLibre GL | Interactive GIS map | `6.6.x` |
| Three.js | 3D graphics & terrain | `0.185.1` |
| React Three Fiber / Drei | React integration for Three.js | — |
| Framer Motion | UI animation and motion | `13.1.1` |
| Recharts | Charts and analytics | `3.10.1` |
| Lucide React | Interface icons | — |

> Exact installed patch versions should be read from `package-lock.json` when reproducing an environment.

</details>

<details>
<summary><b>☕ Core Backend</b></summary>
<br />

| Technology | Purpose |
|:--|:--|
| Java 21 | Core backend language |
| Spring Boot | Operational backend |
| Spring Security | Authentication and authorization |
| JWT / OAuth2 | Secure identity and access |
| Spring Data JPA | Persistence layer |
| REST APIs | Frontend/backend communication |
| WebSocket / STOMP | Real-time updates |

Spring Boot owns the main business and operational responsibilities.

</details>

<details>
<summary><b>🐍 AI / ML Service</b></summary>
<br />

| Technology | Purpose |
|:--|:--|
| Python | AI/ML service runtime |
| FastAPI | AI service API |
| Scikit-learn | Classical ML |
| XGBoost / LightGBM | Gradient-boosting models |
| PyTorch | Deep learning where required |
| OpenCV | Computer vision |
| GeoPandas | Vector geospatial analysis |
| Rasterio | Raster processing |
| GDAL | Geospatial data transformation |

Python is intentionally separated from the core backend so the ML ecosystem can evolve independently.

</details>

<details>
<summary><b>🗄️ Database & Geospatial</b></summary>
<br />

| Technology | Purpose |
|:--|:--|
| PostgreSQL | Primary relational database |
| PostGIS | Spatial / geographic data |
| Redis | Caching and fast-access state |
| GeoJSON | Risk zones and spatial feature data |
| Terrain DEM | Elevation and terrain visualization |

PostgreSQL + PostGIS is the central spatial data layer.

</details>

<details>
<summary><b>☁️ DevOps & Cloud</b></summary>
<br />

| Technology | Purpose |
|:--|:--|
| Docker | Containerization |
| Git / GitHub | Version control and collaboration |
| GitHub Actions | CI/CD |
| AWS | Cloud deployment target |
| Amazon S3 | Object and media storage |

Kafka or RabbitMQ may be introduced later if high-volume asynchronous processing justifies it.

</details>

---

## 13. GIS Map Architecture

```mermaid
flowchart TD
    LM["🗺️ LiveMap<br/>MapLibre GL"]
    LM --> L1["🔴 Risk Zones"]
    LM --> L2["🌧️ Rainfall Heatmap"]
    LM --> L3["🛣️ Roads"]
    LM --> L4["🌊 Rivers"]
    LM --> L5["🏘️ Villages"]
    LM --> L6["🏫 Schools"]
    LM --> L7["🏗️ Infrastructure"]
    LM --> L8["📍 Incidents"]

    classDef map fill:#0D1117,stroke:#295DAA,stroke-width:3px,color:#F0F6FC
    classDef layer fill:#0D1117,stroke:#8B949E,stroke-width:1.5px,color:#F0F6FC
    class LM map
    class L1,L2,L3,L4,L5,L6,L7,L8 layer
```

**Supported interactions:** layer visibility · zone selection · map recentering · smooth camera movement · risk visualization · incident visualization · terrain visualization · responsive resizing.

**Intended premium direction:** 3D terrain of Northeast India → risk zones → rainfall → incidents → infrastructure exposure → animated intelligence layers.

---

## 14. User Roles

| Role | Typical Responsibility |
|:--|:--|
| 🛠️ System Administrator | Platform configuration, users, integrations |
| 🏛️ Disaster Management Authority | Official decisions, alert approval |
| 🖥️ Command Center Operator | Live monitoring, incident triage, dispatch |
| 🚑 Field Response Team | Ground reporting, verification, response |
| 📊 Analyst | Model validation, historical analysis |
| 👤 Citizen / Community Reporter | Community-level incident reporting |

Permissions follow **least-privilege** principles.

---

## 15. Security & Privacy

<table>
<tr>
<td width="50%" valign="top">

- Role-based access control
- Authentication and authorization
- JWT / OAuth2
- API protection
- Rate limiting

</td>
<td width="50%" valign="top">

- Audit trails
- Secure secret management
- Minimal collection of citizen personal data
- No secrets committed to source control
- Controlled access to sensitive operational data

</td>
</tr>
</table>

---

## 16. Reliability & Resilience

Designed for environments where external services and connectivity fail.

- Offline-first field operations
- Last-known AI result when the AI service is unavailable
- Retry mechanisms and service-state visibility
- Caching and fallback data sources where applicable
- Explicit API failure handling
- Explicit uncertainty and confidence indicators

---

## 17. Testing & Validation

| Layer | Approach |
|:--|:--|
| **Backend** | JUnit · Mockito · Spring integration tests · API tests · security tests · Testcontainers |
| **Frontend** | Component testing · end-to-end testing · UI interaction testing |
| **AI/ML** | Precision · Recall · F1 · MAE · RMSE · false-alarm rate · missed-event rate · calibration · warning lead time · spatial and temporal validation |

> [!WARNING]
> AI performance claims should only be presented when backed by documented validation runs.

---

## 18. Project Structure

<details open>
<summary><b>Current frontend structure</b></summary>

```text
frontend/
│
├── app/                        # Next.js application routes
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
├── lib/                        # Shared application logic
├── types/                      # TypeScript types
└── package.json
```

</details>

<details>
<summary><b>Planned full-stack structure</b></summary>

```text
NER-SHIELD/
│
├── frontend/                   # Next.js + TypeScript
├── backend/                    # Spring Boot + Java 21
├── ai-service/                 # Python + FastAPI
├── database/                   # PostgreSQL + PostGIS
├── docker/                     # Docker configuration
└── docs/                       # Architecture / SRS / API docs
```

</details>

---

## 19. Local Development

**Requirements:** Node.js `20.9+` · npm · Git

```bash
# Install
cd frontend
npm install

# Run development server
npm run dev
```

| Target | URL |
|:--|:--|
| Frontend | `http://localhost:3000` |
| Command Center | `http://localhost:3000/command` |

```bash
npm run build     # Production build
npm start         # Start production server
npm run lint      # Lint
```

---

## 20. Environment Variables

> [!CAUTION]
> Never commit real credentials. Use `.env.local` for local frontend configuration and appropriate environment configuration for the backend and AI services.

```env
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_MAP_STYLE_URL=
API_URL=
AI_SERVICE_URL=
DATABASE_URL=
JWT_SECRET=
```

Only add variables the implementation actually requires.

---

## 21. Git Collaboration Workflow

```mermaid
flowchart LR
    M["🌿 main<br/>always deployable"]
    M --> B1["feature/3d-map"]
    M --> B2["feature/dashboard"]
    M --> B3["feature/backend"]
    M --> B4["feature/ai-risk-engine"]
    M --> B5["feature/alerts"]

    B1 --> PR["🔀 Pull Request<br/>+ review"]
    B2 --> PR
    B3 --> PR
    B4 --> PR
    B5 --> PR
    PR --> M

    classDef main fill:#0D1117,stroke:#2EA043,stroke-width:3px,color:#F0F6FC
    classDef branch fill:#0D1117,stroke:#1F6FEB,stroke-width:2px,color:#F0F6FC
    classDef pr fill:#0D1117,stroke:#FFB000,stroke-width:2px,color:#F0F6FC
    class M main
    class B1,B2,B3,B4,B5 branch
    class PR pr
```

```bash
git checkout main
git pull origin main
git checkout -b feature/<feature-name>

git add .
git commit -m "feat: describe the change"
git push -u origin feature/<feature-name>
```

**Rules:** one branch per feature · no direct feature pushes to `main` · keep commits focused · pull latest `main` before major work · review every PR · avoid touching files owned by another feature · keep `main` stable.

---

## 22. Development Phases

```mermaid
gantt
    title NER-SHIELD Development Roadmap
    dateFormat YYYY-MM-DD
    axisFormat %b

    section Phase 0 — Feasibility
    Dataset identification       :p0a, 2026-01-01, 21d
    Baseline ML model            :p0b, after p0a, 21d
    GIS prototype                :p0c, 2026-01-15, 25d
    Spring Boot skeleton         :p0d, 2026-01-15, 20d

    section Phase 1 — MVP
    Auth and RBAC                :p1a, 2026-02-15, 25d
    PostGIS spatial model        :p1b, 2026-02-20, 25d
    GIS dashboard                :p1c, 2026-03-01, 30d
    Risk model and core APIs     :p1d, 2026-03-05, 30d

    section Phase 2 — Intelligence
    Satellite features           :p2a, 2026-04-05, 25d
    Explainability layer         :p2b, 2026-04-10, 25d
    Computer vision              :p2c, 2026-04-20, 25d
    Field reports                :p2d, 2026-04-25, 20d

    section Phase 3 — Operations
    Alerts and escalation        :p3a, 2026-05-15, 25d
    Impact assessment            :p3b, 2026-05-20, 25d
    Offline synchronization      :p3c, 2026-06-01, 25d
    Multilingual support         :p3d, 2026-06-10, 20d

    section Phase 4 — Differentiation
    Digital twin                 :p4a, 2026-07-01, 25d
    What-if simulation           :p4b, 2026-07-05, 25d
    Advanced validation          :p4c, 2026-07-20, 20d
    SIH presentation polish      :p4d, 2026-08-05, 15d
```

---

## 23. Current vs Planned

<table>
<tr>
<th width="33%">✅ Implemented</th>
<th width="33%">🎯 Architecture Target</th>
<th width="33%">🚀 Future Scope</th>
</tr>
<tr valign="top">
<td>

- Next.js frontend
- React + TypeScript
- Tailwind CSS
- MapLibre GL map
- GeoJSON risk zones
- Rainfall heatmap layer
- Roads, rivers, villages
- Schools, infrastructure
- Incident markers
- Layer visibility controls
- Risk-zone selection
- Map navigation
- Responsive resizing
- Three.js / R3F dependencies

</td>
<td>

- Java 21 + Spring Boot
- Spring Security
- JWT / OAuth2
- PostgreSQL + PostGIS
- Python + FastAPI service
- ML inference and training
- Computer vision
- Satellite analysis
- Redis caching
- WebSocket real-time
- Offline-first workflows
- Alert orchestration
- Docker + AWS
- GitHub Actions CI/CD

</td>
<td>

- Kafka / RabbitMQ for high-volume async
- GPU model serving where justified
- Drone imagery
- Multi-hazard intelligence
- Advanced digital twin
- Climate-risk forecasting
- Infrastructure vulnerability assessment
- Inter-agency integrations

</td>
</tr>
</table>

---

## 24. SIH Demonstration Flow

```mermaid
flowchart TD
    D1["🖥️ Command Center"] --> D2["🌧️ Rainfall Anomaly Detected"]
    D2 --> D3["⚠️ Risk Escalation"]
    D3 --> D4["🔬 Explainable Risk Factors"]
    D4 --> D5["🏘️ Affected Roads / Villages / Infrastructure"]
    D5 --> D6["🧪 What-If Scenario"]
    D6 --> D7["🎯 Response Prioritization"]
    D7 --> D8["📷 Field Photo / Report"]
    D8 --> D9["🐍 Python Computer Vision Analysis"]
    D9 --> D10["🔄 Updated Incident / Risk"]
    D10 --> D11["🌐 Multilingual Warning"]
    D11 --> D12["✅ Acknowledgement"]

    classDef predict fill:#0D1117,stroke:#1F6FEB,stroke-width:2px,color:#F0F6FC
    classDef explain fill:#0D1117,stroke:#FFB000,stroke-width:2px,color:#F0F6FC
    classDef respond fill:#0D1117,stroke:#B31217,stroke-width:2px,color:#F0F6FC
    classDef done fill:#0D1117,stroke:#2EA043,stroke-width:2px,color:#F0F6FC
    class D1,D2,D3 predict
    class D4,D5,D6,D8,D9,D10 explain
    class D7,D11 respond
    class D12 done
```

This walks the complete **Predict → Explain → Simulate → Prioritize → Respond** loop end to end.

---

## 25. Limitations

NER-SHIELD intentionally does **not** claim:

- ❌ Guaranteed prediction of every landslide
- ❌ Autonomous evacuation orders
- ❌ Fully autonomous drones
- ❌ Engineering-grade slope-stability certification
- ❌ Nationwide production deployment in the initial MVP

The platform assists authorized decision-makers. It does not replace them.

---

## 26. Risks & Mitigation

| Risk | Mitigation |
|:--|:--|
| Data scarcity | Multiple permitted sources, validation and explicit uncertainty |
| AI service unavailable | Last-known result, service-state indicator and retry |
| False alarms | Calibration, baselines and human verification |
| Missed events | Multi-source data fusion and escalation paths |
| Low connectivity | Offline-first field application |
| API downtime | Caching and fallback sources |
| Scope creep | MVP-first development |
| Backend complexity | Modular monolith before unnecessary microservices |
| Model overfitting | Spatial and temporal holdouts with baseline comparison |

---

## 27. Success Criteria

<table>
<tr>
<td width="50%" valign="top">

- ✅ Working Spring Boot core backend
- ✅ Secure APIs
- ✅ Working Python AI service
- ✅ PostgreSQL/PostGIS spatial model
- ✅ Operational GIS risk dashboard
- ✅ Measured AI validation
- ✅ Geo-tagged field reporting

</td>
<td width="50%" valign="top">

- ✅ Impact assessment
- ✅ Response prioritization
- ✅ Alert workflow
- ✅ Offline capture and synchronization
- ✅ At least one what-if scenario
- ✅ Docker/AWS deployment path
- ✅ Documented limitations & reproducible demo

</td>
</tr>
</table>

---

## 28. Team

<table align="center">
<tr><th colspan="2">👥 NER-SHIELD Team</th></tr>
<tr><td><b>Team Lead</b></td><td><i>Name</i></td></tr>
<tr><td><b>Member</b></td><td><i>Name</i></td></tr>
<tr><td><b>Member</b></td><td><i>Name</i></td></tr>
<tr><td><b>Member</b></td><td><i>Name</i></td></tr>
<tr><td><b>Member</b></td><td><i>Name</i></td></tr>
<tr><td><b>Member</b></td><td><i>Name</i></td></tr>
</table>

---

## 29. License

License to be finalized by the team. Add the chosen license here and include a matching `LICENSE` file at the repository root.

---

## 30. Acknowledgement

Built as a solution for **Smart India Hackathon 2026**, aligned with the disaster-management challenge on AI-based early warning and landslide risk monitoring in the North Eastern Region, under the **Ministry of Development of North Eastern Region (MDoNER)**.

---

<div align="center">

### Final Product Definition

> **NER-SHIELD is an AI-powered disaster intelligence platform that fuses environmental, geospatial, satellite, terrain, historical, sensor and field evidence to estimate landslide risk, explain its drivers, simulate potential scenarios, assess exposure, prioritize response and deliver actionable warnings.**

<br />

<img src="https://img.shields.io/badge/PREDICT-1F6FEB?style=for-the-badge&labelColor=0D1117" alt="Predict" />
<img src="https://img.shields.io/badge/EXPLAIN-FFB000?style=for-the-badge&labelColor=0D1117" alt="Explain" />
<img src="https://img.shields.io/badge/SIMULATE-8957E5?style=for-the-badge&labelColor=0D1117" alt="Simulate" />
<img src="https://img.shields.io/badge/PRIORITIZE-2EA043?style=for-the-badge&labelColor=0D1117" alt="Prioritize" />
<img src="https://img.shields.io/badge/RESPOND-B31217?style=for-the-badge&labelColor=0D1117" alt="Respond" />

<br /><br />

<sub>🛡️ NER-SHIELD · Smart India Hackathon 2026 · SIH26001 · Disaster Management · North Eastern Region, India</sub>

</div>
