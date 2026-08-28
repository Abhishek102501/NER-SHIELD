# NER-SHIELD Backend

Operational backend for the NER-SHIELD disaster response platform. It sits between the
Next.js frontend and the platform's data and AI layers.

```text
Next.js frontend  ──REST/WebSocket──▶  Spring Boot backend  ──JDBC──▶  PostgreSQL + PostGIS
                                              │
                                              └──HTTP──▶  Python FastAPI AI service
```

The backend owns authentication and authorization, the business/GIS/incident/report/alert
/response APIs, the audit trail, and orchestration of calls to the AI service.

## Current status

This is the **foundation phase**. What exists today:

| Area | Status |
| --- | --- |
| Spring Boot application, starts and serves HTTP | Implemented |
| `GET /api/health` + Actuator health | Implemented |
| Global exception handling and error contract | Implemented |
| CORS for the Next.js frontend | Implemented |
| Stateless Spring Security chain (public health, everything else 401) | Implemented |
| PostgreSQL + PostGIS datasource and Hibernate Spatial wiring | Implemented |
| Flyway migrations (`V1` enables the PostGIS extension) | Implemented |
| AI service HTTP client (`/health` call only) | Implemented |
| JWT authentication | **Not implemented** — `JwtTokenProvider` defines the contract only |
| User, incident, report, alert, gis, response, audit domains | **Not implemented** — packages reserved and documented |
| WebSocket endpoints | **Not implemented** — the starter is on the classpath, no endpoints exist |
| Python AI service | **Not implemented** — lives outside this repository |

## Technology stack

- Java 21
- Spring Boot 3.5.16 (Web, Security, Data JPA, Validation, WebSocket, Actuator)
- Maven 3.9 (a wrapper is included)
- PostgreSQL with PostGIS
- Hibernate ORM 6.6 with `hibernate-spatial`
- Flyway (`flyway-core` + `flyway-database-postgresql`)
- Jakarta Bean Validation
- Lombok (compile-time only)
- H2 (test scope only, so the context can boot without a PostgreSQL server)

## Directory structure

```text
backend/
├── pom.xml
├── mvnw, mvnw.cmd, .mvn/          Maven wrapper (pinned to 3.9.14)
├── .env.example                  Documented environment variables
└── src/
    ├── main/
    │   ├── java/com/nershield/
    │   │   ├── NERShieldApplication.java
    │   │   ├── config/           CORS properties and policy
    │   │   ├── common/           Error contract: ApiErrorResponse, GlobalExceptionHandler
    │   │   ├── health/           GET /api/health
    │   │   ├── security/         Security chain, JWT contract and properties
    │   │   ├── ai/               AIService, AIClient, AIProperties, dto/
    │   │   ├── user/             (reserved)
    │   │   ├── incident/         (reserved)
    │   │   ├── report/           (reserved)
    │   │   ├── alert/            (reserved)
    │   │   ├── gis/              (reserved)
    │   │   ├── response/         (reserved)
    │   │   └── audit/            (reserved)
    │   └── resources/
    │       ├── application.yml
    │       └── db/migration/V1__initial_schema.sql
    └── test/
        ├── java/com/nershield/   Context, health, security and configuration tests
        └── resources/application-test.yml
```

Packages are organised by feature, not by layer. A domain package holds its own entity,
repository, service, controller and `dto/` sub-package. The reserved packages contain only
a `package-info.java` documenting their intended scope — no placeholder classes.

## Prerequisites

- **JDK 21** (`java -version` should report 21.x)
- **Maven 3.9+**, or use the bundled wrapper (`./mvnw`, `mvnw.cmd`) which downloads it
- **PostgreSQL 14+ with the PostGIS 3.x extension available**

### Database setup

Create the database and role, then make sure PostGIS can be enabled:

```sql
CREATE DATABASE nershield;
CREATE USER nershield WITH PASSWORD '<your-password>';
GRANT ALL PRIVILEGES ON DATABASE nershield TO nershield;
```

`V1__initial_schema.sql` runs `CREATE EXTENSION IF NOT EXISTS postgis;`. That requires
superuser rights, so either run the migration as a superuser or have a DBA create the
extension once beforehand — the statement is then a no-op.

## Environment variables

