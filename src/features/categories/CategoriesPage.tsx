import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/shared/QueryState";
import { toApiError } from "../../lib/api/client";
import {
  categoryTypeLabel,
  useCategoriesQuery,
  useCreateCategoryMutation,
} from "./api";

const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name cannot exceed 100 characters."),
  type: z.enum(["1", "2"]),
});

type CreateCategoryForm = z.infer<typeof createCategorySchema>;

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const categories = useCategoriesQuery();
  const createCategory = useCreateCategoryMutation();

  const form = useForm<CreateCategoryForm>({
    resolver: zodResolver(createCategorySchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      type: "2",
    },
  });

  const incomeCategories = useMemo(
    () => (categories.data ?? []).filter((category) => category.type === 1),
    [categories.data],
  );

  const expenseCategories = useMemo(
    () => (categories.data ?? []).filter((category) => category.type === 2),
    [categories.data],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    await createCategory.mutateAsync({
      name: values.name,
      type: Number(values.type) as 1 | 2,
    });

    await queryClient.invalidateQueries({ queryKey: ["categories"] });
    form.reset({ name: "", type: values.type });
  });

  const mutationError = createCategory.isError
    ? toApiError(createCategory.error)
    : null;
  const queryError = categories.isError ? toApiError(categories.error) : null;

  return (
    <section className='space-y-6'>
      <header>
        <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
          Category Settings
        </p>
        <h1 className='font-headline text-3xl font-extrabold tracking-tight md:text-4xl'>
          Categories Management
        </h1>
        <p className='mt-2 text-text-secondary'>
          Define your income and expense categories for faster, cleaner
          transaction entry.
        </p>
      </header>

      <div className='grid gap-6 lg:grid-cols-[1.1fr_1fr]'>
        <article className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='font-headline text-xl font-bold'>Add Category</h2>
          <p className='mt-1 text-sm text-text-secondary'>
            Create a new category and assign its type.
          </p>

          <form onSubmit={onSubmit} className='mt-5 space-y-4'>
            <label className='block'>
              <span className='mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-text-muted'>
                Name
              </span>
              <input
                type='text'
                placeholder='e.g. Freelance, Groceries'
                {...form.register("name")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              />
              {form.formState.errors.name?.message ? (
                <span className='mt-1 block text-xs font-medium text-danger'>
                  {form.formState.errors.name.message}
                </span>
              ) : null}
            </label>

            <label className='block'>
              <span className='mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-text-muted'>
                Type
              </span>
              <select
                {...form.register("type")}
                className='w-full rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
              >
                <option value='1'>Income</option>
                <option value='2'>Expense</option>
              </select>
            </label>

            {mutationError ? (
              <ErrorState
                compact
                title='Cannot add category'
                message={mutationError}
              />
            ) : null}

            <button
              type='submit'
              disabled={createCategory.isPending}
              className='rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70'
            >
              {createCategory.isPending ? "Adding..." : "Add Category"}
            </button>
          </form>
        </article>

        <article className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <div className='flex items-center justify-between'>
            <h2 className='font-headline text-xl font-bold'>
              Existing Categories
            </h2>
            <span className='rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-text-secondary'>
              {(categories.data ?? []).length} total
            </span>
          </div>

          {categories.isLoading ? (
            <div className='mt-4'>
              <LoadingState
                compact
                title='Loading categories'
                message='Gathering income and expense groups.'
              />
            </div>
          ) : null}

          {queryError ? (
            <div className='mt-4'>
              <ErrorState
                compact
                title='Cannot load categories'
                message={queryError}
              />
            </div>
          ) : null}

          {categories.data ? (
            <div className='mt-5'>
              <div className='grid gap-4 pr-1 sm:grid-cols-2'>
                <CategoryListCard
                  title={categoryTypeLabel(1)}
                  items={incomeCategories.map((category) => category.name)}
                  accent='bg-emerald-50 text-emerald-700'
                />
                <CategoryListCard
                  title={categoryTypeLabel(2)}
                  items={expenseCategories.map((category) => category.name)}
                  accent='bg-rose-50 text-rose-700'
                />
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}

function CategoryListCard({
  title,
  items,
  accent,
}: {
  title: string;
  items: string[];
  accent: string;
}) {
  return (
    <section className='flex h-full max-h-[32vh] flex-col overflow-hidden rounded-xl border border-surface-border bg-surface-muted p-4 sm:max-h-[58vh]'>
      <div className='mb-3 flex items-center justify-between'>
        <h3 className='text-sm font-bold text-text-primary'>{title}</h3>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${accent}`}
        >
          {items.length}
        </span>
      </div>

      {items.length ? (
        <ul className='min-h-0 flex-1 space-y-2 overflow-y-auto pr-1'>
          {items.map((item) => (
            <li
              key={`${title}-${item}`}
              className='truncate rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary'
              title={item}
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          compact
          title={`No ${title.toLowerCase()} categories`}
          message={`Create a ${title.toLowerCase()} category to organize transactions.`}
        />
      )}
    </section>
  );
}
