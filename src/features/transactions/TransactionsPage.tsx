import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/shared/QueryState";
import { toApiError } from "../../lib/api/client";
import { formatCurrency, formatDate } from "../../lib/format";
import {
  transactionTypeLabel,
  useCategoriesQuery,
  useDeleteTransactionMutation,
  useTransactionsQuery,
} from "./api";

export function TransactionsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const queryClient = useQueryClient();
  const categories = useCategoriesQuery();

  const filter = useMemo(
    () => ({
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      categoryId: categoryId || undefined,
      page,
      pageSize,
    }),
    [categoryId, from, page, to],
  );

  const transactions = useTransactionsQuery(filter);
  const deleteMutation = useDeleteTransactionMutation();

  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((item) => [item.id, item.name])),
    [categories.data],
  );

  const totalPages = transactions.data
    ? Math.max(
        1,
        Math.ceil(transactions.data.totalCount / transactions.data.pageSize),
      )
    : 1;

  const handleDelete = async (transactionId: string) => {
    await deleteMutation.mutateAsync(transactionId);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
    ]);
  };

  return (
    <section className='space-y-6'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
            Ledger
          </p>
          <h1 className='font-headline text-4xl font-extrabold tracking-tight'>
            Transaction Ledger
          </h1>
          <p className='mt-2 text-text-secondary'>
            Review and manage income, expense, and transfer activity.
          </p>
        </div>
        <Link
          to='/transactions/new'
          className='rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90'
        >
          New Transaction
        </Link>
      </header>

      <section className='rounded-2xl border border-surface-border bg-surface p-5 shadow-soft'>
        <div className='grid gap-3 md:grid-cols-4'>
          <input
            type='date'
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
          />
          <input
            type='date'
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
          />
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value);
              setPage(1);
            }}
            className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
          >
            <option value=''>All Categories</option>
            {(categories.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button
            type='button'
            onClick={() => {
              setFrom("");
              setTo("");
              setCategoryId("");
              setPage(1);
            }}
            className='rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-text-secondary transition hover:text-text-primary'
          >
            Clear Filters
          </button>
        </div>
      </section>

      {transactions.isLoading ? (
        <LoadingState
          title='Loading transactions'
          message='Fetching your latest ledger activity.'
        />
      ) : null}
      {transactions.isError ? (
        <ErrorState
          title='Transactions unavailable'
          message={toApiError(transactions.error)}
        />
      ) : null}

      {transactions.data ? (
        <section className='rounded-2xl border border-surface-border bg-surface shadow-soft'>
          {transactions.data.items.length === 0 ? (
            <div className='p-6'>
              <EmptyState
                title='No transactions found'
                message='Try adjusting filters or add a new transaction to populate this ledger.'
              />
            </div>
          ) : (
            <>
              <div className='overflow-x-auto'>
                <table className='min-w-full text-sm'>
                  <thead>
                    <tr className='border-b border-surface-border bg-surface-muted text-left text-xs uppercase tracking-[0.14em] text-text-muted'>
                      <th className='px-4 py-3'>Date</th>
                      <th className='px-4 py-3'>Description</th>
                      <th className='px-4 py-3'>Type</th>
                      <th className='px-4 py-3'>Category</th>
                      <th className='px-4 py-3'>Amount</th>
                      <th className='px-4 py-3'>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.data.items.map((item) => (
                      <tr
                        key={item.id}
                        className='border-b border-surface-border'
                      >
                        <td className='px-4 py-3'>{formatDate(item.date)}</td>
                        <td className='px-4 py-3'>{item.description || "-"}</td>
                        <td className='px-4 py-3'>
                          {transactionTypeLabel(item.type)}
                        </td>
                        <td className='px-4 py-3'>
                          {item.categoryId
                            ? (categoryById.get(item.categoryId) ?? "Unknown")
                            : "-"}
                        </td>
                        <td
                          className={`px-4 py-3 font-semibold ${item.type === 1 ? "text-success" : "text-danger"}`}
                        >
                          {item.type === 1 ? "+" : "-"}
                          {formatCurrency(item.amount)}
                        </td>
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-2'>
                            <Link
                              to={`/transactions/${item.id}/edit`}
                              state={{ transaction: item }}
                              className='rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:text-text-primary'
                            >
                              Edit
                            </Link>
                            <button
                              type='button'
                              onClick={() => handleDelete(item.id)}
                              disabled={deleteMutation.isPending}
                              className='rounded-lg border border-surface-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-secondary transition hover:text-danger disabled:opacity-60'
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className='flex items-center justify-between px-4 py-3 text-sm'>
                <span className='text-text-secondary'>
                  Page {transactions.data.page} of {totalPages} (
                  {transactions.data.totalCount} total)
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
          )}
        </section>
      ) : null}
    </section>
  );
}
