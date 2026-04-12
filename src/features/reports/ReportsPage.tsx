import { useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/shared/QueryState";
import { toApiError } from "../../lib/api/client";
import { formatCurrency, formatPercent, monthLabel } from "../../lib/format";
import {
  useCategoryBreakdownQuery,
  useDashboardQuery,
  useMonthlySummaryQuery,
} from "./api";

const PIE_COLORS = [
  "#0ea5e9",
  "#10b981",
  "#6366f1",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

export function ReportsPage() {
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const summary = useMonthlySummaryQuery(year, month);
  const breakdown = useCategoryBreakdownQuery(year, month);
  const dashboard = useDashboardQuery(year, month);

  const summaryData = summary.data;
  const breakdownData = breakdown.data ?? [];
  const dashboardData = dashboard.data;

  const incomeVsExpenseData = summaryData
    ? [
        { name: "Income", value: summaryData.totalIncome },
        { name: "Expenses", value: summaryData.totalExpenses },
      ]
    : [];

  const accountBalanceData = (dashboardData?.accounts ?? [])
    .slice(0, 8)
    .map((account) => ({
      name:
        account.name.length > 14
          ? `${account.name.slice(0, 14)}...`
          : account.name,
      balance: account.balance,
    }));

  const budgetUsageData = (dashboardData?.budgetAlerts ?? [])
    .slice(0, 8)
    .map((budget) => ({
      name:
        budget.categoryName.length > 14
          ? `${budget.categoryName.slice(0, 14)}...`
          : budget.categoryName,
      usagePercent: Math.min(200, budget.usagePercent),
      spent: budget.spent,
      limit: budget.monthlyLimit,
    }));

  const topCategoryAmount =
    breakdownData.length > 0
      ? Math.max(...breakdownData.map((item) => item.amount))
      : 0;

  const savingsCompletion =
    dashboardData?.savingsGoals.overallCompletionPercent ?? 0;

  return (
    <section className='space-y-6'>
      <header className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
            Analytics
          </p>
          <h1 className='font-headline text-4xl font-extrabold tracking-tight'>
            Financial Reports
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

      {summary.isLoading || breakdown.isLoading || dashboard.isLoading ? (
        <LoadingState
          title='Loading reports'
          message='Compiling your monthly financial analytics.'
        />
      ) : null}

      {summary.isError || breakdown.isError || dashboard.isError ? (
        <ErrorState
          title='Reports unavailable'
          message={toApiError(
            summary.error ?? breakdown.error ?? dashboard.error,
          )}
        />
      ) : null}

      {summaryData ? (
        <div className='grid gap-4 md:grid-cols-4'>
          <MetricCard
            label='Income'
            value={formatCurrency(summaryData.totalIncome)}
          />
          <MetricCard
            label='Expenses'
            value={formatCurrency(summaryData.totalExpenses)}
          />
          <MetricCard
            label='Net Balance'
            value={formatCurrency(summaryData.netBalance)}
          />
          <MetricCard
            label='Savings Completion'
            value={formatPercent(savingsCompletion)}
          />
        </div>
      ) : null}

      <div className='grid gap-6 xl:grid-cols-2'>
        <ChartCard title='Income vs Expenses'>
          {incomeVsExpenseData.length > 0 ? (
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={incomeVsExpenseData}>
                <CartesianGrid strokeDasharray='3 3' stroke='#d5dbe5' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey='value' radius={[6, 6, 0, 0]}>
                  <Cell fill='#10b981' />
                  <Cell fill='#ef4444' />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              compact
              title='No summary data'
              message='There is no income or expense data for this period.'
            />
          )}
        </ChartCard>

        <ChartCard title='Category Breakdown'>
          {breakdownData.length > 0 ? (
            <div className='grid gap-3 md:grid-cols-[0.9fr_1.1fr]'>
              <div className='h-[300px]'>
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      dataKey='amount'
                      nameKey='categoryName'
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {breakdownData.map((entry, index) => (
                        <Cell
                          key={entry.categoryId}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className='max-h-[300px] space-y-2 overflow-y-auto pr-1'>
                {breakdownData.map((item, index) => (
                  <div
                    key={item.categoryId}
                    className='rounded-lg border border-surface-border bg-surface-muted p-2 text-sm'
                  >
                    <div className='mb-1 flex items-center justify-between gap-2'>
                      <span className='font-semibold'>{item.categoryName}</span>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                    <div className='h-1.5 rounded-full bg-surface-border'>
                      <div
                        className='h-1.5 rounded-full'
                        style={{
                          width: `${topCategoryAmount > 0 ? Math.max((item.amount / topCategoryAmount) * 100, 4) : 4}%`,
                          backgroundColor:
                            PIE_COLORS[index % PIE_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              compact
              title='No category activity'
              message='No categorized transactions were found for this period.'
            />
          )}
        </ChartCard>
      </div>

      <div className='grid gap-6 xl:grid-cols-2'>
        <ChartCard title='Top Account Balances'>
          {accountBalanceData.length > 0 ? (
            <ResponsiveContainer width='100%' height={320}>
              <BarChart data={accountBalanceData}>
                <CartesianGrid strokeDasharray='3 3' stroke='#d5dbe5' />
                <XAxis dataKey='name' />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey='balance' fill='#3b82f6' radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              compact
              title='No account data'
              message='No account balances were returned for this period.'
            />
          )}
        </ChartCard>

        <ChartCard title='Budget Usage Alerts'>
          {budgetUsageData.length > 0 ? (
            <ResponsiveContainer width='100%' height={320}>
              <BarChart data={budgetUsageData}>
                <CartesianGrid strokeDasharray='3 3' stroke='#d5dbe5' />
                <XAxis dataKey='name' />
                <YAxis domain={[0, 120]} />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(2)}%`}
                />
                <Bar
                  dataKey='usagePercent'
                  fill='#f59e0b'
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              compact
              title='No budget alerts'
              message='No budget thresholds were hit for this period.'
            />
          )}
        </ChartCard>
      </div>

      <section className='grid gap-6 xl:grid-cols-2'>
        <article className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='font-headline text-xl font-bold'>Detailed Insights</h2>
          {summaryData ? (
            <ul className='mt-3 space-y-2 text-sm text-text-secondary'>
              <li>
                Savings rate:{" "}
                {formatPercent(
                  summaryData.totalIncome > 0
                    ? (summaryData.netBalance / summaryData.totalIncome) * 100
                    : 0,
                )}
              </li>
              <li>
                Net result:{" "}
                {summaryData.netBalance >= 0 ? "Positive" : "Negative"}
              </li>
              <li>
                Expense-to-income ratio:{" "}
                {formatPercent(
                  summaryData.totalIncome > 0
                    ? (summaryData.totalExpenses / summaryData.totalIncome) *
                        100
                    : 0,
                )}
              </li>
              <li>
                Income minus expense gap:{" "}
                {formatCurrency(summaryData.netBalance)}
              </li>
            </ul>
          ) : (
            <EmptyState
              compact
              title='No insights available'
              message='Select a period with transactions to view detailed insights.'
            />
          )}
        </article>

        <article className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='font-headline text-xl font-bold'>
            Upcoming Recurring
          </h2>
          {(dashboardData?.upcomingRecurringTransactions.length ?? 0) > 0 ? (
            <div className='mt-3 max-h-[280px] space-y-2 overflow-y-auto pr-1'>
              {dashboardData!.upcomingRecurringTransactions.map((item) => (
                <div
                  key={item.id}
                  className='rounded-xl border border-surface-border bg-surface-muted p-3 text-sm'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <span className='font-semibold'>{item.name}</span>
                    <span
                      className={
                        item.type === 1
                          ? "font-semibold text-success"
                          : "font-semibold text-danger"
                      }
                    >
                      {item.type === 1 ? "+" : "-"}
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                  <p className='mt-1 text-xs text-text-secondary'>
                    Next run:{" "}
                    {new Date(item.nextExecutionDate).toLocaleDateString(
                      "en-EG",
                    )}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              title='No upcoming recurring'
              message='No recurring executions are scheduled in this period.'
            />
          )}
        </article>
      </section>
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

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <article className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
      <h2 className='mb-4 font-headline text-xl font-bold'>{title}</h2>
      {children}
    </article>
  );
}
