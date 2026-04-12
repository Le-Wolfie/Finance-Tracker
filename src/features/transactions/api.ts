import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type TransactionType = 1 | 2 | 3;
export type CategoryType = 1 | 2;

export type TransactionItem = {
  id: string;
  accountId: string;
  destinationAccountId?: string | null;
  transferGroupId?: string | null;
  categoryId?: string | null;
  amount: number;
  type: TransactionType;
  date: string;
  description: string;
  createdAt: string;
};

export type PagedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type TransactionFilter = {
  from?: string;
  to?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
};

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
};

export type UpsertTransactionPayload = {
  accountId: string;
  destinationAccountId?: string;
  categoryId?: string;
  amount: number;
  type: TransactionType;
  date: string;
  description: string;
};

async function getTransactions(
  filter: TransactionFilter,
): Promise<PagedResult<TransactionItem>> {
  const response = await apiClient.get<PagedResult<TransactionItem>>(
    "/transactions",
    {
      params: {
        from: filter.from,
        to: filter.to,
        categoryId: filter.categoryId,
        page: filter.page ?? 1,
        pageSize: filter.pageSize ?? 10,
      },
    },
  );

  return response.data;
}

async function getTransactionById(id: string): Promise<TransactionItem> {
  const response = await apiClient.get<TransactionItem>(`/transactions/${id}`);
  return response.data;
}

async function getCategories(): Promise<Category[]> {
  const response = await apiClient.get<Category[]>("/categories");
  return response.data;
}

async function createTransaction(
  payload: UpsertTransactionPayload,
): Promise<TransactionItem> {
  const idempotencyKey = crypto.randomUUID();

  const response = await apiClient.post<TransactionItem>(
    "/transactions",
    payload,
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    },
  );

  return response.data;
}

async function updateTransaction({
  id,
  payload,
}: {
  id: string;
  payload: UpsertTransactionPayload;
}): Promise<TransactionItem> {
  const response = await apiClient.put<TransactionItem>(
    `/transactions/${id}`,
    payload,
  );
  return response.data;
}

async function deleteTransaction(transactionId: string): Promise<void> {
  await apiClient.delete(`/transactions/${transactionId}`);
}

export function useTransactionsQuery(filter: TransactionFilter) {
  return useQuery({
    queryKey: ["transactions", filter],
    queryFn: () => getTransactions(filter),
  });
}

export function useTransactionByIdQuery(id: string | undefined) {
  return useQuery({
    queryKey: ["transactions", "detail", id],
    queryFn: () => getTransactionById(id as string),
    enabled: Boolean(id),
  });
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
}

export function useCreateTransactionMutation() {
  return useMutation({
    mutationFn: createTransaction,
  });
}

export function useUpdateTransactionMutation() {
  return useMutation({
    mutationFn: updateTransaction,
  });
}

export function useDeleteTransactionMutation() {
  return useMutation({
    mutationFn: deleteTransaction,
  });
}

export function transactionTypeLabel(type: TransactionType): string {
  if (type === 1) return "Income";
  if (type === 2) return "Expense";
  return "Transfer";
}

export function categoryTypeForTransaction(
  type: TransactionType,
): CategoryType | undefined {
  if (type === 1) return 1;
  if (type === 2) return 2;
  return undefined;
}
