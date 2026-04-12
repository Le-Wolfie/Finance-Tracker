import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import { formatCurrency, formatDate, formatPercent } from "../../lib/format";
import { useAccountsQuery } from "../accounts/api";
import {
  savingsGoalStatusLabel,
  useCreateSavingsGoalMutation,
  useSavingsGoalsQuery,
  useSavingsGoalsSummaryQuery,
  type SavingsGoalStatus,
} from "./api";

const createGoalSchema = z
  .object({
    accountId: z.string().min(1, "Account is required."),
    name: z.string().trim().min(2, "Name is required.").max(120),
    description: z.string().trim().max(500).optional(),
    targetAmount: z
      .string()
      .trim()
      .min(1, "Target amount is required.")
      .refine(
        (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
        "Target amount must be greater than 0.",
      ),
    startDate: z.string().min(1, "Start date is required."),
    targetDate: z.string().min(1, "Target date is required."),
  })
  .superRefine((data, context) => {
    if (data.startDate && data.targetDate && data.targetDate < data.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target date must be on or after start date.",
        path: ["targetDate"],
      });
    }
  });

type CreateGoalFormValues = z.infer<typeof createGoalSchema>;

export function SavingsGoalsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"" | "1" | "2" | "3" | "4">(
    "",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const isSearching = searchTerm.trim().length > 0;
  const queryPage = isSearching ? 1 : page;
  const queryPageSize = isSearching ? 100 : pageSize;

  const accounts = useAccountsQuery();
  const summary = useSavingsGoalsSummaryQuery();
  const goals = useSavingsGoalsQuery({
    status: statusFilter
      ? (Number(statusFilter) as SavingsGoalStatus)
      : undefined,
    page: queryPage,
    pageSize: queryPageSize,
  });

  const createGoal = useCreateSavingsGoalMutation();

  const form = useForm<CreateGoalFormValues>({
    resolver: zodResolver(createGoalSchema),
    mode: "onBlur",
    defaultValues: {
      accountId: "",
      name: "",
      description: "",
      targetAmount: "",
      startDate: new Date().toISOString().slice(0, 10),
      targetDate: "",
    },
  });

  const filteredGoals = useMemo(() => {
    const items = goals.data?.items ?? [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return items;
    }

    return items.filter((goal) => {
      const haystack = [
        goal.name,
        goal.description,
        savingsGoalStatusLabel(goal.status),
        formatDate(goal.targetDate),
        String(goal.currentAmount),
        String(goal.targetAmount),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [goals.data?.items, searchTerm]);

  const totalPages = useMemo(() => {
    if (!goals.data) {
      return 1;
    }

    if (isSearching) {
      return Math.max(1, Math.ceil(filteredGoals.length / pageSize));
    }

    return Math.max(1, Math.ceil(goals.data.totalCount / goals.data.pageSize));
  }, [filteredGoals.length, goals.data, isSearching, pageSize]);

  const paginatedGoals = useMemo(() => {
    if (!isSearching) {
      return filteredGoals;
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredGoals.slice(start, end);
  }, [filteredGoals, isSearching, page, pageSize]);

  const submitHandler = form.handleSubmit(async (values) => {
    await createGoal.mutateAsync({
      accountId: values.accountId,
      name: values.name,
      description: values.description ?? "",
      targetAmount: Number(values.targetAmount),
      startDate: new Date(`${values.startDate}T12:00:00`).toISOString(),
      targetDate: new Date(`${values.targetDate}T12:00:00`).toISOString(),
    });

    form.reset({
      accountId: "",
      name: "",
      description: "",
      targetAmount: "",
      startDate: new Date().toISOString().slice(0, 10),
      targetDate: "",
    });

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  });

  return (
    <section className='space-y-6'>
      <header>
        <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
          Savings
        </p>
        <h1 className='font-headline text-3xl font-extrabold tracking-tight md:text-4xl'>
          Savings Goals
        </h1>
        <p className='mt-2 text-text-secondary'>
          Track target progress and contribution discipline across your goals.
        </p>
      </header>

      <section className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        <MetricCard
          label='Active Goals'
          value={String(summary.data?.activeGoalsCount ?? 0)}
        />
        <MetricCard
          label='Completed Goals'
          value={String(summary.data?.completedGoalsCount ?? 0)}
        />
        <MetricCard
          label='Total Target'
          value={formatCurrency(summary.data?.totalTargetAmount ?? 0)}
        />
        <MetricCard
          label='Overall Completion'
          value={formatPercent(summary.data?.overallCompletionPercent ?? 0)}
        />
      </section>

      <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
        <h2 className='mb-4 font-headline text-xl font-bold'>Create Goal</h2>

        <form onSubmit={submitHandler} className='grid gap-4 md:grid-cols-2'>
          <Field
            label='Account'
            error={form.formState.errors.accountId?.message}
          >
            <select
              {...form.register("accountId")}
              className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            >
              <option value=''>Select account</option>
              {(accounts.data ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label='Name' error={form.formState.errors.name?.message}>
            <input
              type='text'
              {...form.register("name")}
              className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            />
          </Field>

          <Field
            label='Target Amount'
            error={form.formState.errors.targetAmount?.message}
          >
            <input
              type='number'
              min='0.01'
              step='0.01'
              {...form.register("targetAmount")}
              className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            />
          </Field>

          <Field
            label='Start Date'
            error={form.formState.errors.startDate?.message}
          >
            <input
              type='date'
              {...form.register("startDate")}
              className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            />
          </Field>

          <Field
            label='Target Date'
            error={form.formState.errors.targetDate?.message}
          >
            <input
              type='date'
              {...form.register("targetDate")}
              className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            />
          </Field>

          <div className='md:col-span-2'>
            <Field
              label='Description'
              error={form.formState.errors.description?.message}
            >
              <textarea
                rows={3}
                {...form.register("description")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              />
            </Field>
          </div>

          {(accounts.isError || createGoal.isError || summary.isError) && (
            <div className='md:col-span-2'>
              <ErrorState
                compact
                title='Cannot create goal'
                message={toApiError(
                  accounts.error ?? createGoal.error ?? summary.error,
                )}
              />
            </div>
          )}

          <div className='md:col-span-2'>
            <button
              type='submit'
              disabled={createGoal.isPending}
              className='rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70'
            >
              {createGoal.isPending ? "Saving..." : "Create Goal"}
            </button>
          </div>
        </form>
      </section>

      <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
        <div className='mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <h2 className='font-headline text-xl font-bold'>Goal Portfolio</h2>
          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
            <input
              type='search'
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder='Search goals...'
              className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            />
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(
                  event.target.value as "" | "1" | "2" | "3" | "4",
                );
                setPage(1);
              }}
              className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            >
              <option value=''>All Statuses</option>
              <option value='1'>Active</option>
              <option value='2'>Paused</option>
              <option value='3'>Completed</option>
              <option value='4'>Archived</option>
            </select>
          </div>
        </div>

        {goals.isLoading ? (
          <LoadingState
            title='Loading goals'
            message='Fetching your savings goal portfolio.'
          />
        ) : null}

        {goals.isError ? (
          <ErrorState
            title='Goals unavailable'
            message={toApiError(goals.error)}
          />
        ) : null}

        {goals.data && filteredGoals.length === 0 ? (
          <EmptyState
            title={searchTerm ? "No matching goals" : "No goals found"}
            message={
              searchTerm
                ? "No goals match your search. Try another term."
                : "Create your first savings goal to start tracking progress."
            }
          />
        ) : null}

        {goals.data && filteredGoals.length > 0 ? (
          <>
            <div className='space-y-3'>
              {paginatedGoals.map((goal) => (
                <Link
                  key={goal.id}
                  to={`/savings-goals/${goal.id}`}
                  className='block rounded-xl border border-surface-border bg-surface-muted p-4 transition hover:border-primary/40'
                >
                  <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3'>
                    <p className='truncate font-semibold' title={goal.name}>
                      {goal.name}
                    </p>
                    <span className='text-xs font-semibold text-text-muted'>
                      {savingsGoalStatusLabel(goal.status)}
                    </span>
                  </div>
                  <p className='mt-1 text-sm text-text-secondary'>
                    {goal.description || "No description"}
                  </p>
                  <div className='mt-3 grid grid-cols-2 gap-2 text-sm lg:grid-cols-4'>
                    <StatRow
                      label='Current'
                      value={formatCurrency(goal.currentAmount)}
                    />
                    <StatRow
                      label='Target'
                      value={formatCurrency(goal.targetAmount)}
                    />
                    <StatRow
                      label='Completion'
                      value={formatPercent(goal.completionPercent)}
                    />
                    <StatRow
                      label='Target Date'
                      value={formatDate(goal.targetDate)}
                    />
                  </div>
                </Link>
              ))}
            </div>

            <div className='mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between'>
              <span className='text-text-secondary'>
                Page {page} of {totalPages} ({filteredGoals.length} shown)
              </span>
              {totalPages > 1 ? (
                <div className='grid grid-cols-2 gap-2 sm:flex'>
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
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
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

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className='min-w-0 rounded-2xl border border-surface-border bg-surface p-5 shadow-soft'>
      <p className='text-xs font-bold uppercase tracking-[0.16em] text-text-muted'>
        {label}
      </p>
      <p
        className='mt-2 break-words text-xl font-bold leading-tight sm:text-2xl'
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className='rounded-lg border border-surface-border bg-surface px-3 py-2'>
      <p className='text-xs font-bold uppercase tracking-[0.12em] text-text-muted'>
        {label}
      </p>
      <p className='mt-1 font-semibold'>{value}</p>
    </div>
  );
}
