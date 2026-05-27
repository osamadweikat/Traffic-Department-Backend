# Traffic Department Backend

Node.js/Express backend for a Traffic Department service portal. The project supports a minimum working flow for citizens, staff, and admins:

- Citizen registration/login, profile, vehicles, and transaction tracking.
- Citizen service requests connected to a central transactions table.
- Staff transaction review and status workflow.
- Minimum admin user, employee, transaction assignment, and dashboard summary APIs.
- Private upload validation and protected document access.
- MySQL schema and seed data for local testing.

This repository is being prepared as a GitHub portfolio project. It intentionally focuses on backend API architecture and phased completion instead of a full production portal.

## Tech Stack

- Node.js
- Express
- MySQL with `mysql2`
- JWT authentication
- `bcryptjs` password hashing
- `multer` for current prototype upload routes
- `dotenv` for environment configuration

## Project Structure

```text
.
├── db.js                       # Shared MySQL pool
├── server.js                   # Express app entry point
├── middleware/
│   └── auth.js                 # JWT and role middleware
├── routes/
│   ├── admin.js                # Minimum admin APIs
│   ├── citizen.js              # Authenticated citizen self-service APIs
│   ├── staff/                  # Staff transaction and user routes
│   └── *.js                    # Existing service request routes
├── services/
│   └── transactions.js         # Central transaction helpers/workflow
├── schema.sql                  # Minimum compatible MySQL schema
├── seed.sql                    # Seed users, employees, vehicles, and test data
├── API_TESTING.md              # Manual API testing guide
└── IMPLEMENTATION_PLAN.md      # Phase notes and remaining work
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file from the example:

```bash
cp .env.example .env
```

On Windows PowerShell, create `.env` manually or use:

```powershell
Copy-Item .env.example .env
```

3. Edit `.env` with your local MySQL credentials and a long random `JWT_SECRET`.

4. Import the database schema and seed data:

```bash
mysql -u root -p --default-character-set=utf8mb4 < schema.sql
mysql -u root -p --default-character-set=utf8mb4 software < seed.sql
```

5. Start the server:

```bash
npm start
```

Default URL:

```text
http://localhost:3000
```

## Automated Smoke Tests

The project includes a small dependency-free smoke test runner for the current MVP backend.

Run it after importing `schema.sql` and `seed.sql` and configuring your database environment:

```bash
npm test
```

If you have not created `.env` yet, copy `.env.example` first and set your real local MySQL values:

```bash
cp .env.example .env
```

Required for the spawned test server:

```text
DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
JWT_SECRET
```

On Windows PowerShell, if script execution blocks `npm.ps1`, use:

```powershell
npm.cmd test
```

The smoke runner starts the backend on port `3100` by default, uses the seeded citizen/staff/admin accounts, creates a temporary license-renewal upload transaction, and verifies role-protected API access.

Useful options:

```bash
SMOKE_TEST_PORT=3101 npm test
SMOKE_START_SERVER=false SMOKE_BASE_URL=http://localhost:3000 npm test
SMOKE_VERBOSE=true npm test
```

## Seed Accounts

| Role | National ID | Password |
| --- | --- | --- |
| Citizen | `123456789` | `password123` |
| Staff | `987654321` | `staff123` |
| Admin | `111222333` | `admin123` |

## Authentication

Login returns a JWT:

```http
POST /login
Content-Type: application/json

{
  "national_id": "111222333",
  "password": "admin123"
}
```

Use protected routes with:

```http
Authorization: Bearer <token>
```

## Upload Security

Uploaded citizen documents are no longer served publicly from `/uploads`. Supported upload types are:

- PDF
- JPG/JPEG
- PNG

The default maximum file size is 5 MB and can be changed with:

```text
UPLOAD_MAX_FILE_SIZE=5242880
```

Uploaded file metadata is stored in `transaction_documents` when the service request has a central transaction. Documents can be listed or downloaded through authenticated API routes:

```http
GET /api/documents/transactions/:transactionId
GET /api/documents/:id/download
```

Citizens can access only documents attached to their own transactions. Staff and admins can access documents attached to central transactions.

## Implemented Backend Scope

- Phase 1: server startup, shared DB module, dotenv setup.
- Phase 2: schema v1 and seed data.
- Phase 3: JWT authentication and citizen/staff/admin roles.
- Phase 4: central transactions workflow.
- Phase 5: authenticated citizen self-service APIs.
- Phase 6: staff transaction review and status workflow.
- Phase 7: minimum admin APIs.
- Phase 8: code quality and portfolio documentation pass.

## Known Limitations

- Upload routes now have basic file type, file size, safe filename, metadata, and private access handling.
- Some legacy routes still return raw compatibility table shapes.
- Some old route names are kept for frontend compatibility.
- There is no automated integration test suite yet; current verification is via manual smoke tests.
- `routes/gimini_licence.js` is a standalone experimental Gemini upload server and is not mounted in `server.js`.
- `node_modules/` and generated `uploads/` should not be committed to GitHub. They are now ignored, but if already tracked locally, remove them from the Git index before publishing.

## Suggested Next Improvements

- Add automated API integration tests.
- Expand upload hardening with malware scanning, cloud/private object storage, and retention rules.
- Normalize legacy response shapes.
- Add request validation middleware.
- Add migration tooling instead of one compatibility-focused SQL file.
- Add a cleaner assignment/audit log workflow.