Copy `.env.example` and fill it in, or export these in your shell. Every value has a
development-friendly default except the secrets.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SERVER_PORT` | `8080` | HTTP port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `nershield` | Database name |
| `DB_USERNAME` | `nershield` | Database user |
| `DB_PASSWORD` | *(empty)* | Database password — set this |
| `DB_POOL_MAX_SIZE` | `10` | HikariCP maximum pool size |
| `FLYWAY_ENABLED` | `true` | Run migrations on startup |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated frontend origins |
| `AI_SERVICE_BASE_URL` | `http://localhost:8000` | Python AI service base URL |
| `JWT_ISSUER` | `ner-shield` | Issuer claim for future tokens |
| `JWT_SECRET` | *(empty)* | Signing key; required once JWT auth is implemented |
| `LOG_LEVEL_APP` | `INFO` | Log level for `com.nershield` |

No credentials are committed to this repository, and `.env` is git-ignored.

## Maven commands

```bash
./mvnw test        # run the test suite
./mvnw package     # build the executable jar into target/
./mvnw spring-boot:run
```

On Windows use `mvnw.cmd` instead of `./mvnw`.

## Running the backend

With PostgreSQL running and the environment set:

```bash
export DB_PASSWORD='<your-password>'
./mvnw spring-boot:run
```

Or from the packaged jar:

```bash
./mvnw package
java -jar target/ner-shield-backend-0.1.0-SNAPSHOT.jar
```

The application refuses to start if it cannot reach the database, because Flyway runs
before the context finishes initialising.

## Endpoints

### `GET /api/health` — public

```json
{
  "status": "UP",
  "service": "NER-SHIELD Backend"
}
```

Reports only that the HTTP layer is serving. Dependency health belongs to Actuator.

### `GET /actuator/health` — public

Boot's health endpoint, including the database indicator and liveness/readiness probes.
`/actuator/info` and any other Actuator endpoint require authentication.

### Error contract

Every failure returns the same shape, produced by `GlobalExceptionHandler`:

```json
{
  "timestamp": "2026-08-28T17:25:39.633+05:30",
  "status": 404,
  "error": "Not Found",
  "message": "Incident not found: 42",
  "path": "/api/incidents/42"
}
```

Validation failures add a `details` array of `{ "field": ..., "message": ... }`. Null
fields are omitted. Controllers return DTOs; JPA entities are never serialised directly.

## Security

The filter chain is already stateless and token-shaped — no sessions, no CSRF token, no
login form — but **no authentication mechanism is wired in yet**. `/api/health` and the
Actuator health endpoint are public; every other route answers `401` with the standard
error payload.

Boot's default in-memory user is explicitly disabled
(`UserDetailsServiceAutoConfiguration` is excluded), so the application ships with no
credentials of any kind.

The authentication phase will add a `JwtTokenProvider` implementation plus a request
filter that turns a bearer token into an `Authentication`. `JwtProperties` already binds
`nershield.security.jwt.*` and exposes `isConfigured()` so that implementation can fail
fast on a missing secret.

## Database migrations

Flyway runs automatically on startup against `classpath:db/migration`. Migrations are
named `V<n>__<description>.sql` and are immutable once merged — corrections go into a new
migration. `V1__initial_schema.sql` only enables PostGIS; domain tables arrive with the
domains that own them.

`spring.jpa.hibernate.ddl-auto` is `validate`: Hibernate never changes the schema, it only
checks that the mapped entities match what Flyway produced.

## Testing

```bash
./mvnw test
```

The tests boot the full application context against an in-memory H2 database with Flyway
disabled, so no PostgreSQL server is needed. They cover context startup, `/api/health`,
Actuator health exposure, the `401` baseline for protected routes, and configuration
binding for CORS, AI and JWT properties.

Because the PostGIS migrations and spatial SQL cannot run on H2, tests that exercise real
spatial queries will need a PostgreSQL instance and should declare that dependency
explicitly.

## Future integration with the Python AI service

`AIService` is the application-facing entry point; `AIClient` owns the HTTP transport
(base URL, timeouts, error translation) to the FastAPI service at
`AI_SERVICE_BASE_URL`, default `http://localhost:8000`. Domain code should depend on
`AIService` so that retries, caching and fallbacks can be added without touching call
sites.

Today only `GET /health` on the AI service is defined, and `AIService.isAvailable()`
degrades to `false` when the service is unreachable. Inference calls will be added
alongside the FastAPI endpoints that back them. The Python service is not part of this
repository.
