import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  const [selectedRecurringId, setSelectedRecurringId] = useState<string>();
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const recurring = useRecurringTransactionsQuery({
    isActive: isActiveFilter === "" ? undefined : isActiveFilter === "true",
    frequency: frequencyFilter
      ? (Number(frequencyFilter) as RecurrenceFrequency)
      : undefined,
    page,
    pageSize,
  });

  const executions = useRecurringExecutionsQuery(selectedRecurringId, 1, 10);

  const pauseMutation = usePauseRecurringTransactionMutation();
  const resumeMutation = useResumeRecurringTransactionMutation();
  const executeMutation = useExecuteRecurringTransactionMutation();
  const deleteMutation = useDeleteRecurringTransactionMutation();

  const totalPages = useMemo(() => {
    if (!recurring.data) {
      return 1;
    }

    return Math.max(
      1,
      Math.ceil(recurring.data.totalCount / recurring.data.pageSize),
    );
  }, [recurring.data]);

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

          {recurring.data && recurring.data.items.length === 0 ? (
            <div className='p-6'>
              <EmptyState
                title='No recurring rules'
                message='Create a recurring rule to automate scheduled transactions.'
              />
            </div>
          ) : null}

          {recurring.data && recurring.data.items.length > 0 ? (
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
                    {recurring.data.items.map((item) => (
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
                          <div className='flex flex-wrap gap-2'>
                            <button
                              type='button'
                              onClick={() => setSelectedRecurringId(item.id)}
                              className='rounded-lg border border-surface-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary'
                            >
                              History
                            </button>
                            <Link
                              to={`/recurring/${item.id}/edit`}
                              className='rounded-lg border border-surface-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary'
                            >
                              Edit
                            </Link>
                            <button
                              type='button'
                              onClick={() => handleExecuteNow(item.id)}
                              className='rounded-lg border border-surface-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary'
                            >
                              Execute
                            </button>
                            <button
                              type='button'
                              onClick={() =>
                                handlePauseResume(item.id, item.isActive)
                              }
                              className='rounded-lg border border-surface-border bg-surface px-2.5 py-1 text-xs font-semibold text-text-secondary'
                            >
                              {item.isActive ? "Pause" : "Resume"}
                            </button>
                            <button
                              type='button'
                              onClick={() => handleDelete(item.id)}
                              className='rounded-lg border border-surface-border bg-surface px-2.5 py-1 text-xs font-semibold text-danger'
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className='flex items-center justify-between px-4 py-3 text-sm'>
                <span className='text-text-secondary'>
                  Page {recurring.data.page} of {totalPages} (
                  {recurring.data.totalCount} total)
                </span>
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
    </section>
  );
}
