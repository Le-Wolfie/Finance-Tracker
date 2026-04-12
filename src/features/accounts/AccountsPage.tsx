import { useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/shared/QueryState";
import { toApiError } from "../../lib/api/client";
import { formatCurrency } from "../../lib/format";
import {
  accountTypeLabel,
  useAccountReconciliationQuery,
  useAccountsQuery,
  useCreateAccountMutation,
} from "./api";

const createAccountSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  balance: z
    .string()
    .trim()
    .min(1, "Opening balance is required.")
    .refine(
      (value) => !Number.isNaN(Number(value)) && Number(value) >= 0,
      "Opening balance must be 0 or greater.",
    ),
  type: z.enum(["1", "2", "3", "4"]),
});

type CreateAccountFormValues = z.infer<typeof createAccountSchema>;

export function AccountsPage() {
  const queryClient = useQueryClient();
  const [selectedAccountId, setSelectedAccountId] = useState<
    string | undefined
  >();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const accounts = useAccountsQuery();
  const reconciliation = useAccountReconciliationQuery(selectedAccountId);
  const createAccount = useCreateAccountMutation();

  const totalPages = accounts.data
    ? Math.max(1, Math.ceil(accounts.data.length / pageSize))
    : 1;

  const pagedAccounts = accounts.data
    ? accounts.data.slice((page - 1) * pageSize, page * pageSize)
    : [];

  const form = useForm<CreateAccountFormValues>({
    resolver: zodResolver(createAccountSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      balance: "0",
      type: "1",
    },
  });

  const submitHandler = form.handleSubmit(async (values) => {
    await createAccount.mutateAsync({
      name: values.name,
      balance: Number(values.balance),
      type: Number(values.type) as 1 | 2 | 3 | 4,
    });

    form.reset({
      name: "",
      balance: "0",
      type: "1",
    });
    setIsCreateOpen(false);

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);

    setPage(1);
  });

  return (
    <>
      <section className='space-y-6'>
        <header className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
              Accounts
            </p>
            <h1 className='font-headline text-4xl font-extrabold tracking-tight'>
              Accounts Overview
            </h1>
            <p className='mt-2 text-text-secondary'>
              View balances and run reconciliation for each account.
            </p>
          </div>
          <button
            type='button'
            onClick={() => setIsCreateOpen(true)}
            className='rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90'
          >
            Add New Account
          </button>
        </header>

        {accounts.isLoading ? (
          <LoadingState
            title='Loading accounts'
            message='Fetching account balances and metadata.'
          />
        ) : null}
        {accounts.isError ? (
          <ErrorState
            title='Accounts unavailable'
            message={toApiError(accounts.error)}
          />
        ) : null}

        {accounts.data ? (
          <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
            <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
              <h2 className='mb-4 font-headline text-xl font-bold'>
                Account List
              </h2>
              {accounts.data.length === 0 ? (
                <EmptyState
                  title='No accounts found'
                  message='Add your first account to begin tracking balances.'
                />
              ) : (
                <>
                  <div className='space-y-3'>
                    {pagedAccounts.map((account) => (
                      <div
                        key={account.id}
                        className='rounded-xl border border-surface-border bg-surface-muted p-3'
                      >
                        <div className='flex items-center justify-between gap-3'>
                          <div>
                            <p className='font-semibold'>{account.name}</p>
                            <p className='text-xs text-text-muted'>
                              Type: {accountTypeLabel(account.type)}
                            </p>
                          </div>
                          <p className='font-semibold'>
                            {formatCurrency(account.balance)}
                          </p>
                        </div>
                        <button
                          type='button'
                          onClick={() => setSelectedAccountId(account.id)}
                          className='mt-3 rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary'
                        >
                          Reconcile
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className='mt-4 flex items-center justify-between text-sm'>
                    <span className='text-text-secondary'>
                      Page {page} of {totalPages} ({accounts.data.length} total)
                    </span>
                    <div className='flex gap-2'>
                      <button
                        type='button'
                        disabled={page <= 1}
                        onClick={() =>
                          setPage((value) => Math.max(1, value - 1))
                        }
                        className='rounded-lg border border-surface-border bg-surface px-3 py-1.5 font-semibold text-text-secondary disabled:opacity-50'
                      >
                        Prev
                      </button>
                      <button
                        type='button'
                        disabled={page >= totalPages}
                        onClick={() =>
                          setPage((value) => Math.min(totalPages, value + 1))
                        }
                        className='rounded-lg border border-surface-border bg-surface px-3 py-1.5 font-semibold text-text-secondary disabled:opacity-50'
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>

            <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
              <h2 className='mb-4 font-headline text-xl font-bold'>
                Reconciliation Result
              </h2>
              {!selectedAccountId ? (
                <EmptyState
                  compact
                  title='No account selected'
                  message='Choose an account from the list to run reconciliation.'
                />
              ) : null}
              {reconciliation.isLoading ? (
                <LoadingState
                  compact
                  title='Running reconciliation'
                  message='Calculating ledger consistency for the selected account.'
                />
              ) : null}
              {reconciliation.isError ? (
                <ErrorState
                  compact
                  title='Reconciliation failed'
                  message={toApiError(reconciliation.error)}
                />
              ) : null}
              {reconciliation.data ? (
                <div className='space-y-2 text-sm'>
                  <Row
                    label='Account'
                    value={reconciliation.data.accountName}
                  />
                  <Row
                    label='Initial'
                    value={formatCurrency(reconciliation.data.initialBalance)}
                  />
                  <Row
                    label='Stored'
                    value={formatCurrency(reconciliation.data.storedBalance)}
                  />
                  <Row
                    label='Computed'
                    value={formatCurrency(reconciliation.data.computedBalance)}
                  />
                  <Row
                    label='Difference'
                    value={formatCurrency(reconciliation.data.difference)}
                  />
                  <Row
                    label='Status'
                    value={
                      reconciliation.data.isMismatch ? "Mismatch" : "Balanced"
                    }
                  />
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </section>

      {isCreateOpen ? (
        <div className='fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm'>
          <section className='w-full max-w-[600px] rounded-2xl bg-white p-6 text-on-background shadow-2xl ring-1 ring-black/5'>
            <header className='mb-5'>
              <div>
                <p className='text-xs font-bold uppercase tracking-[0.16em] text-text-muted'>
                  New Account
                </p>
                <h2 className='mt-1 font-headline text-2xl font-bold'>
                  Add New Account
                </h2>
              </div>
            </header>

            <form onSubmit={submitHandler} className='space-y-4'>
              <Field
                label='Account Name'
                error={form.formState.errors.name?.message}
              >
                <input
                  type='text'
                  {...form.register("name")}
                  className='w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm'
                  placeholder='Main Wallet'
                />
              </Field>

              <div className='grid gap-4 md:grid-cols-2'>
                <Field
                  label='Opening Balance'
                  error={form.formState.errors.balance?.message}
                >
                  <input
                    type='number'
                    min='0'
                    step='0.01'
                    {...form.register("balance")}
                    className='w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm'
                  />
                </Field>

                <Field
                  label='Account Type'
                  error={form.formState.errors.type?.message}
                >
                  <select
                    {...form.register("type")}
                    className='w-full rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm'
                  >
                    <option value='1'>Wallet</option>
                    <option value='2'>Bank</option>
                    <option value='3'>Savings</option>
                    <option value='4'>Cash</option>
                  </select>
                </Field>
              </div>

              {createAccount.isError ? (
                <ErrorState
                  compact
                  title='Cannot create account'
                  message={toApiError(createAccount.error)}
                />
              ) : null}

              <div className='flex items-center justify-end gap-3 pt-2'>
                <button
                  type='button'
                  onClick={() => setIsCreateOpen(false)}
                  className='rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={createAccount.isPending}
                  className='rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70'
                >
                  {createAccount.isPending ? "Saving..." : "Create Account"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between rounded-lg border border-surface-border bg-surface-muted px-3 py-2'>
      <span className='text-text-secondary'>{label}</span>
      <span className='font-semibold'>{value}</span>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className='block'>
      <span className='mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-text-muted'>
        {label}
      </span>
      {children}
      {error ? (
        <span className='mt-1 block text-xs font-medium text-danger'>
          {error}
        </span>
      ) : null}
    </label>
  );
}
