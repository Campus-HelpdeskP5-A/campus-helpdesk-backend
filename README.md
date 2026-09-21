# Campus Helpdesk Backend

Backend API service for the Campus Helpdesk system.

The backend is responsible for authentication and authorization, business logic, database communication, API endpoints, and integration with other services when required.

## Technology Stack

* **Runtime:** Node.js
* **Framework:** Express 5
* **Database:** PostgreSQL
* **Authentication:** JWT
* **Password Hashing:** bcrypt
* **API Documentation:** Swagger / OpenAPI
* **Package Manager:** npm
* **Development Server:** Nodemon
* **Containerization:** Docker

## Project Structure

```text
campus-helpdesk-backend/
├── api/
│   └── index.js
├── database/
│   ├── schema.sql
│   └── seed.sql
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── swagger.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── user.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   └── role.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── user.routes.js
│   ├── services/
│   ├── models/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── .dockerignore
├── .env.example
├── .gitignore
├── Dockerfile
├── package.json
├── package-lock.json
└── README.md
```

## Prerequisites

Make sure the following are installed:

* Node.js
* npm
* PostgreSQL
* Git

Docker can be used when running the application in a containerized environment.

## Environment Variables

Create a local `.env` file based on `.env.example`.

Example:

```env
PORT=5000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=campus_helpdeskv2
DB_USER=postgres
DB_PASSWORD=your_postgres_password

JWT_SECRET=your_jwt_secret
```

Never commit `.env` or real credentials to Git.

## Database Setup

Create the PostgreSQL database:

```sql
CREATE DATABASE campus_helpdeskv2;
```

Apply the database schema:

```powershell
psql -U postgres -d campus_helpdeskv2 -f database\schema.sql
```

Apply the seed data:

```powershell
psql -U postgres -d campus_helpdeskv2 -f database\seed.sql
```

The seed file currently contains the initial system roles:

* `admin`
* `support_agent`
* `technician`
* `requester`

## Installation

Clone the repository and install dependencies:

```powershell
npm install
```

Create the `.env` file and configure the database connection and JWT secret.

## Running Locally

### Development

Run the backend with Nodemon:

```powershell
npm run dev
```

### Production

Run the backend with Node.js:

```powershell
npm start
```

The default local port is:

```text
5000
```

The API is available at:

```text
http://localhost:5000
```

## API Documentation

Swagger UI is available at:

```text
http://localhost:5000/api-docs
```

The backend currently documents its implemented endpoints using Swagger JSDoc.

The infrastructure repository defines `docs/openapi.yaml` as the authoritative API specification for cross-service API contracts.

Any API change that affects other services should be coordinated with the affected teams and reflected in the agreed API specification.

## Current API Endpoints

### Authentication

```text
POST /api/auth/login
```

Authenticates a user and returns a JWT access token.

### Users

```text
GET /api/users
POST /api/users
```

User management endpoints currently require authentication and the appropriate authorization role.

### Protected Route

```text
GET /api/protected
```

Test endpoint demonstrating JWT authentication and role-based authorization.

### Database Health Check

```text
GET /db-test
```

Checks whether the backend can successfully communicate with PostgreSQL.

## Authentication

Protected endpoints use JWT Bearer authentication.

Send the token using the HTTP `Authorization` header:

```text
Authorization: Bearer <token>
```

Tokens and authentication credentials must not be logged, committed, or exposed in source code.

## Authorization

The backend separates authentication from authorization.

Authentication verifies the user's identity.

Authorization verifies whether the authenticated user's role is allowed to access a resource.

Current system roles:

```text
admin
support_agent
technician
requester
```

## Response Format

Successful responses generally follow:

```json
{
  "success": true,
  "data": {}
}
```

Error responses should provide useful information without exposing secrets, stack traces, or internal infrastructure details.

The final API response contract is governed by the agreed OpenAPI specification.

## Testing

Automated testing is being introduced as part of the backend quality baseline.

Before creating a Pull Request:

* Run the available automated tests.
* Verify the affected API endpoints.
* Test authentication and authorization behavior where applicable.
* Document relevant manual verification when automated tests are not available.

## Docker

The backend includes:

```text
Dockerfile
.dockerignore
```

Docker configuration should not contain secrets.

Required configuration should be provided through environment variables.

## Git Workflow

Do not work directly on `main` for normal feature development.

Create a feature branch:

```powershell
git checkout -b feature/<short-description>
```

Examples:

```text
feature/ticket-api
feature/user-authentication
fix/login-error
```

Push the branch:

```powershell
git push -u origin feature/<short-description>
```

Create a Pull Request from the feature branch to `main`.

## Commit Messages

Use clear and descriptive commit messages.

Examples:

```text
feat: add ticket creation endpoint
fix: handle invalid user login
docs: update API documentation
refactor: improve ticket service
test: add authentication tests
```

## Security

Never commit:

* `.env` files
* Passwords
* API keys
* JWT secrets
* Access tokens
* Private keys
* Other sensitive credentials

Security-sensitive changes should be coordinated with the responsible team.

## Related Documentation

Infrastructure and service-level contracts are maintained in the infrastructure repository:

```text
campus-helpdesk-infra/
├── docs/
│   ├── API_CONTRACT.md
│   ├── DATABASE_ENVIRONMENT_CONTRACT.md
│   ├── DEVELOPMENT_WORKFLOW.md
│   ├── SERVICE_CONTRACT.md
│   └── SOURCE_CODE_INTAKE.md
└── security/
```

## License

Internal project for Campus Helpdesk.
