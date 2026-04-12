import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/shared/QueryState";
import { toApiError } from "../../lib/api/client";
import { formatCurrency, formatPercent, monthLabel } from "../../lib/format";
import { useCategoriesQuery } from "../transactions/api";
import {
  useBudgetAlertsQuery,
  useBudgetStatusQuery,
  useSetBudgetMutation,
} from "./api";

const budgetSchema = z.object({
  categoryId: z.string().min(1, "Category is required."),
  monthlyLimit: z
    .string()
    .trim()
    .min(1, "Monthly limit is required.")
    .refine(
      (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
      "Monthly limit must be greater than 0.",
    ),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

export function BudgetsPage() {
  const queryClient = useQueryClient();
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  const categories = useCategoriesQuery();
  const alerts = useBudgetAlertsQuery(year, month);
  const status = useBudgetStatusQuery(
    selectedCategoryId || undefined,
    year,
    month,
  );
  const setBudget = useSetBudgetMutation();

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    mode: "onBlur",
    defaultValues: {
      categoryId: "",
      monthlyLimit: "",
    },
  });

  const submitHandler = form.handleSubmit(async (values) => {
    await setBudget.mutateAsync({
      categoryId: values.categoryId,
      monthlyLimit: Number(values.monthlyLimit),
      year,
      month,
    });

    setSelectedCategoryId(values.categoryId);

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["budgets"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  });

  return (
    <section className='space-y-6'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
            Budgeting
          </p>
          <h1 className='font-headline text-4xl font-extrabold tracking-tight'>
            Budget Command Center
          </h1>
          <p className='mt-2 text-text-secondary'>{monthLabel(year, month)}</p>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Link
            to='/budgets/templates'
            className='rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-text-secondary transition hover:text-text-primary'
          >
            Manage Templates
          </Link>
          <Link
            to='/budgets/rollover-history'
            className='rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-text-secondary transition hover:text-text-primary'
          >
            Rollover History
          </Link>
        </div>
      </header>

      <div className='grid gap-6 lg:grid-cols-[1fr_1fr]'>
        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='mb-4 font-headline text-xl font-bold'>
            Set Monthly Budget
          </h2>

          <form onSubmit={submitHandler} className='space-y-4'>
            <label className='block'>
              <span className='mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-text-muted'>
                Category
              </span>
              <select
                {...form.register("categoryId")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              >
                <option value=''>Select category</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.categoryId ? (
                <span className='mt-1 block text-xs font-medium text-danger'>
                  {form.formState.errors.categoryId.message}
                </span>
              ) : null}
            </label>

            <label className='block'>
              <span className='mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-text-muted'>
                Monthly Limit
              </span>
              <input
                type='number'
                step='0.01'
                min='0.01'
                {...form.register("monthlyLimit")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              />
              {form.formState.errors.monthlyLimit ? (
                <span className='mt-1 block text-xs font-medium text-danger'>
                  {form.formState.errors.monthlyLimit.message}
                </span>
              ) : null}
            </label>

            {(categories.isError || setBudget.isError) && (
              <ErrorState
                compact
                title='Cannot save budget'
                message={toApiError(categories.error ?? setBudget.error)}
              />
            )}

            <button
              type='submit'
              disabled={setBudget.isPending}
              className='rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70'
            >
              {setBudget.isPending ? "Saving..." : "Save Budget"}
            </button>
          </form>
        </section>

        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='mb-4 font-headline text-xl font-bold'>
            Budget Status by Category
          </h2>

          <div className='mb-4'>
            <label className='block'>
              <span className='mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-text-muted'>
                Category Lookup
              </span>
              <select
                value={selectedCategoryId}
                onChange={(event) => setSelectedCategoryId(event.target.value)}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              >
                <option value=''>Select category</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {!selectedCategoryId ? (
            <EmptyState
              compact
              title='No category selected'
              message='Pick a category to view monthly budget status.'
            />
          ) : null}

          {status.isLoading ? (
            <LoadingState
              compact
              title='Loading budget status'
              message='Retrieving monthly spent and remaining values.'
            />
          ) : null}

          {status.isError ? (
            <ErrorState
              compact
              title='Budget status unavailable'
              message={toApiError(status.error)}
            />
          ) : null}

          {status.data ? (
            <div className='space-y-2 text-sm'>
              <Row
                label='Monthly Limit'
                value={formatCurrency(status.data.monthlyLimit)}
              />
              <Row label='Spent' value={formatCurrency(status.data.spent)} />
              <Row
                label='Remaining'
                value={formatCurrency(status.data.remaining)}
              />
              <Row
                label='Usage'
                value={formatPercent(
                  status.data.monthlyLimit > 0
                    ? (status.data.spent / status.data.monthlyLimit) * 100
                    : 0,
                )}
              />
              <Row
                label='Status'
                value={status.data.isExceeded ? "Exceeded" : "Within Limit"}
              />
            </div>
          ) : null}
        </section>
      </div>

      <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
        <h2 className='mb-4 font-headline text-xl font-bold'>
          Alert Watchlist ({monthLabel(year, month)})
        </h2>

        {alerts.isLoading ? (
          <LoadingState
            title='Loading alerts'
            message='Checking categories approaching or exceeding limits.'
          />
        ) : null}

        {alerts.isError ? (
          <ErrorState
            title='Alerts unavailable'
            message={toApiError(alerts.error)}
          />
        ) : null}

        {alerts.data && alerts.data.length === 0 ? (
          <EmptyState
            title='No budget alerts'
            message='No budgets are currently near threshold for this month.'
          />
        ) : null}

        {alerts.data && alerts.data.length > 0 ? (
          <div className='space-y-3'>
            {alerts.data.map((alert) => (
              <div
                key={alert.budgetId}
                className='rounded-xl border border-surface-border bg-surface-muted p-3'
              >
                <div className='flex items-center justify-between gap-3'>
                  <p className='font-semibold'>{alert.categoryName}</p>
                  <span
                    className={`text-xs font-semibold ${alert.isExceeded ? "text-danger" : "text-text-muted"}`}
                  >
                    {formatPercent(alert.usagePercent)}
                  </span>
                </div>
                <p className='mt-1 text-sm text-text-secondary'>
                  Spent {formatCurrency(alert.spent)} / Limit{" "}
                  {formatCurrency(alert.monthlyLimit)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </section>
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
