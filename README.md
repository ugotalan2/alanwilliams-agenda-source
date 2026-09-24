# AlanWilliams Agenda

Meeting planning, discussion, assignment, and follow-up application in the AlanWilliams Apps ecosystem.

## Purpose

Agenda supports reusable meeting workflows across organizations and meeting types. It is evolving from the original Ward Council agenda application into a multi-organization meeting workflow system.

Core capabilities include:

- organizations and memberships
- configured meeting types and dated meetings
- standing members and guests
- discussion questions and member topic requests
- assignments and follow-up
- reminders and recurring meeting plans
- training/preparation resources
- reusable organization documents
- confidential meeting notes and approved summaries
- review-first AI assistance for summaries and assignment extraction

## Platform Integration

Agenda is one application within AlanWilliams Apps.

```text
Clerk
  |
  v
AlanWilliams Platform Person
  |
  v
Agenda organizations / memberships / permissions
```

The canonical Person identity is owned by `alanwilliams-platform`. Agenda owns Agenda-specific organizations, memberships, roles, meeting access, permissions, and settings.

Agenda validates Clerk JWTs locally rather than routing authentication through the Platform backend.

## Repository Structure

```text
alanwilliams-agenda/
├── backend/      # Java / Spring Boot API
├── frontend/     # React / TypeScript / Vite client
├── ALANWILLIAMS_AGENDA_OVERVIEW.md
├── ALANWILLIAMS_AGENDA_ARCHITECTURE.md
└── README.md
```

## Technology

### Frontend

- React
- TypeScript
- Vite
- nginx in deployed containers
- responsive web first

### Backend

- Java 25
- Spring Boot 4.1
- REST API
- Spring Security
- Clerk JWT validation
- Hibernate/JPA
- Flyway

### Database

- PostgreSQL 17
- `agenda_test`
- `agenda_prod`

## Environments

| Environment | Frontend | API |
| --- | --- | --- |
| Test | `agenda-test.alanwilliams.app` | `api-test.alanwilliams.app/agenda/...` |
| Production | `agenda.alanwilliams.app` | `api.alanwilliams.app/agenda/...` |

## Local Development

The project currently uses Docker-based local development.

```bash
docker compose up --build
```

Frontend development configuration uses Vite environment variables. The frontend API client appends the Agenda service prefix to the configured API hostname.

Example:

```text
VITE_API_URL=http://192.168.1.100:8080
```

API requests use:

```text
/agenda/...
```

Secrets and environment-specific Clerk configuration must remain outside source control.

## Deployment

Agenda test and production are self-hosted on the AlanWilliams server through Docker and Cloudflare Tunnel.

The Git flow is:

```text
feature/* -> PR/tests -> dev -> test deployment
dev       -> PR/tests -> main -> production deployment
```

Current deployment recovery has been verified through both Ubuntu VM reboot and physical Windows-host reboot.

Production PostgreSQL backups are written to physical storage and copied off-site to Google Drive. Restore testing has been completed successfully.

## Security and Confidentiality

Clerk provides authentication. Agenda authorization is enforced by the Java backend.

Important rules include:

- organization membership does not automatically grant every meeting permission
- confidential meeting access follows current authorization
- historical attendance does not permanently grant access to confidential notes
- released/removed confidential-meeting members lose historical confidential-note access
- guests do not receive raw notes or meeting summaries after meetings
- guests receive only assignments explicitly assigned to them

## Shared UI Direction

Agenda uses the shared AlanWilliams shell conventions with an Agenda-specific blue identity.

```text
[A] Agenda                                  [Profile]
```

Desktop uses a top header and collapsible sidebar. Mobile uses a compact header and bottom navigation.

Primary navigation direction:

```text
Home
Agendas
Questions
Assignments
More
```

## Documentation

See:

- `ALANWILLIAMS_AGENDA_OVERVIEW.md` for Agenda status, roadmap, and current priorities.
- `ALANWILLIAMS_AGENDA_ARCHITECTURE.md` for the Agenda domain model, authorization rules, meeting workflows, schema direction, and implementation architecture.

Cross-application contracts such as canonical Person identity, repository conventions, and shared authentication are defined by the Platform architecture rather than duplicated here.

## Current Priority

Before Sprint 2 implementation, standardize the existing repository, Java package, Docker image/container, network, deployment-directory, and CI/CD naming around the `alanwilliams-agenda` convention. After that, Agenda will consume the shared Spring Security integration and Platform Person identity foundation.
