# Taskroom — full stack task manager

React UI → Nginx `/api` proxy → Express API → PostgreSQL.

This local, single-user lab app supports creating, viewing, editing, completing,
and deleting tasks. It does not have authentication. Compose publishes only the
frontend on Windows loopback; the API and database stay on the internal network.

## Start on Windows

From `D:\devops-k8s-project\apps\task-manager`:

```powershell
# First setup only; do not overwrite an existing .env.
Copy-Item .env.example .env
# Edit .env: set POSTGRES_PASSWORD to a random alphanumeric password.
docker compose up -d --build --wait
```

Open http://localhost:8084. Docker Desktop must be running.
The automatically prepared `.env` on this workstation already contains a random
local password. Do not commit it. Use URL-safe alphanumeric characters because
the value is interpolated into the API database connection URL.

## Check and test

```powershell
docker compose ps
docker compose exec -T backend npm test --workspace=backend
curl.exe http://localhost:8084/api/ready
```

The integration test creates its own record, verifies CRUD and validation
against PostgreSQL, and deletes only that record. The UI is compiled during the
frontend image build. `/api/health` checks the API process; `/api/ready` checks
the database connection.

## Persistence and stopping

PostgreSQL data is kept in named volume `lab-task-manager_task-data`.
`docker compose stop` stops this app without deleting data; `docker compose up -d`
starts it again. `docker compose down` also retains the volume. Do not add `-v`
unless deliberately deleting this app's database. Changing the password in
`.env` does not change the password inside an already initialized database.

## Source layout

- `frontend/src/`: React interface and responsive styles.
- `frontend/nginx.conf`: same-origin API proxy, avoiding browser CORS setup.
- `backend/src/`: Express routes, validation, parameterized SQL, shutdown.
- `backend/migrations/001-tasks.sql`: repeatable initial schema, run at startup.
- `backend/test/`: real database integration tests.
- `compose.yaml`: three services, health checks, internal networking, named volume.

The initial migration is idempotent. Future schema changes should use new,
versioned migrations with a migration ledger instead of modifying this file.

## Next checkpoint

After this local stack is verified, build versioned frontend/API images, push
them to Docker Hub, and add Kubernetes resources in a separate namespace. Use
a PostgreSQL PVC and runtime Secret, resource limits, readiness checks, and
Windows forwarding. The Nginx Docker DNS resolver must be adjusted for Kubernetes.
Then automate the verified workflow in Jenkins. Existing `testjs`, demo, and
WordPress deployments remain separate.
