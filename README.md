# Finance Tracker Frontend

React + TypeScript + Vite frontend for the Finance Tracker app.

## Requirements

- Node.js 20+
- npm 10+

## Environment

Copy `.env.example` to `.env` if you need a custom API URL.

Example:

```bash
VITE_API_BASE_URL=http://localhost:5104
```

## Run locally

```bash
npm install
npm run dev
```

## Build and checks

```bash
npm run lint
npm run build
```

## Notes

- The app expects the backend API to be running and reachable at `VITE_API_BASE_URL`.
- Routes and page modules live under `src/features` and `src/app`.
