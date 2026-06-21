# AEON v0.1-alpha

AEON is a local-first, event-sourced, verifier-driven AI operating system for autonomous work.

## Core Architecture

AEON organizes operations through a strict, append-only immutable event spine:

```
User (Message/Goal)
   ↳ POST /chat
         ↳ AEON Engine
               ↳ Create Trace (if null)
               ↳ Append Events (immutably log all trace steps)
```

## Required Stack

- Node.js 22 & TypeScript
- Express
- PostgreSQL 16 with `pgvector`
- Drizzle ORM
- Zod Request/Data Validation

---

## API Endpoints

### Health Check
- `GET /api/health` -> Returns `{ "status": "ok" }`

### Chat Operation
- `POST /api/chat` -> Validates request of format:
  ```json
  {
    "message": "My query goal",
    "traceId": null,
    "metadata": {}
  }
  ```
  Returns `ChatResponse` with trace tracking IDs.

### Trace Management
- `POST /api/traces` -> Create a new trace manually
- `GET /api/traces` -> List all active or historic traces
- `GET /api/traces/:traceId` -> Get specific trace details
- `GET /api/traces/:traceId/events` -> Get trace timeline ordered by sequence/timestamp

### Event Read Operations
- `GET /api/events/:eventId` -> Retrieve unique event ledger record.
- **Note**: Modifying (PUT, PATCH) or Deleting (DELETE) events results in an automatic database error to protect transaction logs.
