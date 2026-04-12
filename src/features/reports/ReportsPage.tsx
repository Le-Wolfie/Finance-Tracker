import { useMemo, useState } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/shared/QueryState";
import { toApiError } from "../../lib/api/client";
import { formatCurrency, formatPercent, monthLabel } from "../../lib/format";
import { useCategoryBreakdownQuery, useMonthlySummaryQuery } from "./api";

export function ReportsPage() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const summary = useMonthlySummaryQuery(year, month);
  const breakdown = useCategoryBreakdownQuery(year, month);

  const topCategoryAmount =
    breakdown.data && breakdown.data.length > 0
      ? Math.max(...breakdown.data.map((item) => item.amount))
      : 0;

  return (
    <section className='space-y-6'>
      <header className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
            Analytics
          </p>
          <h1 className='font-headline text-4xl font-extrabold tracking-tight'>
            Financial Analytics
          </h1>
          <p className='mt-2 text-text-secondary'>{monthLabel(year, month)}</p>
        </div>

        <div className='flex items-center gap-2'>
          <select
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
            className='rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm'
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
            className='rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm'
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
      </header>

      {summary.isLoading ? (
        <LoadingState
          title='Loading summary'
          message='Compiling monthly income, expenses, and net balance.'
        />
      ) : null}
      {summary.isError ? (
        <ErrorState
          title='Summary unavailable'
          message={toApiError(summary.error)}
        />
      ) : null}

      {summary.data ? (
        <div className='grid gap-4 md:grid-cols-3'>
          <MetricCard
            label='Income'
            value={formatCurrency(summary.data.totalIncome)}
          />
          <MetricCard
            label='Expenses'
            value={formatCurrency(summary.data.totalExpenses)}
          />
          <MetricCard
            label='Net'
            value={formatCurrency(summary.data.netBalance)}
          />
        </div>
      ) : null}

      <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
        <h2 className='mb-4 font-headline text-xl font-bold'>
          Category Breakdown
        </h2>
        {breakdown.isLoading ? (
          <LoadingState
            title='Loading category data'
            message='Aggregating category spending and income values.'
          />
        ) : null}
        {breakdown.isError ? (
          <ErrorState
            title='Category breakdown unavailable'
            message={toApiError(breakdown.error)}
          />
        ) : null}

        {breakdown.data && breakdown.data.length === 0 ? (
          <EmptyState
            title='No category activity'
            message='No categorized transactions were found for this period.'
          />
        ) : null}

        {breakdown.data && breakdown.data.length > 0 ? (
          <div className='space-y-3'>
            {breakdown.data.map((item) => {
              const width =
                topCategoryAmount > 0
                  ? (item.amount / topCategoryAmount) * 100
                  : 0;
              return (
                <div
                  key={item.categoryId}
                  className='rounded-xl border border-surface-border bg-surface-muted p-3'
                >
                  <div className='mb-2 flex items-center justify-between'>
                    <p className='font-semibold'>{item.categoryName}</p>
                    <p className='text-sm'>{formatCurrency(item.amount)}</p>
                  </div>
                  <div className='h-2 rounded-full bg-surface-border'>
                    <div
                      className='h-2 rounded-full bg-primary-strong'
                      style={{ width: `${Math.max(width, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      {summary.data ? (
        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='mb-3 font-headline text-xl font-bold'>
            Quick Insights
          </h2>
          <ul className='space-y-2 text-sm text-text-secondary'>
            <li>
              Spending efficiency:{" "}
              {formatPercent(
                summary.data.totalIncome > 0
                  ? (summary.data.netBalance / summary.data.totalIncome) * 100
                  : 0,
              )}
            </li>
            <li>
              Net status:{" "}
              {summary.data.netBalance >= 0 ? "Positive" : "Negative"}
            </li>
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-2xl border border-surface-border bg-surface p-5 shadow-soft'>
      <p className='text-xs font-bold uppercase tracking-[0.16em] text-text-muted'>
        {label}
      </p>
      <p className='mt-2 text-2xl font-bold'>{value}</p>
    </div>
  );
}
