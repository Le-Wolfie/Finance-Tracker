# Finance Tracker

Finance Tracker is a full-stack personal finance app with a .NET API and a React frontend.

This README covers local development only.
Deployment is not included yet.

## What This Project Does

You can:

- Create accounts and track balances
- Create income/expense categories
- Add, edit, filter, search, and delete transactions
- Manage monthly budgets and budget templates
- Track savings goals and contributions
- Create recurring transaction rules and execute/pause/resume them
- View dashboard and reports for monthly performance
- Authenticate with email/password and JWT sessions

## Current Feature Set

### Authentication

- Register and login with email/password
- JWT-based session handling
- Persistent login state in frontend

### Accounts

- Create and list accounts
- Account balance visibility
- Account list pagination in frontend

### Categories

- Create and list categories
- Income and expense category support
- Scrollable large lists in frontend

### Transactions

- CRUD transaction flow (including delete confirmation)
- Server-side filtering by date/category
- Search + pagination behavior fixed in frontend
- Edit flow supports deep link loading by transaction id

### Budgets

- Monthly budget creation
- Budget templates
- Apply template to month
- Rollover support and rollover history

### Savings Goals

- Create goals tied to accounts
- Contribution tracking
- Goal summary metrics
- Search + pagination behavior fixed in frontend

### Recurring Transactions

- Create recurring rules
- Pause/resume/execute actions
- Execution history view
- Delete confirmation modal
- Search + pagination behavior fixed in frontend

### Reporting

- Monthly summary report
- Category breakdown report
- Dashboard-style reporting endpoint
- Reports page charts (Recharts)


## Tech Stack and Tools Used

### Backend (`FinancialTracker.API`)

- .NET 9 / ASP.NET Core Web API
- Entity Framework Core
- Pomelo MySQL provider
- FluentValidation
- JWT authentication
- Serilog logging
- Swagger/OpenAPI
- DotNetEnv for `.env` loading

### Frontend (`frontend`)

- React 19 + TypeScript + Vite
- React Router
- TanStack Query
- React Hook Form + Zod
- Tailwind CSS
- Recharts
- Axios


## Project Structure

```text
Finance Tracker/
  FinancialTracker.API/        # .NET backend
    Features/                  # Domain feature modules (Auth, Accounts, etc.)
    scripts/                   # Smoke tests and seed scripts
    .env.example
  frontend/                    # React frontend
    src/
      app/                     # Router and app-level setup
      features/                # Page/feature modules
      components/              # Shared UI
      lib/                     # API/auth/util helpers
    .env.example
  Finance Tracker.sln
```

## Local Setup

## Prerequisites

- Node.js 20+
- npm 10+
- .NET SDK 9+
- MySQL 8+

## 1) Backend Setup

From `FinancialTracker.API`:

```bash
dotnet restore
```

Create `.env` from `.env.example` and set real values:

- `ConnectionStrings__DefaultConnection`
- `Jwt__Issuer`
- `Jwt__Audience`
- `Jwt__Key`
- `Jwt__ExpiryMinutes`

Run the API:

```bash
dotnet run
```

Default local API URL:

- `http://localhost:5104`

Swagger (development):

- `http://localhost:5104/swagger`

## 2) Frontend Setup

From `frontend`:

```bash
npm install
```

Create `.env` from `.env.example` (if needed):

```bash
VITE_API_BASE_URL=http://localhost:5104
```

Run the frontend:

```bash
npm run dev
```

Default local frontend URL:

- `http://localhost:5173`


## Notes

- CORS development origins are configured in `FinancialTracker.API/appsettings.Development.json`.
- Frontend and backend are currently maintained as separate folders with their own setup.
- Deployment documentation will be added later.
