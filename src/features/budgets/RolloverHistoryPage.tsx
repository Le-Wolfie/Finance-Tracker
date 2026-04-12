import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/shared/QueryState";
import { toApiError } from "../../lib/api/client";
import { formatCurrency, formatDate, monthLabel } from "../../lib/format";
import { useCategoriesQuery } from "../transactions/api";
import {
  rolloverStrategyLabel,
  useBudgetRolloverHistoryQuery,
  useRunBudgetRolloverMutation,
} from "./api";

export function RolloverHistoryPage() {
  const queryClient = useQueryClient();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const categories = useCategoriesQuery();
  const history = useBudgetRolloverHistoryQuery(year, month);
  const runRollover = useRunBudgetRolloverMutation();

  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((item) => [item.id, item.name])),
    [categories.data],
  );

  const handleRunRollover = async () => {
    await runRollover.mutateAsync({ year, month });
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["budgets", "rollover-history", year, month],
      }),
      queryClient.invalidateQueries({ queryKey: ["budgets", "alerts"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  return (
    <section className='space-y-6'>
      <header className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
            Audit Trail
          </p>
          <h1 className='font-headline text-3xl font-extrabold tracking-tight md:text-4xl'>
            Budget Rollover History
          </h1>
          <p className='mt-2 text-text-secondary'>{monthLabel(year, month)}</p>
        </div>

        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
          <Link
            to='/budgets'
            className='rounded-xl border border-surface-border bg-surface px-4 py-2 text-center text-sm font-semibold text-text-secondary transition hover:text-text-primary'
          >
            Back to Budgets
          </Link>
          <button
            type='button'
            onClick={handleRunRollover}
            disabled={runRollover.isPending}
            className='rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70'
          >
            {runRollover.isPending ? "Running..." : "Run Rollover"}
          </button>
        </div>
      </header>

      <section className='rounded-2xl border border-surface-border bg-surface p-5 shadow-soft'>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          <select
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map(
              (value) => (
                <option key={value} value={value}>
                  {new Date(2000, value - 1, 1).toLocaleDateString("en-EG", {
                    month: "long",
                  })}
                </option>
              ),
            )}
          </select>

          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
          >
            {[
              now.getFullYear() - 1,
              now.getFullYear(),
              now.getFullYear() + 1,
            ].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </section>

      {(runRollover.isError || categories.isError) && (
        <ErrorState
          title='Rollover action failed'
          message={toApiError(runRollover.error ?? categories.error)}
        />
      )}

      {history.isLoading ? (
        <LoadingState
          title='Loading rollover history'
          message='Retrieving rollover records for the selected month.'
        />
      ) : null}

      {history.isError ? (
        <ErrorState
          title='History unavailable'
          message={toApiError(history.error)}
        />
      ) : null}

      {history.data && history.data.length === 0 ? (
        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <EmptyState
            title='No rollover records'
            message='No rollover events were recorded for this period.'
          />
        </section>
      ) : null}

      {history.data && history.data.length > 0 ? (
        <section className='rounded-2xl border border-surface-border bg-surface shadow-soft'>
          <div className='space-y-3 p-4 md:hidden'>
            {history.data.map((record) => (
              <article
                key={record.id}
                className='rounded-xl border border-surface-border bg-surface-muted p-4'
              >
                <div className='grid grid-cols-2 gap-2 text-xs text-text-secondary'>
                  <span>Created</span>
                  <span className='text-right'>
                    {formatDate(record.createdAt)}
                  </span>
                  <span>Category</span>
                  <span className='truncate text-right'>
                    {categoryById.get(record.categoryId) ?? "Unknown Category"}
                  </span>
                  <span>From</span>
                  <span className='text-right'>
                    {monthLabel(record.fromYear, record.fromMonth)}
                  </span>
                  <span>To</span>
                  <span className='text-right'>
                    {monthLabel(record.toYear, record.toMonth)}
                  </span>
                  <span>Strategy</span>
                  <span className='text-right'>
                    {rolloverStrategyLabel(record.appliedStrategy)}
                  </span>
                </div>
                <p className='mt-3 text-sm font-semibold'>
                  {formatCurrency(record.rolledOverAmount)}
                </p>
              </article>
            ))}
          </div>

          <div className='hidden overflow-x-auto md:block'>
            <table className='min-w-full text-sm'>
              <thead>
                <tr className='border-b border-surface-border bg-surface-muted text-left text-xs uppercase tracking-[0.14em] text-text-muted'>
                  <th className='px-4 py-3'>Created</th>
                  <th className='px-4 py-3'>Category</th>
                  <th className='px-4 py-3'>From</th>
                  <th className='px-4 py-3'>To</th>
                  <th className='px-4 py-3'>Rolled Amount</th>
                  <th className='px-4 py-3'>Strategy</th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((record) => (
                  <tr
                    key={record.id}
                    className='border-b border-surface-border'
                  >
                    <td className='px-4 py-3'>
                      {formatDate(record.createdAt)}
                    </td>
                    <td className='px-4 py-3'>
                      {categoryById.get(record.categoryId) ??
                        "Unknown Category"}
                    </td>
                    <td className='px-4 py-3'>
                      {monthLabel(record.fromYear, record.fromMonth)}
                    </td>
                    <td className='px-4 py-3'>
                      {monthLabel(record.toYear, record.toMonth)}
                    </td>
                    <td className='px-4 py-3 font-semibold'>
                      {formatCurrency(record.rolledOverAmount)}
                    </td>
                    <td className='px-4 py-3'>
                      {rolloverStrategyLabel(record.appliedStrategy)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}
