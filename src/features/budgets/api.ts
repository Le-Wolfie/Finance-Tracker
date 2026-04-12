import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type BudgetRolloverStrategy = 1 | 2 | 3;

export type BudgetStatus = {
  budgetId: string;
  categoryId: string;
  year: number;
  month: number;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  isExceeded: boolean;
};

export type BudgetAlert = {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  year: number;
  month: number;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  usagePercent: number;
  isExceeded: boolean;
};

export type BudgetTemplate = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  monthlyLimit: number;
  rolloverStrategy: BudgetRolloverStrategy;
  isActive: boolean;
  createdAt: string;
};

export type BudgetRolloverRecord = {
  id: string;
  categoryId: string;
  fromBudgetId?: string | null;
  toBudgetId: string;
  fromYear: number;
  fromMonth: number;
  toYear: number;
  toMonth: number;
  previousMonthlyLimit: number;
  previousSpent: number;
  rolledOverAmount: number;
  newMonthlyLimit: number;
  appliedStrategy: BudgetRolloverStrategy;
  createdAt: string;
};

export type BudgetRolloverResult = {
  year: number;
  month: number;
  processedCount: number;
  skippedCount: number;
};

export type SetBudgetPayload = {
  categoryId: string;
  monthlyLimit: number;
  year: number;
  month: number;
};

export type CreateBudgetTemplatePayload = {
  categoryId: string;
  name: string;
  description: string;
  monthlyLimit: number;
  rolloverStrategy: BudgetRolloverStrategy;
};

export type UpdateBudgetTemplatePayload = {
  id: string;
  name: string;
  description: string;
  monthlyLimit: number;
  rolloverStrategy: BudgetRolloverStrategy;
  isActive: boolean;
};

export type ApplyBudgetTemplatePayload = {
  templateId: string;
  year: number;
  month: number;
  overrideMonthlyLimit?: number;
};

export type RunBudgetRolloverPayload = {
  year: number;
  month: number;
};

async function getBudgetAlerts(
  year: number,
  month: number,
  thresholdPercent = 80,
): Promise<BudgetAlert[]> {
  const response = await apiClient.get<BudgetAlert[]>("/budgets/alerts", {
    params: { year, month, thresholdPercent },
  });
  return response.data;
}

async function getBudgetStatus(
  categoryId: string,
  year: number,
  month: number,
): Promise<BudgetStatus> {
  const response = await apiClient.get<BudgetStatus>("/budgets/status", {
    params: { categoryId, year, month },
  });
  return response.data;
}

async function setBudget(payload: SetBudgetPayload): Promise<BudgetStatus> {
  const response = await apiClient.post<BudgetStatus>("/budgets", payload);
  return response.data;
}

async function getBudgetTemplates(
  isActive?: boolean,
): Promise<BudgetTemplate[]> {
  const response = await apiClient.get<BudgetTemplate[]>("/budgets/templates", {
    params: { isActive },
  });
  return response.data;
}

async function createBudgetTemplate(
  payload: CreateBudgetTemplatePayload,
): Promise<BudgetTemplate> {
  const response = await apiClient.post<BudgetTemplate>(
    "/budgets/templates",
    payload,
  );
  return response.data;
}

async function updateBudgetTemplate(
  payload: UpdateBudgetTemplatePayload,
): Promise<BudgetTemplate> {
  const { id, ...body } = payload;
  const response = await apiClient.put<BudgetTemplate>(
    `/budgets/templates/${id}`,
    body,
  );
  return response.data;
}

async function applyBudgetTemplate(
  payload: ApplyBudgetTemplatePayload,
): Promise<BudgetStatus> {
  const response = await apiClient.post<BudgetStatus>(
    "/budgets/apply-template",
    payload,
  );
  return response.data;
}

async function runBudgetRollover(
  payload: RunBudgetRolloverPayload,
): Promise<BudgetRolloverResult> {
  const response = await apiClient.post<BudgetRolloverResult>(
    "/budgets/rollover",
    payload,
  );
  return response.data;
}

async function getBudgetRolloverHistory(
  year: number,
  month: number,
): Promise<BudgetRolloverRecord[]> {
  const response = await apiClient.get<BudgetRolloverRecord[]>(
    "/budgets/rollover/history",
    {
      params: { year, month },
    },
  );
  return response.data;
}

export function useBudgetAlertsQuery(year: number, month: number) {
  return useQuery({
    queryKey: ["budgets", "alerts", year, month],
    queryFn: () => getBudgetAlerts(year, month),
  });
}

export function useBudgetStatusQuery(
  categoryId: string | undefined,
  year: number,
  month: number,
) {
  return useQuery({
    queryKey: ["budgets", "status", categoryId, year, month],
    queryFn: () => getBudgetStatus(categoryId as string, year, month),
    enabled: Boolean(categoryId),
  });
}

export function useSetBudgetMutation() {
  return useMutation({
    mutationFn: setBudget,
  });
}

export function useBudgetTemplatesQuery(isActive?: boolean) {
  return useQuery({
    queryKey: ["budgets", "templates", isActive],
    queryFn: () => getBudgetTemplates(isActive),
  });
}

export function useCreateBudgetTemplateMutation() {
  return useMutation({
    mutationFn: createBudgetTemplate,
  });
}

export function useUpdateBudgetTemplateMutation() {
  return useMutation({
    mutationFn: updateBudgetTemplate,
  });
}

export function useApplyBudgetTemplateMutation() {
  return useMutation({
    mutationFn: applyBudgetTemplate,
  });
}

export function useRunBudgetRolloverMutation() {
  return useMutation({
    mutationFn: runBudgetRollover,
  });
}

export function useBudgetRolloverHistoryQuery(year: number, month: number) {
  return useQuery({
    queryKey: ["budgets", "rollover-history", year, month],
    queryFn: () => getBudgetRolloverHistory(year, month),
  });
}

export function rolloverStrategyLabel(value: BudgetRolloverStrategy): string {
  if (value === 1) return "None";
  if (value === 2) return "Unused Only";
  return "Partial Unused 50%";
}
