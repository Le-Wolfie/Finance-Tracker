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
import { formatCurrency, formatDate, monthLabel } from "../../lib/format";
import { useCategoriesQuery } from "../transactions/api";
import {
  rolloverStrategyLabel,
  useApplyBudgetTemplateMutation,
  useBudgetTemplatesQuery,
  useCreateBudgetTemplateMutation,
  useUpdateBudgetTemplateMutation,
  type BudgetRolloverStrategy,
  type BudgetTemplate,
} from "./api";

const templateSchema = z.object({
  categoryId: z.string().min(1, "Category is required."),
  name: z.string().trim().min(2, "Name is required."),
  description: z.string().trim().optional(),
  monthlyLimit: z
    .string()
    .trim()
    .min(1, "Monthly limit is required.")
    .refine(
      (value) => !Number.isNaN(Number(value)) && Number(value) > 0,
      "Monthly limit must be greater than 0.",
    ),
  rolloverStrategy: z.enum(["1", "2", "3"]),
});

const applySchema = z.object({
  templateId: z.string().min(1, "Template is required."),
  overrideMonthlyLimit: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => !value || (!Number.isNaN(Number(value)) && Number(value) > 0),
      "Override limit must be greater than 0 when provided.",
    ),
});

type TemplateFormValues = z.infer<typeof templateSchema>;
type ApplyFormValues = z.infer<typeof applySchema>;

