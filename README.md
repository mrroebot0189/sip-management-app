# Work Programme Management Application

A full-stack web application for managing programmes of work, built for deployment on **Microsoft Azure App Service** with **Azure SQL Database**.

## Features

- **Dashboard** — KPI summary, at-risk alerts, recent activity, my work items
- **Programmes** — Create and manage strategic programmes with budget, objectives, progress tracking
- **Projects** — Projects nested within programmes, Kanban board + list view
- **Work Items** — Task tracking with status, priority, assignee, due dates, overdue alerts
- **Users** — User management with role-based access control
- **Security** — JWT authentication, bcrypt password hashing, rate limiting, helmet security headers

## Roles

| Role | Permissions |
|------|-------------|
| Admin | Full access, user management |
| Programme Manager | Create/edit programmes and projects |
| Project Manager | Manage their projects and work items |
| Team Member | View and update work item status |
| Viewer | Read-only access |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20, Express 4, TypeScript |
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Database | Azure SQL (SQL Server), Sequelize ORM |
| Auth | JWT (8h expiry), bcryptjs |
| Deployment | Azure App Service, GitHub Actions CI/CD |

## Local Development

### Prerequisites
- Node.js 20+
- SQL Server or Azure SQL (or SQL Server in Docker)

### Setup

```bash
# Install all dependencies
npm run install:all

# Configure backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your DB credentials

# Run database migrations
npm run migrate

# Seed initial data (creates admin + sample data)
npm run seed

# Start development servers (run in separate terminals)
npm run dev:backend   # API on http://localhost:3001
npm run dev:frontend  # UI on http://localhost:3000
```

### SQL Server via Docker (for local dev)
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourPassword123!" \
  -p 1433:1433 --name sql-dev \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

## Deployment to Azure

See [AZURE_DEPLOYMENT.md](./AZURE_DEPLOYMENT.md) for the full step-by-step deployment guide.
