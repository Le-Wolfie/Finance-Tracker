import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  savingsGoalStatusLabel,
  useAddSavingsGoalContributionMutation,
  useMarkSavingsGoalCompleteMutation,
  useSavingsGoalByIdQuery,
  useSavingsGoalContributionsQuery,
  useUpdateSavingsGoalMutation,
  type SavingsGoalStatus,
} from "./api";

const updateGoalSchema = z.object({
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
  targetDate: z.string().min(1, "Target date is required."),
  status: z.enum(["1", "2", "3", "4"]),
});

const contributionSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required.")
    .refine(
      (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
      "Amount must be greater than 0.",
    ),
  contributionDate: z.string().min(1, "Contribution date is required."),
  note: z.string().trim().max(500).optional(),
});

type UpdateGoalFormValues = z.infer<typeof updateGoalSchema>;
type ContributionFormValues = z.infer<typeof contributionSchema>;

export function SavingsGoalDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const goalId = id;

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const goal = useSavingsGoalByIdQuery(goalId);
  const contributions = useSavingsGoalContributionsQuery(
    goalId,
    page,
    pageSize,
  );

  const updateGoal = useUpdateSavingsGoalMutation();
  const addContribution = useAddSavingsGoalContributionMutation();
  const markComplete = useMarkSavingsGoalCompleteMutation();

  const updateForm = useForm<UpdateGoalFormValues>({
    resolver: zodResolver(updateGoalSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      description: "",
      targetAmount: "",
      targetDate: "",
      status: "1",
    },
  });

  const contributionForm = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionSchema),
    mode: "onBlur",
    defaultValues: {
      amount: "",
      contributionDate: new Date().toISOString().slice(0, 10),
      note: "",
    },
  });

  useEffect(() => {
    if (!goal.data) {
      return;
    }

    updateForm.reset({
      name: goal.data.name,
      description: goal.data.description,
      targetAmount: String(goal.data.targetAmount),
      targetDate: goal.data.targetDate.slice(0, 10),
      status: String(goal.data.status) as "1" | "2" | "3" | "4",
    });
  }, [goal.data, updateForm]);

  const totalPages = useMemo(() => {
    if (!contributions.data) {
      return 1;
    }

    return Math.max(
      1,
      Math.ceil(contributions.data.totalCount / contributions.data.pageSize),
    );
  }, [contributions.data]);

  const handleUpdate = updateForm.handleSubmit(async (values) => {
    if (!goalId) {
      return;
    }

    await updateGoal.mutateAsync({
      id: goalId,
      name: values.name,
      description: values.description ?? "",
      targetAmount: Number(values.targetAmount),
      targetDate: new Date(`${values.targetDate}T12:00:00`).toISOString(),
      status: Number(values.status) as SavingsGoalStatus,
    });

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  });

  const handleContribution = contributionForm.handleSubmit(async (values) => {
    if (!goalId) {
      return;
    }

    await addContribution.mutateAsync({
      savingsGoalId: goalId,
      amount: Number(values.amount),
      contributionDate: new Date(
        `${values.contributionDate}T12:00:00`,
      ).toISOString(),
      note: values.note ?? "",
    });

    contributionForm.reset({
      amount: "",
      contributionDate: new Date().toISOString().slice(0, 10),
      note: "",
    });

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] }),
      queryClient.invalidateQueries({
        queryKey: ["savings-goals", "contributions", goalId],
      }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  });

  const handleMarkComplete = async () => {
    if (!goalId) {
      return;
    }

    await markComplete.mutateAsync(goalId);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["savings-goals"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  return (
    <section className='space-y-6'>
      <header className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
            Goal Detail
          </p>
          <h1 className='font-headline text-4xl font-extrabold tracking-tight'>
            Savings Goal Profile
          </h1>
        </div>

        <button
          type='button'
          onClick={() => navigate("/savings-goals")}
          className='rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-text-secondary transition hover:text-text-primary'
        >
          Back to Goals
        </button>
      </header>

      {goal.isLoading ? (
        <LoadingState
          title='Loading goal'
          message='Fetching goal profile and contribution status.'
        />
      ) : null}

      {goal.isError ? (
        <ErrorState title='Goal unavailable' message={toApiError(goal.error)} />
      ) : null}

      {goal.data ? (
        <>
          <section className='grid gap-4 md:grid-cols-4'>
            <MetricCard
              label='Current'
              value={formatCurrency(goal.data.currentAmount)}
            />
            <MetricCard
              label='Target'
              value={formatCurrency(goal.data.targetAmount)}
            />
            <MetricCard
              label='Remaining'
              value={formatCurrency(goal.data.remainingAmount)}
            />
            <MetricCard
              label='Completion'
              value={formatPercent(goal.data.completionPercent)}
            />
          </section>

          <section className='grid gap-6 lg:grid-cols-[1fr_1fr]'>
            <div className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='font-headline text-xl font-bold'>
                  Goal Settings
                </h2>
                <button
                  type='button'
                  onClick={handleMarkComplete}
                  disabled={markComplete.isPending || goal.data.status === 3}
                  className='rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60'
                >
                  Mark Complete
                </button>
              </div>

              <p className='mb-4 text-sm text-text-secondary'>
                Status: {savingsGoalStatusLabel(goal.data.status)} | Started{" "}
                {formatDate(goal.data.startDate)} | Target{" "}
                {formatDate(goal.data.targetDate)}
              </p>

              <form onSubmit={handleUpdate} className='space-y-4'>
                <Field
                  label='Name'
                  error={updateForm.formState.errors.name?.message}
                >
                  <input
                    type='text'
                    {...updateForm.register("name")}
                    className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
                  />
                </Field>

                <Field
                  label='Description'
                  error={updateForm.formState.errors.description?.message}
                >
                  <textarea
                    rows={3}
                    {...updateForm.register("description")}
                    className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
                  />
                </Field>

                <Field
                  label='Target Amount'
                  error={updateForm.formState.errors.targetAmount?.message}
                >
                  <input
                    type='number'
                    min='0.01'
                    step='0.01'
                    {...updateForm.register("targetAmount")}
                    className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
                  />
                </Field>

                <Field
                  label='Target Date'
                  error={updateForm.formState.errors.targetDate?.message}
                >
                  <input
                    type='date'
                    {...updateForm.register("targetDate")}
                    className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
                  />
                </Field>

                <Field
                  label='Status'
                  error={updateForm.formState.errors.status?.message}
                >
                  <select
                    {...updateForm.register("status")}
                    className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
                  >
                    <option value='1'>Active</option>
                    <option value='2'>Paused</option>
                    <option value='3'>Completed</option>
                    <option value='4'>Archived</option>
                  </select>
                </Field>

                {(updateGoal.isError || markComplete.isError) && (
                  <ErrorState
                    compact
                    title='Cannot update goal'
                    message={toApiError(updateGoal.error ?? markComplete.error)}
                  />
                )}

                <button
                  type='submit'
                  disabled={updateGoal.isPending}
                  className='rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70'
                >
                  {updateGoal.isPending ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>

            <div className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
              <h2 className='mb-4 font-headline text-xl font-bold'>
                Add Contribution
              </h2>

              <form onSubmit={handleContribution} className='space-y-4'>
                <Field
                  label='Amount'
                  error={contributionForm.formState.errors.amount?.message}
                >
                  <input
                    type='number'
                    min='0.01'
                    step='0.01'
                    {...contributionForm.register("amount")}
                    className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
                  />
                </Field>

                <Field
                  label='Contribution Date'
                  error={
                    contributionForm.formState.errors.contributionDate?.message
                  }
                >
                  <input
                    type='date'
                    {...contributionForm.register("contributionDate")}
                    className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
                  />
                </Field>

                <Field
                  label='Note'
                  error={contributionForm.formState.errors.note?.message}
                >
                  <textarea
                    rows={3}
                    {...contributionForm.register("note")}
                    className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
                  />
                </Field>

                {addContribution.isError ? (
                  <ErrorState
                    compact
                    title='Cannot add contribution'
                    message={toApiError(addContribution.error)}
                  />
                ) : null}

                <button
                  type='submit'
                  disabled={addContribution.isPending}
                  className='rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70'
                >
                  {addContribution.isPending ? "Saving..." : "Add Contribution"}
                </button>
              </form>
            </div>
          </section>

          <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
            <h2 className='mb-4 font-headline text-xl font-bold'>
              Contribution Timeline
            </h2>

            {contributions.isLoading ? (
              <LoadingState
                title='Loading contributions'
                message='Retrieving contribution timeline entries.'
              />
            ) : null}

            {contributions.isError ? (
              <ErrorState
                title='Contributions unavailable'
                message={toApiError(contributions.error)}
              />
            ) : null}

            {contributions.data && contributions.data.items.length === 0 ? (
              <EmptyState
                title='No contributions yet'
                message='Add a contribution to start building this goal timeline.'
              />
            ) : null}

            {contributions.data && contributions.data.items.length > 0 ? (
              <>
                <div className='space-y-3'>
                  {contributions.data.items.map((item) => (
                    <div
                      key={item.id}
                      className='rounded-xl border border-surface-border bg-surface-muted p-3'
                    >
                      <div className='flex items-center justify-between gap-3'>
                        <p className='font-semibold'>
                          {formatCurrency(item.amount)}
                        </p>
                        <p className='text-xs text-text-muted'>
                          {formatDate(item.contributionDate)}
                        </p>
                      </div>
                      <p className='mt-1 text-sm text-text-secondary'>
                        {item.note || "No note"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className='mt-4 flex items-center justify-between text-sm'>
                  <span className='text-text-secondary'>
                    Page {contributions.data.page} of {totalPages} (
                    {contributions.data.totalCount} total)
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
        </>
      ) : null}
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
    <div className='rounded-2xl border border-surface-border bg-surface p-5 shadow-soft'>
      <p className='text-xs font-bold uppercase tracking-[0.16em] text-text-muted'>
        {label}
      </p>
      <p className='mt-2 text-2xl font-bold'>{value}</p>
    </div>
  );
}