export function BudgetTemplatesPage() {
  const queryClient = useQueryClient();
  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [editingTemplateId, setEditingTemplateId] = useState<string>();

  const categories = useCategoriesQuery();
  const templates = useBudgetTemplatesQuery();

  const createTemplate = useCreateBudgetTemplateMutation();
  const updateTemplate = useUpdateBudgetTemplateMutation();
  const applyTemplate = useApplyBudgetTemplateMutation();

  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    mode: "onBlur",
    defaultValues: {
      categoryId: "",
      name: "",
      description: "",
      monthlyLimit: "",
      rolloverStrategy: "1",
    },
  });

  const applyForm = useForm<ApplyFormValues>({
    resolver: zodResolver(applySchema),
    mode: "onBlur",
    defaultValues: {
      templateId: "",
      overrideMonthlyLimit: "",
    },
  });

  const submitTemplate = templateForm.handleSubmit(async (values) => {
    const payload = {
      categoryId: values.categoryId,
      name: values.name,
      description: values.description ?? "",
      monthlyLimit: Number(values.monthlyLimit),
      rolloverStrategy: Number(
        values.rolloverStrategy,
      ) as BudgetRolloverStrategy,
    };

    if (editingTemplateId) {
      await updateTemplate.mutateAsync({
        id: editingTemplateId,
        ...payload,
        isActive: true,
      });
    } else {
      await createTemplate.mutateAsync(payload);
    }

    setEditingTemplateId(undefined);
    templateForm.reset({
      categoryId: "",
      name: "",
      description: "",
      monthlyLimit: "",
      rolloverStrategy: "1",
    });

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["budgets", "templates"] }),
      queryClient.invalidateQueries({ queryKey: ["budgets", "alerts"] }),
    ]);
  });

  const submitApply = applyForm.handleSubmit(async (values) => {
    await applyTemplate.mutateAsync({
      templateId: values.templateId,
      year,
      month,
      overrideMonthlyLimit: values.overrideMonthlyLimit
        ? Number(values.overrideMonthlyLimit)
        : undefined,
    });

    applyForm.reset({ templateId: "", overrideMonthlyLimit: "" });

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["budgets"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  });

  const startEdit = (template: BudgetTemplate) => {
    setEditingTemplateId(template.id);
    templateForm.reset({
      categoryId: template.categoryId,
      name: template.name,
      description: template.description,
      monthlyLimit: String(template.monthlyLimit),
      rolloverStrategy: String(template.rolloverStrategy) as "1" | "2" | "3",
    });
  };

  const resetEditor = () => {
    setEditingTemplateId(undefined);
    templateForm.reset({
      categoryId: "",
      name: "",
      description: "",
      monthlyLimit: "",
      rolloverStrategy: "1",
    });
  };

  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((item) => [item.id, item.name])),
    [categories.data],
  );

  return (
    <section className='space-y-6'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
            Budget Templates
          </p>
          <h1 className='font-headline text-4xl font-extrabold tracking-tight'>
            Template Library
          </h1>
          <p className='mt-2 text-text-secondary'>
            Create reusable budgets and apply them to {monthLabel(year, month)}.
          </p>
        </div>

        <Link
          to='/budgets'
          className='rounded-xl border border-surface-border bg-surface px-4 py-2 text-sm font-semibold text-text-secondary transition hover:text-text-primary'
        >
          Back to Budgets
        </Link>
      </header>

      <div className='grid gap-6 lg:grid-cols-[1fr_1fr]'>
        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='mb-4 font-headline text-xl font-bold'>
            {editingTemplateId ? "Edit Template" : "Create Template"}
          </h2>

          <form onSubmit={submitTemplate} className='space-y-4'>
            <Field
              label='Category'
              error={templateForm.formState.errors.categoryId?.message}
            >
              <select
                {...templateForm.register("categoryId")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              >
                <option value=''>Select category</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label='Name'
              error={templateForm.formState.errors.name?.message}
            >
              <input
                type='text'
                {...templateForm.register("name")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              />
            </Field>

            <Field
              label='Description'
              error={templateForm.formState.errors.description?.message}
            >
              <textarea
                rows={3}
                {...templateForm.register("description")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              />
            </Field>

            <Field
              label='Monthly Limit'
              error={templateForm.formState.errors.monthlyLimit?.message}
            >
              <input
                type='number'
                min='0.01'
                step='0.01'
                {...templateForm.register("monthlyLimit")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              />
            </Field>

            <Field
              label='Rollover Strategy'
              error={templateForm.formState.errors.rolloverStrategy?.message}
            >
              <select
                {...templateForm.register("rolloverStrategy")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              >
                <option value='1'>None</option>
                <option value='2'>Unused Only</option>
                <option value='3'>Partial Unused 50%</option>
              </select>
            </Field>

            {(categories.isError ||
              createTemplate.isError ||
              updateTemplate.isError) && (
              <ErrorState
                compact
                title='Cannot save template'
                message={toApiError(
                  categories.error ??
                    createTemplate.error ??
                    updateTemplate.error,
                )}
              />
            )}

            <div className='flex flex-wrap gap-2'>
              <button
                type='submit'
                disabled={createTemplate.isPending || updateTemplate.isPending}
                className='rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70'
              >
                {createTemplate.isPending || updateTemplate.isPending
                  ? "Saving..."
                  : editingTemplateId
                    ? "Update Template"
                    : "Create Template"}
              </button>
              {editingTemplateId ? (
                <button
                  type='button'
                  onClick={resetEditor}
                  className='rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary'
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='mb-4 font-headline text-xl font-bold'>
            Apply Template to Current Month
          </h2>

          <form onSubmit={submitApply} className='space-y-4'>
            <Field
              label='Template'
              error={applyForm.formState.errors.templateId?.message}
            >
              <select
                {...applyForm.register("templateId")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              >
                <option value=''>Select template</option>
                {(templates.data ?? []).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label='Override Monthly Limit (optional)'
              error={applyForm.formState.errors.overrideMonthlyLimit?.message}
            >
              <input
                type='number'
                min='0.01'
                step='0.01'
                {...applyForm.register("overrideMonthlyLimit")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              />
            </Field>

            {applyTemplate.isError ? (
              <ErrorState
                compact
                title='Cannot apply template'
                message={toApiError(applyTemplate.error)}
              />
            ) : null}

            <button
              type='submit'
              disabled={applyTemplate.isPending}
              className='rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70'
            >
              {applyTemplate.isPending ? "Applying..." : "Apply Template"}
            </button>
          </form>
        </section>
      </div>

      <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
        <h2 className='mb-4 font-headline text-xl font-bold'>
          Saved Templates
        </h2>

        {templates.isLoading ? (
          <LoadingState
            title='Loading templates'
            message='Fetching your saved budget templates.'
          />
        ) : null}

        {templates.isError ? (
          <ErrorState
            title='Templates unavailable'
            message={toApiError(templates.error)}
          />
        ) : null}

        {templates.data && templates.data.length === 0 ? (
          <EmptyState
            title='No templates yet'
            message='Create a template to reuse your budget setup each month.'
          />
        ) : null}

        {templates.data && templates.data.length > 0 ? (
          <div className='space-y-3'>
            {templates.data.map((template) => (
              <div
                key={template.id}
                className='rounded-xl border border-surface-border bg-surface-muted p-4'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <p className='font-semibold'>{template.name}</p>
                    <p className='text-xs text-text-muted'>
                      {categoryById.get(template.categoryId) ??
                        "Unknown Category"}
                    </p>
                  </div>
                  <button
                    type='button'
                    onClick={() => startEdit(template)}
                    className='rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:text-text-primary'
                  >
                    Edit
                  </button>
                </div>

                <p className='mt-2 text-sm text-text-secondary'>
                  {template.description || "No description"}
                </p>

                <div className='mt-3 grid gap-2 text-sm md:grid-cols-3'>
                  <StatRow
                    label='Limit'
                    value={formatCurrency(template.monthlyLimit)}
                  />
                  <StatRow
                    label='Rollover'
                    value={rolloverStrategyLabel(template.rolloverStrategy)}
                  />
                  <StatRow
                    label='Created'
                    value={formatDate(template.createdAt)}
                  />
                </div>
              </div>
            ))}
          </div>
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
