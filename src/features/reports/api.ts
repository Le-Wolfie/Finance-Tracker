import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type MonthlySummary = {
  year: number;
  month: number;
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
};

export type CategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  amount: number;
};

export type DashboardAccount = {
  id: string;
  name: string;
  balance: number;
  type: number;
};

export type DashboardBudgetAlert = {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  usagePercent: number;
  isExceeded: boolean;
};

export type DashboardSavingsGoalsSummary = {
  activeGoalsCount: number;
  completedGoalsCount: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallCompletionPercent: number;
};

export type DashboardUpcomingRecurring = {
  id: string;
  name: string;
  amount: number;
  type: number;
  nextExecutionDate: string;
};

export type DashboardOverview = {
  summary: MonthlySummary;
  topExpenseCategories: CategoryBreakdown[];
  accounts: DashboardAccount[];
  budgetAlerts: DashboardBudgetAlert[];
  savingsGoals: DashboardSavingsGoalsSummary;
  upcomingRecurringTransactions: DashboardUpcomingRecurring[];
};

async function getDashboard(
  year: number,
  month: number,
): Promise<DashboardOverview> {
  const response = await apiClient.get<DashboardOverview>(
    "/reports/dashboard",
    {
      params: { year, month, budgetAlertThresholdPercent: 80 },
    },
  );
  return response.data;
}

async function getMonthlySummary(
  year: number,
  month: number,
): Promise<MonthlySummary> {
  const response = await apiClient.get<MonthlySummary>(
    "/reports/monthly-summary",
    {
      params: { year, month },
    },
  );
  return response.data;
}

async function getCategoryBreakdown(
  year: number,
  month: number,
): Promise<CategoryBreakdown[]> {
  const response = await apiClient.get<CategoryBreakdown[]>(
    "/reports/category-breakdown",
    {
      params: { year, month },
    },
  );
  return response.data;
}

export function useDashboardQuery(year: number, month: number) {
  return useQuery({
    queryKey: ["reports", "dashboard", year, month],
    queryFn: () => getDashboard(year, month),
  });
}

export function useMonthlySummaryQuery(year: number, month: number) {
  return useQuery({
    queryKey: ["reports", "monthly-summary", year, month],
    queryFn: () => getMonthlySummary(year, month),
  });
}

export function useCategoryBreakdownQuery(year: number, month: number) {
  return useQuery({
    queryKey: ["reports", "category-breakdown", year, month],
    queryFn: () => getCategoryBreakdown(year, month),
  });
}
