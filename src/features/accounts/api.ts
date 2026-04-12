import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type AccountType = 1 | 2 | 3 | 4;

export type Account = {
  id: string;
  name: string;
  initialBalance: number;
  balance: number;
  type: AccountType;
  createdAt: string;
  updatedAt: string;
};

export type CreateAccountPayload = {
  name: string;
  balance: number;
  type: AccountType;
};

export type AccountReconciliation = {
  accountId: string;
  accountName: string;
  initialBalance: number;
  storedBalance: number;
  computedBalance: number;
  difference: number;
  isMismatch: boolean;
  totalIncome: number;
  totalExpenses: number;
  totalTransfersOut: number;
  totalTransfersIn: number;
};

async function getAccounts(): Promise<Account[]> {
  const response = await apiClient.get<Account[]>("/accounts");
  return response.data;
}

async function createAccount(payload: CreateAccountPayload): Promise<Account> {
  const response = await apiClient.post<Account>("/accounts", payload);
  return response.data;
}

async function getReconciliation(
  accountId: string,
): Promise<AccountReconciliation> {
  const response = await apiClient.get<AccountReconciliation>(
    `/accounts/${accountId}/reconcile`,
  );
  return response.data;
}

export function useAccountsQuery() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: getAccounts,
  });
}

export function useAccountReconciliationQuery(accountId?: string) {
  return useQuery({
    queryKey: ["accounts", "reconcile", accountId],
    queryFn: () => getReconciliation(accountId as string),
    enabled: Boolean(accountId),
  });
}

export function useCreateAccountMutation() {
  return useMutation({
    mutationFn: createAccount,
  });
}

export function accountTypeLabel(type: AccountType): string {
  if (type === 1) return "Wallet";
  if (type === 2) return "Bank";
  if (type === 3) return "Savings";
  return "Cash";
}
