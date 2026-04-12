import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type TransactionType = 1 | 2 | 3;
export type RecurrenceFrequency = 1 | 2 | 3 | 4;
export type RecurringExecutionStatus = 1 | 2 | 3;

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type RecurringTransaction = {
  id: string;
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  name: string;
  description: string;
  amount: number;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  intervalDays?: number | null;
  startDate: string;
  endDate?: string | null;
  maxOccurrences?: number | null;
  nextExecutionDate: string;
  executedCount: number;
  isActive: boolean;
  createdAt: string;
};

export type RecurringExecution = {
  id: string;
  recurringTransactionId: string;
  scheduledForDate: string;
  generatedTransactionId?: string | null;
  status: RecurringExecutionStatus;
  errorMessage?: string | null;
  executedAt: string;
};

export type RecurringFilter = {
  isActive?: boolean;
  frequency?: RecurrenceFrequency;
  page?: number;
  pageSize?: number;
};

export type CreateRecurringPayload = {
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  name: string;
  description: string;
  amount: number;
  type: TransactionType;
  frequency: RecurrenceFrequency;
  intervalDays?: number;
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
};

export type UpdateRecurringPayload = CreateRecurringPayload & {
  nextExecutionDate: string;
  isActive: boolean;
};

async function getRecurringTransactions(
  filter: RecurringFilter,
): Promise<PagedResult<RecurringTransaction>> {
  const response = await apiClient.get<PagedResult<RecurringTransaction>>(
    "/recurring-transactions",
    {
      params: {
        isActive: filter.isActive,
        frequency: filter.frequency,
        page: filter.page ?? 1,
        pageSize: filter.pageSize ?? 10,
      },
    },
  );

  return response.data;
}

async function createRecurringTransaction(
  payload: CreateRecurringPayload,
): Promise<RecurringTransaction> {
  const response = await apiClient.post<RecurringTransaction>(
    "/recurring-transactions",
    payload,
  );
  return response.data;
}

async function getRecurringTransactionById(
  recurringId: string,
): Promise<RecurringTransaction> {
  const response = await apiClient.get<RecurringTransaction>(
    `/recurring-transactions/${recurringId}`,
  );
  return response.data;
}

async function updateRecurringTransaction({
  id,
  payload,
}: {
  id: string;
  payload: UpdateRecurringPayload;
}): Promise<RecurringTransaction> {
  const response = await apiClient.put<RecurringTransaction>(
    `/recurring-transactions/${id}`,
    payload,
  );
  return response.data;
}

async function pauseRecurringTransaction(
  recurringId: string,
): Promise<RecurringTransaction> {
  const response = await apiClient.post<RecurringTransaction>(
    `/recurring-transactions/${recurringId}/pause`,
    {},
  );
  return response.data;
}

async function resumeRecurringTransaction(
  recurringId: string,
): Promise<RecurringTransaction> {
  const response = await apiClient.post<RecurringTransaction>(
    `/recurring-transactions/${recurringId}/resume`,
    {},
  );
  return response.data;
}

async function executeRecurringTransactionNow(
  recurringId: string,
): Promise<RecurringExecution> {
  const response = await apiClient.post<RecurringExecution>(
    `/recurring-transactions/${recurringId}/execute`,
    {},
  );
  return response.data;
}

async function deleteRecurringTransaction(recurringId: string): Promise<void> {
  await apiClient.delete(`/recurring-transactions/${recurringId}`);
}

async function getRecurringExecutions(
  recurringId: string,
  page = 1,
  pageSize = 10,
): Promise<PagedResult<RecurringExecution>> {
  const response = await apiClient.get<PagedResult<RecurringExecution>>(
    `/recurring-transactions/${recurringId}/executions`,
    {
      params: { page, pageSize },
    },
  );
  return response.data;
}

export function useRecurringTransactionsQuery(filter: RecurringFilter) {
  return useQuery({
    queryKey: ["recurring-transactions", filter],
    queryFn: () => getRecurringTransactions(filter),
  });
}

export function useCreateRecurringTransactionMutation() {
  return useMutation({
    mutationFn: createRecurringTransaction,
  });
}

export function useRecurringTransactionByIdQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["recurring-transactions", "detail", id],
    queryFn: () => getRecurringTransactionById(id as string),
    enabled: Boolean(id),
  });
}

export function useUpdateRecurringTransactionMutation() {
  return useMutation({
    mutationFn: updateRecurringTransaction,
  });
}

export function usePauseRecurringTransactionMutation() {
  return useMutation({
    mutationFn: pauseRecurringTransaction,
  });
}

export function useResumeRecurringTransactionMutation() {
  return useMutation({
    mutationFn: resumeRecurringTransaction,
  });
}

export function useExecuteRecurringTransactionMutation() {
  return useMutation({
    mutationFn: executeRecurringTransactionNow,
  });
}

export function useDeleteRecurringTransactionMutation() {
  return useMutation({
    mutationFn: deleteRecurringTransaction,
  });
}

export function useRecurringExecutionsQuery(
  recurringId: string | undefined,
  page = 1,
  pageSize = 10,
) {
  return useQuery({
    queryKey: [
      "recurring-transactions",
      "executions",
      recurringId,
      page,
      pageSize,
    ],
    queryFn: () =>
      getRecurringExecutions(recurringId as string, page, pageSize),
    enabled: Boolean(recurringId),
  });
}

export function recurrenceFrequencyLabel(value: RecurrenceFrequency): string {
  if (value === 1) return "Daily";
  if (value === 2) return "Weekly";
  if (value === 3) return "Monthly";
  return "Custom Days";
}

export function recurringExecutionStatusLabel(
  value: RecurringExecutionStatus,
): string {
  if (value === 1) return "Success";
  if (value === 2) return "Failed";
  return "Skipped";
}
