# TaskFlow API

Express + MySQL backend for TaskFlow. It provides JWT authentication, role-based admin access, project membership roles, CRUD endpoints, validation, structured errors, rate limiting, and JSON logging.

## Structure

```text
src/
  config/       environment and database configuration
  controllers/  HTTP request/response orchestration
  services/     domain and persistence operations
  models/       row mappers and shared entity constants
  routes/       endpoint declarations and route-level validation
  middleware/   authentication, validation, and error handling
  utils/        token, logging, response, and error helpers
sql/            MySQL schema bootstrap
```

## Run locally

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, and `JWT_SECRET` in `.env`. The API starts at `http://localhost:4000` and exposes `GET /health` as its readiness endpoint.

If you want a local MySQL container, run:

```bash
docker compose up --build
```

The compose file starts MySQL 8.4, loads [sql/schema.sql](sql/schema.sql), and then starts the API once the database healthcheck passes.

## Environment

`backend/.env.example` documents the required variables. `JWT_SECRET` must be at least 32 characters and should be generated securely. `CORS_ORIGIN` is a comma-separated list of allowed frontend origins.

## Database

MySQL tables:

- `users`
- `projects`
- `project_members`
- `tasks`

`projects.owner_id` references `users.id`, `project_members` links users to projects with a role, and `tasks` references the project, assignee, and creator.

## API

All successful responses use:

```json
{ "success": true, "data": { ... }, "meta": { ... } }
```

All errors use:

```json
{ "success": false, "error": { "message": "...", "details": [...] } }
```

Key routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/users`
- `GET /api/projects`
- `GET /api/projects/:projectId/tasks`
- `GET /api/tasks/:taskId`
- `GET /api/admin/dashboard`

Use `Authorization: Bearer <token>` for protected requests.

## Deployment

1. Provision a MySQL 8.x database and run [sql/schema.sql](sql/schema.sql).
2. Set the environment variables from `.env.example`.
3. Deploy with `npm ci --omit=dev` and `npm start`, or use the included `Dockerfile`.
4. Point your reverse proxy or platform health check at `GET /health`.

The API closes the database pool cleanly on `SIGTERM` and `SIGINT`.
