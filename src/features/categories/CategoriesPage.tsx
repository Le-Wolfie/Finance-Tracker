import { createPortal } from "react-dom";
import { useMemo, useState } from "react";
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
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
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
  const updateCategory = useUpdateCategoryMutation();
  const deleteCategory = useDeleteCategoryMutation();
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

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
    const payload = {
      name: values.name,
      type: Number(values.type) as 1 | 2,
    };

    if (editingCategoryId) {
      await updateCategory.mutateAsync({ id: editingCategoryId, payload });
    } else {
      await createCategory.mutateAsync(payload);
    }

    await queryClient.invalidateQueries({ queryKey: ["categories"] });
    form.reset({ name: "", type: values.type });
    setEditingCategoryId(null);
  });

  const mutationError = createCategory.isError
    ? toApiError(createCategory.error)
    : updateCategory.isError
      ? toApiError(updateCategory.error)
      : deleteCategory.isError
        ? toApiError(deleteCategory.error)
        : null;
  const queryError = categories.isError ? toApiError(categories.error) : null;

  const isSaving = createCategory.isPending || updateCategory.isPending;

  const beginEdit = (id: string, name: string, type: 1 | 2) => {
    setEditingCategoryId(id);
    form.reset({ name, type: String(type) as "1" | "2" });
  };

  const cancelEdit = () => {
    setEditingCategoryId(null);
    form.reset({ name: "", type: "2" });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    await deleteCategory.mutateAsync(pendingDelete.id);
    await queryClient.invalidateQueries({ queryKey: ["categories"] });
    if (editingCategoryId === pendingDelete.id) {
      cancelEdit();
    }
    setPendingDelete(null);
  };

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
          <h2 className='font-headline text-xl font-bold'>
            {editingCategoryId ? "Edit Category" : "Add Category"}
          </h2>
          <p className='mt-1 text-sm text-text-secondary'>
            {editingCategoryId
              ? "Update category details and save your changes."
              : "Create a new category and assign its type."}
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
                title={
                  editingCategoryId
                    ? "Cannot update category"
                    : "Cannot add category"
                }
                message={mutationError}
              />
            ) : null}

            <div className='flex flex-wrap items-center gap-2'>
              <button
                type='submit'
                disabled={isSaving}
                className='rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70'
              >
                {isSaving
                  ? editingCategoryId
                    ? "Saving..."
                    : "Adding..."
                  : editingCategoryId
                    ? "Save Changes"
                    : "Add Category"}
              </button>
              {editingCategoryId ? (
                <button
                  type='button'
                  onClick={cancelEdit}
                  className='rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:text-text-primary'
                >
                  Cancel
                </button>
              ) : null}
            </div>
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
                  items={incomeCategories}
                  onEdit={beginEdit}
                  onDelete={(id, name) => setPendingDelete({ id, name })}
                  accent='bg-emerald-50 text-emerald-700'
                  disableActions={isSaving || deleteCategory.isPending}
                />
                <CategoryListCard
                  title={categoryTypeLabel(2)}
                  items={expenseCategories}
                  onEdit={beginEdit}
                  onDelete={(id, name) => setPendingDelete({ id, name })}
                  accent='bg-rose-50 text-rose-700'
                  disableActions={isSaving || deleteCategory.isPending}
                />
              </div>
            </div>
          ) : null}
        </article>
      </div>

      {pendingDelete && typeof document !== "undefined"
        ? createPortal(
            <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4'>
              <section className='w-full max-w-md rounded-2xl border border-surface-border bg-surface p-5 shadow-2xl'>
                <h2 className='font-headline text-xl font-bold'>
                  Delete Category?
                </h2>
                <p className='mt-2 text-sm text-text-secondary'>
                  This action cannot be undone.
                </p>
                <div className='mt-4 rounded-xl border border-surface-border bg-surface-muted p-3 text-sm'>
                  <p className='font-semibold'>{pendingDelete.name}</p>
                </div>
                <div className='mt-5 flex items-center justify-end gap-2'>
                  <button
                    type='button'
                    onClick={() => setPendingDelete(null)}
                    className='rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-text-secondary'
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    onClick={confirmDelete}
                    disabled={deleteCategory.isPending}
                    className='rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-70'
                  >
                    {deleteCategory.isPending ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </section>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function CategoryListCard({
  title,
  items,
  accent,
  onEdit,
  onDelete,
  disableActions,
}: {
  title: string;
  items: Array<{ id: string; name: string; type: 1 | 2 }>;
  accent: string;
  onEdit: (id: string, name: string, type: 1 | 2) => void;
  onDelete: (id: string, name: string) => void;
  disableActions: boolean;
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
              key={item.id}
              className='rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary'
              title={item.name}
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='truncate'>{item.name}</span>
                <div className='flex items-center gap-1'>
                  <button
                    type='button'
                    disabled={disableActions}
                    onClick={() => onEdit(item.id, item.name, item.type)}
                    className='rounded-md border border-surface-border px-2 py-1 text-xs font-semibold transition hover:text-text-primary disabled:opacity-60'
                  >
                    Edit
                  </button>
                  <button
                    type='button'
                    disabled={disableActions}
                    onClick={() => onDelete(item.id, item.name)}
                    className='rounded-md border border-surface-border px-2 py-1 text-xs font-semibold transition hover:text-danger disabled:opacity-60'
                  >
                    Delete
                  </button>
                </div>
              </div>
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
