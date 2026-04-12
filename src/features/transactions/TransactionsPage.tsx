import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    description: string;
    amount: number;
  } | null>(null);
  const pageSize = 10;
  const isSearching = searchTerm.trim().length > 0;
  const queryPage = isSearching ? 1 : page;
  const queryPageSize = isSearching ? 100 : pageSize;

  const queryClient = useQueryClient();
  const categories = useCategoriesQuery();

  const filter = useMemo(
    () => ({
      from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
      categoryId: categoryId || undefined,
      page: queryPage,
      pageSize: queryPageSize,
    }),
    [categoryId, from, queryPage, queryPageSize, to],
  );

  const isInvalidDateRange = Boolean(from && to && from > to);

  const transactions = useTransactionsQuery(filter, !isInvalidDateRange);
  const deleteMutation = useDeleteTransactionMutation();

  const categoryById = useMemo(
    () => new Map((categories.data ?? []).map((item) => [item.id, item.name])),
    [categories.data],
  );

  const filteredItems = useMemo(() => {
    if (!transactions.data) {
      return [];
    }

    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return transactions.data.items;
    }

    return transactions.data.items.filter((item) => {
      const categoryName = item.categoryId
        ? (categoryById.get(item.categoryId) ?? "unknown")
        : "uncategorized";

      const haystack = [
        item.description,
        categoryName,
        transactionTypeLabel(item.type),
        formatDate(item.date),
        String(item.amount),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [transactions.data, searchTerm, categoryById]);

  const totalPages = useMemo(() => {
    if (!transactions.data) {
      return 1;
    }

    if (isSearching) {
      return Math.max(1, Math.ceil(filteredItems.length / pageSize));
    }

    return Math.max(
      1,
      Math.ceil(transactions.data.totalCount / transactions.data.pageSize),
    );
  }, [filteredItems.length, isSearching, pageSize, transactions.data]);

  const paginatedItems = useMemo(() => {
    if (!isSearching) {
      return filteredItems;
    }

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredItems.slice(start, end);
  }, [filteredItems, isSearching, page, pageSize]);

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
      <header className='flex flex-col gap-4 md:flex-row md:items-start md:justify-between'>
        <div>
          <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
            Ledger
          </p>
          <h1 className='font-headline text-3xl font-extrabold tracking-tight md:text-4xl'>
            Transaction Ledger
          </h1>
          <p className='mt-2 text-text-secondary'>
            Review and manage income, expense, and transfer activity.
          </p>
        </div>
        <Link
          to='/transactions/new'
          className='w-full rounded-xl bg-primary px-5 py-3 text-center text-sm font-semibold text-white transition hover:opacity-90 sm:w-auto'
        >
          New Transaction
        </Link>
      </header>

      <section className='rounded-2xl border border-surface-border bg-surface p-5 shadow-soft'>
        <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-5'>
          <input
            type='date'
            value={from}
            title='From date: show transactions on or after this date.'
            aria-label='From date filter'
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
          />
          <input
            type='date'
            value={to}
            title='To date: show transactions on or before this date.'
            aria-label='To date filter'
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
            className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
          />
          <select
            value={categoryId}
            title='Category filter: show only transactions for the selected category.'
            aria-label='Category filter'
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
          <input
            type='search'
            value={searchTerm}
            title='Search transactions by description, type, category, date, or amount.'
            aria-label='Transaction search'
            placeholder='Search transactions...'
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
          />
          <button
            type='button'
            title='Reset date and category filters.'
            onClick={() => {
              setFrom("");
              setTo("");
              setCategoryId("");
              setSearchTerm("");
              setPage(1);
            }}
            className='rounded-xl border border-surface-border bg-surface px-3 py-2 text-sm font-semibold text-text-secondary transition hover:text-text-primary'
          >
            Clear Filters
          </button>
        </div>
      </section>

      {isInvalidDateRange ? (
        <ErrorState
          title='Invalid date range'
          message='From date must be on or before To date. Adjust the dates and try again.'
        />
      ) : null}

      {!isInvalidDateRange && transactions.isLoading ? (
        <LoadingState
          title='Loading transactions'
          message='Fetching your latest ledger activity.'
        />
      ) : null}
      {!isInvalidDateRange && transactions.isError ? (
        <ErrorState
          title='Transactions unavailable'
          message={toApiError(transactions.error)}
        />
      ) : null}

      {!isInvalidDateRange && transactions.data ? (
        <section className='rounded-2xl border border-surface-border bg-surface shadow-soft'>
          {filteredItems.length === 0 ? (
            <div className='p-6'>
              <EmptyState
                title={
                  searchTerm
                    ? "No matching transactions"
                    : "No transactions found"
                }
                message={
                  searchTerm
                    ? "No transactions match your search. Try another term or clear filters."
                    : "Try adjusting filters or add a new transaction to populate this ledger."
                }
              />
            </div>
          ) : (
            <>
              <div className='space-y-3 p-4 md:hidden'>
                {paginatedItems.map((item) => (
                  <article
                    key={item.id}
                    className='rounded-xl border border-surface-border bg-surface-muted p-4'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-semibold'>
                          {item.description || "-"}
                        </p>
                        <p className='mt-1 text-xs text-text-secondary'>
                          {formatDate(item.date)}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-semibold ${item.type === 1 ? "text-success" : "text-danger"}`}
                      >
                        {item.type === 1 ? "+" : "-"}
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <div className='mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary'>
                      <span>{transactionTypeLabel(item.type)}</span>
                      <span className='truncate text-right'>
                        {item.categoryId
                          ? (categoryById.get(item.categoryId) ?? "Unknown")
                          : "-"}
                      </span>
                    </div>
                    <div className='mt-3 grid grid-cols-2 gap-2'>
                      <Link
                        to={`/transactions/${item.id}/edit`}
                        state={{ transaction: item }}
                        className='rounded-lg border border-surface-border bg-surface px-3 py-2 text-center text-xs font-semibold text-text-secondary transition hover:text-text-primary'
                      >
                        Edit
                      </Link>
                      <button
                        type='button'
                        onClick={() =>
                          setPendingDelete({
                            id: item.id,
                            description: item.description || "(No description)",
                            amount: item.amount,
                          })
                        }
                        disabled={deleteMutation.isPending}
                        className='rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition hover:text-danger disabled:opacity-60'
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <div className='hidden overflow-x-auto md:block'>
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
                    {paginatedItems.map((item) => (
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
                              onClick={() =>
                                setPendingDelete({
                                  id: item.id,
                                  description:
                                    item.description || "(No description)",
                                  amount: item.amount,
                                })
                              }
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

              <div className='flex flex-col gap-3 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between'>
                <span className='text-text-secondary'>
                  Page {page} of {totalPages} ({filteredItems.length} shown)
                </span>
                {totalPages > 1 ? (
                  <div className='grid grid-cols-2 gap-2 md:flex'>
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
          )}
        </section>
      ) : null}

      {pendingDelete && typeof document !== "undefined"
        ? createPortal(
            <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4'>
              <section className='w-full max-w-md rounded-2xl border border-surface-border bg-surface p-5 shadow-2xl'>
                <h2 className='font-headline text-xl font-bold'>
                  Delete Transaction?
                </h2>
                <p className='mt-2 text-sm text-text-secondary'>
                  This action cannot be undone.
                </p>
                <div className='mt-4 rounded-xl border border-surface-border bg-surface-muted p-3 text-sm'>
                  <p className='font-semibold'>{pendingDelete.description}</p>
                  <p className='text-text-secondary'>
                    {formatCurrency(pendingDelete.amount)}
                  </p>
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
                    onClick={async () => {
                      await handleDelete(pendingDelete.id);
                      setPendingDelete(null);
                    }}
                    disabled={deleteMutation.isPending}
                    className='rounded-lg bg-danger px-3 py-2 text-sm font-semibold text-white disabled:opacity-70'
                  >
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
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
