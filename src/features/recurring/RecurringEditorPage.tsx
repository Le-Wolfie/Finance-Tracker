import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { toApiError } from "../../lib/api/client";
import { useAccountsQuery } from "../accounts/api";
import {
  categoryTypeForTransaction,
  useCategoriesQuery,
} from "../transactions/api";
import {
  useCreateRecurringTransactionMutation,
  useRecurringTransactionByIdQuery,
  useUpdateRecurringTransactionMutation,
  type RecurrenceFrequency,
  type TransactionType,
  type UpdateRecurringPayload,
} from "./api";

const recurringSchema = z
  .object({
    accountId: z.string().min(1, "Source account is required."),
    destinationAccountId: z.string().optional(),
    categoryId: z.string().optional(),
    name: z.string().trim().min(2, "Name is required.").max(120),
    description: z.string().trim().max(500).optional(),
    amount: z
      .string()
      .trim()
      .min(1, "Amount is required.")
      .refine(
        (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
        "Amount must be greater than 0.",
      ),
    type: z.enum(["1", "2", "3"]),
    frequency: z.enum(["1", "2", "3", "4"]),
    intervalDays: z.string().optional(),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().optional(),
    maxOccurrences: z.string().optional(),
  })
  .superRefine((data, context) => {
    if ((data.type === "1" || data.type === "2") && !data.categoryId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Category is required for income and expense.",
        path: ["categoryId"],
      });
    }

    if (data.type === "3") {
      if (!data.destinationAccountId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination account is required for transfers.",
          path: ["destinationAccountId"],
        });
      }

      if (
        data.accountId &&
        data.destinationAccountId &&
        data.accountId === data.destinationAccountId
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Destination account must be different from source.",
          path: ["destinationAccountId"],
        });
      }
    }

    if (data.frequency === "4") {
      if (!data.intervalDays) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Interval days is required for custom frequency.",
          path: ["intervalDays"],
        });
      } else if (
        Number.isNaN(Number(data.intervalDays)) ||
        Number(data.intervalDays) <= 0
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Interval days must be greater than 0.",
          path: ["intervalDays"],
        });
      }
    }

    if (data.maxOccurrences) {
      if (
        Number.isNaN(Number(data.maxOccurrences)) ||
        Number(data.maxOccurrences) <= 0
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Max occurrences must be greater than 0.",
          path: ["maxOccurrences"],
        });
      }
    }

    if (data.endDate && data.startDate && data.endDate < data.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after start date.",
        path: ["endDate"],
      });
    }
  });

type RecurringFormValues = z.infer<typeof recurringSchema>;

