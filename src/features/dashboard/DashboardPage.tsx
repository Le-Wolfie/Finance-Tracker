import { AlertTriangle, PiggyBank, Repeat, Wallet } from "lucide-react";
import { useMemo } from "react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/shared/QueryState";
import { toApiError } from "../../lib/api/client";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  monthLabel,
} from "../../lib/format";
import { useDashboardQuery } from "../reports/api";

export function DashboardPage() {
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const dashboard = useDashboardQuery(year, month);

  if (dashboard.isLoading) {
    return (
      <LoadingState
        title='Loading dashboard'
        message='Fetching overview metrics and account signals.'
      />
    );
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <ErrorState
        title='Dashboard unavailable'
        message={toApiError(dashboard.error)}
      />
    );
  }

  const data = dashboard.data;

  return (
    <section className='space-y-6'>
      <header>
        <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
          Overview
        </p>
        <h1 className='font-headline text-4xl font-extrabold tracking-tight'>
          Global Wealth Position
        </h1>
        <p className='mt-2 text-text-secondary'>
          Month: {monthLabel(year, month)}
        </p>
      </header>

      <div className='grid gap-4 md:grid-cols-3'>
        <MetricCard
          label='Total Income'
          value={formatCurrency(data.summary.totalIncome)}
          tone='positive'
        />
        <MetricCard
          label='Total Expenses'
          value={formatCurrency(data.summary.totalExpenses)}
          tone='negative'
        />
        <MetricCard
          label='Net Balance'
          value={formatCurrency(data.summary.netBalance)}
          tone={data.summary.netBalance >= 0 ? "positive" : "negative"}
        />
      </div>

      <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='mb-4 flex items-center gap-2 font-headline text-xl font-bold'>
            <Wallet className='h-5 w-5 text-text-secondary' /> Accounts
          </h2>
          <div className='space-y-3'>
            {data.accounts.length === 0 ? (
              <EmptyState
                compact
                title='No accounts available'
                message='Create an account to start tracking balances in this period.'
              />
            ) : (
              data.accounts.map((account) => (
                <div
                  key={account.id}
                  className='flex items-center justify-between rounded-xl border border-surface-border bg-surface-muted px-4 py-3'
                >
                  <div>
                    <p className='font-semibold'>{account.name}</p>
                    <p className='text-xs text-text-muted'>
                      Type: {account.type}
                    </p>
                  </div>
                  <p className='font-semibold'>
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='mb-4 flex items-center gap-2 font-headline text-xl font-bold'>
            <PiggyBank className='h-5 w-5 text-text-secondary' /> Savings Goals
          </h2>
          <div className='space-y-2 text-sm'>
            <DataRow
              label='Active Goals'
              value={String(data.savingsGoals.activeGoalsCount)}
            />
            <DataRow
              label='Completed Goals'
              value={String(data.savingsGoals.completedGoalsCount)}
            />
            <DataRow
              label='Target Total'
              value={formatCurrency(data.savingsGoals.totalTargetAmount)}
            />
            <DataRow
              label='Saved Total'
              value={formatCurrency(data.savingsGoals.totalCurrentAmount)}
            />
            <DataRow
              label='Completion'
              value={formatPercent(data.savingsGoals.overallCompletionPercent)}
            />
          </div>
        </section>
      </div>

      <div className='grid gap-6 lg:grid-cols-[1fr_1fr]'>
        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='mb-4 flex items-center gap-2 font-headline text-xl font-bold'>
            <AlertTriangle className='h-5 w-5 text-text-secondary' /> Budget
            Alerts
          </h2>
          {data.budgetAlerts.length === 0 ? (
            <EmptyState
              compact
              title='No alerts this month'
              message='You are within budget limits for tracked categories.'
            />
          ) : (
            <div className='space-y-3'>
              {data.budgetAlerts.map((alert) => (
                <div
                  key={alert.budgetId}
                  className='rounded-xl border border-surface-border bg-surface-muted p-3'
                >
                  <div className='flex items-center justify-between'>
                    <p className='font-semibold'>{alert.categoryName}</p>
                    <p className='text-xs font-semibold text-text-muted'>
                      {formatPercent(alert.usagePercent)}
                    </p>
                  </div>
                  <p className='mt-1 text-sm text-text-secondary'>
                    Spent {formatCurrency(alert.spent)} / Limit{" "}
                    {formatCurrency(alert.monthlyLimit)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='mb-4 flex items-center gap-2 font-headline text-xl font-bold'>
            <Repeat className='h-5 w-5 text-text-secondary' /> Upcoming
            Recurring
          </h2>
          {data.upcomingRecurringTransactions.length === 0 ? (
            <EmptyState
              compact
              title='No upcoming recurring'
              message='You have no scheduled recurring transactions for now.'
            />
          ) : (
            <div className='space-y-3'>
              {data.upcomingRecurringTransactions.map((item) => (
                <div
                  key={item.id}
                  className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2'
                >
                  <p className='font-semibold'>{item.name}</p>
                  <p className='text-xs text-text-secondary'>
                    {formatCurrency(item.amount)} •{" "}
                    {formatDate(item.nextExecutionDate)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative";
}) {
  return (
    <div className='rounded-2xl border border-surface-border bg-surface p-5 shadow-soft'>
      <p className='text-xs font-bold uppercase tracking-[0.16em] text-text-muted'>
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold ${tone === "positive" ? "text-success" : "text-danger"}`}
      >
        {value}
      </p>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-center justify-between rounded-lg border border-surface-border bg-surface-muted px-3 py-2'>
      <span className='text-text-secondary'>{label}</span>
      <span className='font-semibold'>{value}</span>
    </div>
  );
}
