import {
  Outlet,
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";
import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { AuthPage } from "../features/auth/AuthPage";
import { useAuth } from "../lib/auth/useAuth";
import { AppShell } from "../components/layout/AppShell";

const DashboardPage = lazy(() =>
  import("../features/dashboard/DashboardPage").then((module) => ({
    default: module.DashboardPage,
  })),
);
const AccountsPage = lazy(() =>
  import("../features/accounts").then((module) => ({
    default: module.AccountsPage,
  })),
);
const CategoriesPage = lazy(() =>
  import("../features/categories").then((module) => ({
    default: module.CategoriesPage,
  })),
);
const TransactionsPage = lazy(() =>
  import("../features/transactions/TransactionsPage").then((module) => ({
    default: module.TransactionsPage,
  })),
);
const TransactionEditorPage = lazy(() =>
  import("../features/transactions/TransactionEditorPage").then((module) => ({
    default: module.TransactionEditorPage,
  })),
);
const BudgetsPage = lazy(() =>
  import("../features/budgets/BudgetsPage").then((module) => ({
    default: module.BudgetsPage,
  })),
);
const BudgetTemplatesPage = lazy(() =>
  import("../features/budgets/BudgetTemplatesPage").then((module) => ({
    default: module.BudgetTemplatesPage,
  })),
);
const RolloverHistoryPage = lazy(() =>
  import("../features/budgets/RolloverHistoryPage").then((module) => ({
    default: module.RolloverHistoryPage,
  })),
);
const SavingsGoalsPage = lazy(() =>
  import("../features/savings-goals/SavingsGoalsPage").then((module) => ({
    default: module.SavingsGoalsPage,
  })),
);
const SavingsGoalDetailPage = lazy(() =>
  import("../features/savings-goals/SavingsGoalDetailPage").then((module) => ({
    default: module.SavingsGoalDetailPage,
  })),
);
const RecurringPage = lazy(() =>
  import("../features/recurring/RecurringPage").then((module) => ({
    default: module.RecurringPage,
  })),
);
const RecurringEditorPage = lazy(() =>
  import("../features/recurring/RecurringEditorPage").then((module) => ({
    default: module.RecurringEditorPage,
  })),
);
const ReportsPage = lazy(() =>
  import("../features/reports/ReportsPage").then((module) => ({
    default: module.ReportsPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../features/settings/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to='/auth' replace />;
  }

  return <>{children}</>;
}

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/dashboard" : "/auth"} replace />;
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppShell>
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </AppShell>
    </ProtectedRoute>
  );
}

function PageLoading() {
  return <p className='text-sm text-text-secondary'>Loading page...</p>;
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      {
        path: "dashboard",
        element: <DashboardPage />,
      },
      {
        path: "accounts",
        element: <AccountsPage />,
      },
      {
        path: "categories",
        element: <CategoriesPage />,
      },
      {
        path: "transactions",
        element: <TransactionsPage />,
      },
      {
        path: "transactions/new",
        element: <TransactionEditorPage />,
      },
      {
        path: "transactions/:id/edit",
        element: <TransactionEditorPage />,
      },
      {
        path: "budgets",
        element: <BudgetsPage />,
      },
      {
        path: "budgets/templates",
        element: <BudgetTemplatesPage />,
      },
      {
        path: "budgets/rollover-history",
        element: <RolloverHistoryPage />,
      },
      {
        path: "savings-goals",
        element: <SavingsGoalsPage />,
      },
      {
        path: "savings-goals/:id",
        element: <SavingsGoalDetailPage />,
      },
      {
        path: "recurring",
        element: <RecurringPage />,
      },
      {
        path: "recurring/new",
        element: <RecurringEditorPage />,
      },
      {
        path: "recurring/:id/edit",
        element: <RecurringEditorPage />,
      },
      {
        path: "reports",
        element: <ReportsPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to='/' replace />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
