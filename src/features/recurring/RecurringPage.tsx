import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/shared/QueryState";
import { toApiError } from "../../lib/api/client";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  recurrenceFrequencyLabel,
  recurringExecutionStatusLabel,
  useDeleteRecurringTransactionMutation,
  useExecuteRecurringTransactionMutation,
  usePauseRecurringTransactionMutation,
  useRecurringExecutionsQuery,
  useRecurringTransactionsQuery,
  useResumeRecurringTransactionMutation,
  type RecurrenceFrequency,
} from "./api";

export function RecurringPage() {
  const queryClient = useQueryClient();

  const [isActiveFilter, setIsActiveFilter] = useState<"" | "true" | "false">(
    "",
  );
  const [frequencyFilter, setFrequencyFilter] = useState<
    "" | "1" | "2" | "3" | "4"
  >("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecurringId, setSelectedRecurringId] = useState<string>();
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
    amount: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const isSearching = searchTerm.trim().length > 0;
  const queryPage = isSearching ? 1 : page;
  const queryPageSize = isSearching ? 100 : pageSize;

  const recurring = useRecurringTransactionsQuery({
    isActive: isActiveFilter === "" ? undefined : isActiveFilter === "true",
    frequency: frequencyFilter
      ? (Number(frequencyFilter) as RecurrenceFrequency)
      : undefined,
    page: queryPage,
    pageSize: queryPageSize,
  });

  const executions = useRecurringExecutionsQuery(selectedRecurringId, 1, 10);

  const pauseMutation = usePauseRecurringTransactionMutation();
  const resumeMutation = useResumeRecurringTransactionMutation();
  const executeMutation = useExecuteRecurringTransactionMutation();
  const deleteMutation = useDeleteRecurringTransactionMutation();
  const isActionPending =
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    executeMutation.isPending ||
    deleteMutation.isPending;

  const filteredRecurring = useMemo(() => {
    const items = recurring.data?.items ?? [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items.filter((item) => {
      const haystack = [
        item.name,
        item.description,
        recurrenceFrequencyLabel(item.frequency),
        item.isActive ? "active" : "paused",
        formatDate(item.nextExecutionDate),
        String(item.amount),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [recurring.data?.items, searchTerm]);

  const totalPages = useMemo(() => {
    if (!recurring.data) {
      return 1;
    }

    if (isSearching) {
      return Math.max(1, Math.ceil(filteredRecurring.length / pageSize));
    }

    return Math.max(
      1,
      Math.ceil(recurring.data.totalCount / recurring.data.pageSize),
    );
  }, [filteredRecurring.length, isSearching, pageSize, recurring.data]);

  const paginatedRecurring = useMemo(() => {
    if (!isSearching) {
      return filteredRecurring;
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredRecurring.slice(start, end);
  }, [filteredRecurring, isSearching, page, pageSize]);

  const refreshRecurring = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const handlePauseResume = async (id: string, isActive: boolean) => {
    if (isActive) {
      await pauseMutation.mutateAsync(id);
    } else {
      await resumeMutation.mutateAsync(id);
    }

    await refreshRecurring();
  };

  const handleExecuteNow = async (id: string) => {
    await executeMutation.mutateAsync(id);
    setSelectedRecurringId(id);
    await refreshRecurring();
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    if (selectedRecurringId === id) {
      setSelectedRecurringId(undefined);
    }
    await refreshRecurring();
  };

  return (
    <section className='space-y-6'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
            Recurring
          </p>
          <h1 className='font-headline text-4xl font-extrabold tracking-tight'>
            Recurring Transactions
          </h1>
          <p className='mt-2 text-text-secondary'>
            Manage automation rules and inspect recent execution history.
          </p>
        </div>

        <Link
          to='/recurring/new'
          className='rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90'
        >
          Create Rule
        </Link>
      </header>

      <section className='rounded-2xl border border-surface-border bg-surface p-5 shadow-soft'>
        <div className='grid gap-3 md:grid-cols-3'>
          <select
            value={isActiveFilter}
            onChange={(event) => {
              setIsActiveFilter(event.target.value as "" | "true" | "false");
              setPage(1);
            }}
            className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
          >
            <option value=''>All Statuses</option>
            <option value='true'>Active</option>
            <option value='false'>Paused</option>
          </select>

          <select
            value={frequencyFilter}
            onChange={(event) => {
              setFrequencyFilter(
                event.target.value as "" | "1" | "2" | "3" | "4",
              );
              setPage(1);
            }}
            className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
          >
            <option value=''>All Frequencies</option>
            <option value='1'>Daily</option>
            <option value='2'>Weekly</option>
            <option value='3'>Monthly</option>
            <option value='4'>Custom Days</option>
          </select>

          <input
            type='search'
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder='Search recurring rules...'
            className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
          />
        </div>
      </section>

      {(pauseMutation.isError ||
        resumeMutation.isError ||
        executeMutation.isError ||
        deleteMutation.isError) && (
        <ErrorState
          title='Recurring action failed'
          message={toApiError(
            pauseMutation.error ??
              resumeMutation.error ??
              executeMutation.error ??
              deleteMutation.error,
          )}
        />
      )}

      <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <section className='rounded-2xl border border-surface-border bg-surface shadow-soft'>
          {recurring.isLoading ? (
            <div className='p-6'>
              <LoadingState
                title='Loading recurring rules'
                message='Fetching automation rules and schedules.'
              />
            </div>
          ) : null}

          {recurring.isError ? (
            <div className='p-6'>
              <ErrorState
                title='Recurring list unavailable'
                message={toApiError(recurring.error)}
              />
            </div>
          ) : null}

          {recurring.data && filteredRecurring.length === 0 ? (
            <div className='p-6'>
              <EmptyState
                title={
                  searchTerm
                    ? "No matching recurring rules"
                    : "No recurring rules"
                }
                message={
                  searchTerm
                    ? "No recurring rules match your search."
                    : "Create a recurring rule to automate scheduled transactions."
                }
              />
            </div>
          ) : null}

          {recurring.data && filteredRecurring.length > 0 ? (
            <>
              <div className='overflow-x-auto'>
                <table className='min-w-full text-sm'>
                  <thead>
                    <tr className='border-b border-surface-border bg-surface-muted text-left text-xs uppercase tracking-[0.14em] text-text-muted'>
                      <th className='px-4 py-3'>Rule</th>
                      <th className='px-4 py-3'>Frequency</th>
                      <th className='px-4 py-3'>Next Run</th>
                      <th className='px-4 py-3'>Amount</th>
                      <th className='px-4 py-3'>Status</th>
                      <th className='px-4 py-3'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecurring.map((item) => (
                      <tr
                        key={item.id}
                        className='border-b border-surface-border'
                      >
                        <td className='px-4 py-3'>
                          <div>
                            <p className='font-semibold'>{item.name}</p>
                            <p className='text-xs text-text-secondary'>
                              {item.description || "No description"}
                            </p>
                          </div>
                        </td>
                        <td className='px-4 py-3'>
                          {recurrenceFrequencyLabel(item.frequency)}
                        </td>
                        <td className='px-4 py-3'>
                          {formatDate(item.nextExecutionDate)}
                        </td>
                        <td className='px-4 py-3 font-semibold'>
                          {formatCurrency(item.amount)}
                        </td>
                        <td className='px-4 py-3'>
                          <span
                            className={`text-xs font-semibold ${item.isActive ? "text-success" : "text-text-muted"}`}
                          >
                            {item.isActive ? "Active" : "Paused"}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex min-w-[220px] flex-col gap-2'>
                            <div className='flex flex-wrap gap-2'>
                              <button
                                type='button'
                                disabled={isActionPending}
                                onClick={() => setSelectedRecurringId(item.id)}
                                className='rounded-lg border border-surface-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary disabled:opacity-60'
                              >
                                History
                              </button>
                              <Link
                                to={`/recurring/${item.id}/edit`}
                                className='rounded-lg border border-surface-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary transition hover:text-text-primary'
                              >
                                Edit
                              </Link>
                            </div>
                            <div className='flex flex-wrap gap-2'>
                              <button
                                type='button'
                                disabled={isActionPending}
                                onClick={() => handleExecuteNow(item.id)}
                                className='rounded-lg border border-surface-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary disabled:opacity-60'
                              >
                                Execute
                              </button>
                              <button
                                type='button'
                                disabled={isActionPending}
                                onClick={() =>
                                  handlePauseResume(item.id, item.isActive)
                                }
                                className='rounded-lg border border-surface-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary disabled:opacity-60'
                              >
                                {item.isActive ? "Pause" : "Resume"}
                              </button>
                            </div>
                            <div className='flex justify-end'>
                              <button
                                type='button'
                                disabled={isActionPending}
                                onClick={() =>
                                  setPendingDelete({
                                    id: item.id,
                                    name: item.name,
                                    amount: item.amount,
                                  })
                                }
                                className='rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger transition hover:bg-danger/20 disabled:opacity-60'
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className='flex items-center justify-between px-4 py-3 text-sm'>
                <span className='text-text-secondary'>
                  Page {page} of {totalPages} ({filteredRecurring.length} shown)
                </span>
                {totalPages > 1 ? (
                  <div className='flex gap-2'>
                    <button
                      type='button'
                      disabled={page <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
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
                ) : null}
              </div>
            </>
          ) : null}
        </section>

        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='mb-4 font-headline text-xl font-bold'>
            Execution History
          </h2>

          {!selectedRecurringId ? (
            <EmptyState
              compact
              title='No rule selected'
              message='Select a recurring rule and open history to inspect recent executions.'
            />
          ) : null}

          {executions.isLoading ? (
            <LoadingState
              compact
              title='Loading executions'
              message='Fetching recent execution attempts for this rule.'
            />
          ) : null}

          {executions.isError ? (
            <ErrorState
              compact
              title='Execution history unavailable'
              message={toApiError(executions.error)}
            />
          ) : null}

          {executions.data && executions.data.items.length === 0 ? (
            <EmptyState
              compact
              title='No executions yet'
              message='Execution logs will appear after this rule runs.'
            />
          ) : null}

          {executions.data && executions.data.items.length > 0 ? (
            <div className='space-y-3'>
              {executions.data.items.map((item) => (
                <div
                  key={item.id}
                  className='rounded-xl border border-surface-border bg-surface-muted p-3'
                >
                  <div className='flex items-center justify-between gap-3'>
                    <p className='text-xs font-semibold uppercase tracking-[0.12em] text-text-muted'>
                      {formatDate(item.scheduledForDate)}
                    </p>
                    <span className='text-xs font-semibold'>
                      {recurringExecutionStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className='mt-1 text-xs text-text-secondary'>
                    Executed: {formatDate(item.executedAt)}
                  </p>
                  {item.errorMessage ? (
                    <p className='mt-1 text-xs text-danger'>
                      {item.errorMessage}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      {pendingDelete && typeof document !== "undefined"
        ? createPortal(
            <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4'>
              <section className='w-full max-w-md rounded-2xl border border-surface-border bg-surface p-5 shadow-2xl'>
                <h2 className='font-headline text-xl font-bold'>
                  Delete Recurring Rule?
                </h2>
                <p className='mt-2 text-sm text-text-secondary'>
                  This action cannot be undone.
                </p>
                <div className='mt-4 rounded-xl border border-surface-border bg-surface-muted p-3 text-sm'>
                  <p className='font-semibold'>{pendingDelete.name}</p>
                  <p className='text-text-secondary'>
                    {formatCurrency(pendingDelete.amount)}
                  </p>
                </div>
                <div className='mt-5 flex items-center justify-end gap-2'>
                  <button
                    type='button'
                    onClick={() => setPendingDelete(null)}
                    className='rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-text-secondary'
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    onClick={async () => {
                      await handleDelete(pendingDelete.id);
                      setPendingDelete(null);
                    }}
                    disabled={deleteMutation.isPending}
                    className='rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-70'
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
