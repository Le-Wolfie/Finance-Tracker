import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { toApiError } from "../../lib/api/client";
import { useAccountsQuery } from "../accounts/api";
import {
  categoryTypeForTransaction,
  useCategoriesQuery,
  useCreateTransactionMutation,
  useTransactionByIdQuery,
  useUpdateTransactionMutation,
} from "./api";

const transactionSchema = z
  .object({
    type: z.enum(["1", "2", "3"]),
    accountId: z.string().min(1, "Account is required."),
    destinationAccountId: z.string().optional(),
    categoryId: z.string().optional(),
    amount: z
      .string()
      .trim()
      .min(1, "Amount is required.")
      .refine(
        (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
        "Amount must be greater than 0.",
      ),
    date: z.string().min(1, "Date is required."),
    description: z
      .string()
      .max(500, "Description cannot exceed 500 chars.")
      .optional(),
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
          message: "Destination account is required for transfer.",
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
          message: "Destination must be different from source account.",
          path: ["destinationAccountId"],
        });
      }
    }
  });

type TransactionFormValues = z.infer<typeof transactionSchema>;

export function TransactionEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(id);

  const accounts = useAccountsQuery();
  const categories = useCategoriesQuery();
  const transactionDetail = useTransactionByIdQuery(id);
  const createTransaction = useCreateTransactionMutation();
  const updateTransaction = useUpdateTransactionMutation();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    mode: "onBlur",
    defaultValues: {
      type: "2",
      accountId: "",
      destinationAccountId: "",
      categoryId: "",
      amount: "",
      date: new Date().toISOString().slice(0, 10),
      description: "",
    },
  });

  const watchedType = useWatch({
    control: form.control,
    name: "type",
    defaultValue: "2",
  });

  const selectedType = Number(watchedType) as 1 | 2 | 3;
  const allowedCategoryType = categoryTypeForTransaction(selectedType);

  const filteredCategories = useMemo(() => {
    if (!categories.data) {
      return [];
    }

    if (!allowedCategoryType) {
      return [];
    }

    return categories.data.filter((item) => item.type === allowedCategoryType);
  }, [allowedCategoryType, categories.data]);

  useEffect(() => {
    if (!isEditMode || !transactionDetail.data) {
      return;
    }

    form.reset({
      type: String(transactionDetail.data.type) as "1" | "2" | "3",
      accountId: transactionDetail.data.accountId,
      destinationAccountId: transactionDetail.data.destinationAccountId ?? "",
      categoryId: transactionDetail.data.categoryId ?? "",
      amount: String(transactionDetail.data.amount),
      date: transactionDetail.data.date.slice(0, 10),
      description: transactionDetail.data.description ?? "",
    });
  }, [form, isEditMode, transactionDetail.data]);

  const submitHandler = form.handleSubmit(async (values) => {
    const payload = {
      accountId: values.accountId,
      destinationAccountId:
        values.type === "3"
          ? values.destinationAccountId || undefined
          : undefined,
      categoryId:
        values.type === "3" ? undefined : values.categoryId || undefined,
      amount: Number(values.amount),
      type: Number(values.type) as 1 | 2 | 3,
      date: new Date(`${values.date}T12:00:00`).toISOString(),
      description: values.description || "",
    };

    if (isEditMode && id) {
      await updateTransaction.mutateAsync({ id, payload });
    } else {
      await createTransaction.mutateAsync(payload);
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
    ]);

    navigate("/transactions", { replace: true });
  });

  return (
    <section className='space-y-6'>
      <header>
        <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
          Transaction Form
        </p>
        <h1 className='font-headline text-3xl font-extrabold tracking-tight md:text-4xl'>
          {isEditMode ? "Edit Transaction" : "New Transaction"}
        </h1>
        <p className='mt-2 text-text-secondary'>
          {isEditMode
            ? "Update an existing income, expense, or transfer entry."
            : "Create income, expense, or transfer entries. Submission uses idempotency key headers automatically."}
        </p>
      </header>

      {isEditMode && transactionDetail.isLoading ? (
        <p className='text-sm text-text-secondary'>Loading transaction...</p>
      ) : null}

      {isEditMode && transactionDetail.isError ? (
        <div className='rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-danger'>
          {toApiError(transactionDetail.error)}
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

          <Field label='Date' error={form.formState.errors.date?.message}>
            <input
              type='date'
              {...form.register("date")}
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
          transactionDetail.isError ||
          createTransaction.isError ||
          updateTransaction.isError) && (
          <div className='mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-danger'>
            {toApiError(
              accounts.error ??
                categories.error ??
                transactionDetail.error ??
                createTransaction.error ??
                updateTransaction.error,
            )}
          </div>
        )}

        <div className='mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end'>
          <button
            type='button'
            onClick={() => navigate("/transactions")}
            className='w-full rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary sm:w-auto'
          >
            Cancel
          </button>
          <button
            type='submit'
            disabled={
              createTransaction.isPending ||
              updateTransaction.isPending ||
              (isEditMode &&
                (!id ||
                  transactionDetail.isLoading ||
                  transactionDetail.isError))
            }
            className='w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70 sm:w-auto'
          >
            {createTransaction.isPending || updateTransaction.isPending
              ? "Saving..."
              : isEditMode
                ? "Update Transaction"
                : "Save Transaction"}
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
