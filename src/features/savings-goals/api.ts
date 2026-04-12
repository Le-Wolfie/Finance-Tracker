import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type SavingsGoalStatus = 1 | 2 | 3 | 4;

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type SavingsGoal = {
  id: string;
  accountId: string;
  name: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  completionPercent: number;
  startDate: string;
  targetDate: string;
  completedDate?: string | null;
  status: SavingsGoalStatus;
  createdAt: string;
};

export type SavingsGoalContribution = {
  id: string;
  savingsGoalId: string;
  transactionId?: string | null;
  amount: number;
  contributionDate: string;
  note: string;
  createdAt: string;
};

export type SavingsGoalsSummary = {
  activeGoalsCount: number;
  completedGoalsCount: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallCompletionPercent: number;
};

export type SavingsGoalFilter = {
  status?: SavingsGoalStatus;
  accountId?: string;
  page?: number;
  pageSize?: number;
};

export type CreateSavingsGoalPayload = {
  accountId: string;
  name: string;
  description: string;
  targetAmount: number;
  startDate: string;
  targetDate: string;
};

export type UpdateSavingsGoalPayload = {
  id: string;
  name: string;
  description: string;
  targetAmount: number;
  targetDate: string;
  status: SavingsGoalStatus;
};

export type AddSavingsGoalContributionPayload = {
  savingsGoalId: string;
  amount: number;
  contributionDate: string;
  note: string;
};

async function getSavingsGoals(
  filter: SavingsGoalFilter,
): Promise<PagedResult<SavingsGoal>> {
  const response = await apiClient.get<PagedResult<SavingsGoal>>(
    "/savings-goals",
    {
      params: {
        status: filter.status,
        accountId: filter.accountId,
        page: filter.page ?? 1,
        pageSize: filter.pageSize ?? 10,
      },
    },
  );
  return response.data;
}

async function getSavingsGoalById(id: string): Promise<SavingsGoal> {
  const response = await apiClient.get<SavingsGoal>(`/savings-goals/${id}`);
  return response.data;
}

async function createSavingsGoal(
  payload: CreateSavingsGoalPayload,
): Promise<SavingsGoal> {
  const response = await apiClient.post<SavingsGoal>("/savings-goals", payload);
  return response.data;
}

async function updateSavingsGoal(
  payload: UpdateSavingsGoalPayload,
): Promise<SavingsGoal> {
  const { id, ...body } = payload;
  const response = await apiClient.put<SavingsGoal>(
    `/savings-goals/${id}`,
    body,
  );
  return response.data;
}

async function markSavingsGoalComplete(id: string): Promise<SavingsGoal> {
  const response = await apiClient.post<SavingsGoal>(
    `/savings-goals/${id}/mark-complete`,
    {},
  );
  return response.data;
}

async function addSavingsGoalContribution(
  payload: AddSavingsGoalContributionPayload,
): Promise<SavingsGoalContribution> {
  const { savingsGoalId, ...body } = payload;
  const response = await apiClient.post<SavingsGoalContribution>(
    `/savings-goals/${savingsGoalId}/contributions`,
    body,
  );
  return response.data;
}

async function getSavingsGoalContributions(
  savingsGoalId: string,
  page = 1,
  pageSize = 20,
): Promise<PagedResult<SavingsGoalContribution>> {
  const response = await apiClient.get<PagedResult<SavingsGoalContribution>>(
    `/savings-goals/${savingsGoalId}/contributions`,
    {
      params: { page, pageSize },
    },
  );
  return response.data;
}

async function getSavingsGoalsSummary(): Promise<SavingsGoalsSummary> {
  const response = await apiClient.get<SavingsGoalsSummary>(
    "/savings-goals/summary",
  );
  return response.data;
}

export function useSavingsGoalsQuery(filter: SavingsGoalFilter) {
  return useQuery({
    queryKey: ["savings-goals", filter],
    queryFn: () => getSavingsGoals(filter),
  });
}

export function useSavingsGoalByIdQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["savings-goals", "detail", id],
    queryFn: () => getSavingsGoalById(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateSavingsGoalMutation() {
  return useMutation({
    mutationFn: createSavingsGoal,
  });
}

export function useUpdateSavingsGoalMutation() {
  return useMutation({
    mutationFn: updateSavingsGoal,
  });
}

export function useMarkSavingsGoalCompleteMutation() {
  return useMutation({
    mutationFn: markSavingsGoalComplete,
  });
}

export function useAddSavingsGoalContributionMutation() {
  return useMutation({
    mutationFn: addSavingsGoalContribution,
  });
}

export function useSavingsGoalContributionsQuery(
  savingsGoalId: string | undefined,
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: ["savings-goals", "contributions", savingsGoalId, page, pageSize],
    queryFn: () =>
      getSavingsGoalContributions(savingsGoalId as string, page, pageSize),
    enabled: Boolean(savingsGoalId),
  });
}

export function useSavingsGoalsSummaryQuery() {
  return useQuery({
    queryKey: ["savings-goals", "summary"],
    queryFn: getSavingsGoalsSummary,
  });
}

export function savingsGoalStatusLabel(status: SavingsGoalStatus): string {
  if (status === 1) return "Active";
  if (status === 2) return "Paused";
  if (status === 3) return "Completed";
  return "Archived";
}