export function RecurringEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const queryClient = useQueryClient();

  const accounts = useAccountsQuery();
  const categories = useCategoriesQuery();
  const createRecurring = useCreateRecurringTransactionMutation();
  const updateRecurring = useUpdateRecurringTransactionMutation();
  const recurringDetail = useRecurringTransactionByIdQuery(id);

  const form = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringSchema),
    mode: "onBlur",
    defaultValues: {
      accountId: "",
      destinationAccountId: "",
      categoryId: "",
      name: "",
      description: "",
      amount: "",
      type: "2",
      frequency: "3",
      intervalDays: "",
      startDate: new Date().toISOString().slice(0, 10),
      endDate: "",
      maxOccurrences: "",
    },
  });

  const watchedType = useWatch({
    control: form.control,
    name: "type",
    defaultValue: "2",
  });
  const watchedFrequency = useWatch({
    control: form.control,
    name: "frequency",
    defaultValue: "3",
  });

  const selectedType = Number(watchedType) as TransactionType;
  const selectedFrequency = Number(watchedFrequency) as RecurrenceFrequency;
  const categoryType = categoryTypeForTransaction(selectedType);

  const filteredCategories = useMemo(() => {
    if (!categories.data || !categoryType) {
      return [];
    }

    return categories.data.filter((item) => item.type === categoryType);
  }, [categories.data, categoryType]);

  useEffect(() => {
    if (!isEditMode || !recurringDetail.data) {
      return;
    }

    form.reset({
      accountId: recurringDetail.data.accountId,
      destinationAccountId: recurringDetail.data.destinationAccountId ?? "",
      categoryId: recurringDetail.data.categoryId ?? "",
      name: recurringDetail.data.name,
      description: recurringDetail.data.description ?? "",
      amount: String(recurringDetail.data.amount),
      type: String(recurringDetail.data.type) as "1" | "2" | "3",
      frequency: String(recurringDetail.data.frequency) as
        | "1"
        | "2"
        | "3"
        | "4",
      intervalDays: recurringDetail.data.intervalDays
        ? String(recurringDetail.data.intervalDays)
        : "",
      startDate: recurringDetail.data.startDate.slice(0, 10),
      endDate: recurringDetail.data.endDate?.slice(0, 10) ?? "",
      maxOccurrences: recurringDetail.data.maxOccurrences
        ? String(recurringDetail.data.maxOccurrences)
        : "",
    });
  }, [form, isEditMode, recurringDetail.data]);

  const submitHandler = form.handleSubmit(async (values) => {
    const basePayload = {
      accountId: values.accountId,
      destinationAccountId:
        values.type === "3"
          ? values.destinationAccountId || undefined
          : undefined,
      categoryId:
        values.type === "3" ? undefined : values.categoryId || undefined,
      name: values.name,
      description: values.description ?? "",
      amount: Number(values.amount),
      type: Number(values.type) as TransactionType,
      frequency: Number(values.frequency) as RecurrenceFrequency,
      intervalDays:
        values.frequency === "4" ? Number(values.intervalDays) : undefined,
      startDate: new Date(`${values.startDate}T12:00:00`).toISOString(),
      endDate: values.endDate
        ? new Date(`${values.endDate}T12:00:00`).toISOString()
        : undefined,
      maxOccurrences: values.maxOccurrences
        ? Number(values.maxOccurrences)
        : undefined,
    };

    if (isEditMode && id) {
      const detail = recurringDetail.data;
      if (!detail) {
        return;
      }

      const payload: UpdateRecurringPayload = {
        ...basePayload,
        nextExecutionDate: detail.nextExecutionDate,
        isActive: detail.isActive,
      };

      await updateRecurring.mutateAsync({ id, payload });
    } else {
      await createRecurring.mutateAsync(basePayload);
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
    ]);

    navigate("/recurring", { replace: true });
  });

  return (
    <section className='space-y-6'>
      <header>
        <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
          Recurring Rule
        </p>
        <h1 className='font-headline text-3xl font-extrabold tracking-tight md:text-4xl'>
          {isEditMode
            ? "Edit Recurring Transaction"
            : "New Recurring Transaction"}
        </h1>
        <p className='mt-2 text-text-secondary'>
          {isEditMode
            ? "Update an existing automation rule for income, expense, or transfer entries."
            : "Define an automated rule for income, expense, or transfer entries."}
        </p>
      </header>

      {isEditMode && recurringDetail.isLoading ? (
        <p className='text-sm text-text-secondary'>Loading recurring rule...</p>
      ) : null}

      {isEditMode && recurringDetail.isError ? (
        <div className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-danger'>
          {toApiError(recurringDetail.error)}
        </div>
      ) : null}

      <form
        onSubmit={submitHandler}
        className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'
      >
        <div className='grid gap-4 md:grid-cols-2'>
          <Field label='Type' error={form.formState.errors.type?.message}>
            <select
              {...form.register("type")}
              className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            >
              <option value='2'>Expense</option>
              <option value='1'>Income</option>
              <option value='3'>Transfer</option>
            </select>
          </Field>

          <Field
            label='Frequency'
            error={form.formState.errors.frequency?.message}
          >
            <select
              {...form.register("frequency")}
              className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            >
              <option value='1'>Daily</option>
              <option value='2'>Weekly</option>
              <option value='3'>Monthly</option>
              <option value='4'>Custom Days Interval</option>
            </select>
          </Field>

          {selectedFrequency === 4 ? (
            <Field
              label='Interval Days'
              error={form.formState.errors.intervalDays?.message}
            >
              <input
                type='number'
                min='1'
                step='1'
                {...form.register("intervalDays")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              />
            </Field>
          ) : null}

          <Field label='Name' error={form.formState.errors.name?.message}>
            <input
              type='text'
              {...form.register("name")}
              className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            />
          </Field>

          <Field label='Amount' error={form.formState.errors.amount?.message}>
            <input
              type='number'
              min='0.01'
              step='0.01'
              {...form.register("amount")}
              className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            />
          </Field>

          <Field
            label='Source Account'
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

          {selectedType === 3 ? (
            <Field
              label='Destination Account'
              error={form.formState.errors.destinationAccountId?.message}
            >
              <select
                {...form.register("destinationAccountId")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              >
                <option value=''>Select destination</option>
                {(accounts.data ?? []).map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field
              label='Category'
              error={form.formState.errors.categoryId?.message}
            >
              <select
                {...form.register("categoryId")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              >
                <option value=''>Select category</option>
                {filteredCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

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
            label='End Date (optional)'
            error={form.formState.errors.endDate?.message}
          >
            <input
              type='date'
              {...form.register("endDate")}
              className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            />
          </Field>

          <Field
            label='Max Occurrences (optional)'
            error={form.formState.errors.maxOccurrences?.message}
          >
            <input
              type='number'
              min='1'
              step='1'
              {...form.register("maxOccurrences")}
              className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            />
          </Field>

          <div className='md:col-span-2'>
            <Field
              label='Description'
              error={form.formState.errors.description?.message}
            >
              <textarea
                rows={4}
                {...form.register("description")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              />
            </Field>
          </div>
        </div>

        {(accounts.isError ||
          categories.isError ||
          createRecurring.isError ||
          updateRecurring.isError) && (
          <div className='mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-danger'>
            {toApiError(
              accounts.error ??
                categories.error ??
                createRecurring.error ??
                updateRecurring.error,
            )}
          </div>
        )}

        <div className='mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end'>
          <button
            type='button'
            onClick={() => navigate("/recurring")}
            className='w-full rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary sm:w-auto'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={
              createRecurring.isPending ||
              updateRecurring.isPending ||
              (isEditMode &&
                (!id || recurringDetail.isLoading || recurringDetail.isError))
            }
            className='w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70 sm:w-auto'
          >
            {createRecurring.isPending || updateRecurring.isPending
              ? "Saving..."
              : isEditMode
                ? "Update Rule"
                : "Create Rule"}
          </button>
        </div>
      </form>
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
