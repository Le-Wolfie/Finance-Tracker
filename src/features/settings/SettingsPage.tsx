import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ErrorState } from "../../components/shared/QueryState";
import { toApiError } from "../../lib/api/client";
import { monthLabel } from "../../lib/format";
import { useAuth } from "../../lib/auth/useAuth";
import { useRunBudgetRolloverMutation } from "../budgets/api";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const runRollover = useRunBudgetRolloverMutation();

  const handleRunRollover = async () => {
    await runRollover.mutateAsync({ year, month });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["budgets"] }),
      queryClient.invalidateQueries({ queryKey: ["reports"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  return (
    <section className='space-y-6'>
      <header>
        <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
          Preferences
        </p>
        <h1 className='font-headline text-3xl font-extrabold tracking-tight md:text-4xl'>
          Settings
        </h1>
        <p className='mt-2 text-text-secondary'>
          Operational controls tied to supported backend capabilities.
        </p>
      </header>

      <div className='grid gap-6 md:grid-cols-[1fr_1fr]'>
        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='mb-4 font-headline text-xl font-bold'>
            Monthly Rollover Operation
          </h2>
          <p className='mb-4 text-sm text-text-secondary'>
            Trigger budget rollover manually for {monthLabel(year, month)}.
          </p>

          <div className='grid gap-3 sm:grid-cols-2'>
            <select
              value={month}
              onChange={(event) => setMonth(Number(event.target.value))}
              className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map(
                (value) => (
                  <option key={value} value={value}>
                    {new Date(2000, value - 1, 1).toLocaleDateString("en-EG", {
                      month: "long",
                    })}
                  </option>
                ),
              )}
            </select>

            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className='rounded-xl border border-surface-border bg-surface-muted px-3 py-2 text-sm'
            >
              {[
                now.getFullYear() - 1,
                now.getFullYear(),
                now.getFullYear() + 1,
              ].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>

          {runRollover.isError ? (
            <div className='mt-4'>
              <ErrorState
                compact
                title='Rollover failed'
                message={toApiError(runRollover.error)}
              />
            </div>
          ) : null}

          <button
            type='button'
            onClick={handleRunRollover}
            disabled={runRollover.isPending}
            className='mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-70 sm:w-auto'
          >
            {runRollover.isPending ? "Running..." : "Run Budget Rollover"}
          </button>

          {runRollover.data ? (
            <div className='mt-4 rounded-xl border border-surface-border bg-surface-muted p-3 text-sm'>
              <p>
                Processed:{" "}
                <span className='font-semibold'>
                  {runRollover.data.processedCount}
                </span>
              </p>
              <p>
                Skipped:{" "}
                <span className='font-semibold'>
                  {runRollover.data.skippedCount}
                </span>
              </p>
            </div>
          ) : null}
        </section>

        <section className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='mb-4 font-headline text-xl font-bold'>
            Workspace Actions
          </h2>
          <div className='space-y-3'>
            <Link
              to='/budgets/templates'
              className='block rounded-xl border border-surface-border bg-surface-muted px-4 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface'
            >
              Manage Budget Templates
            </Link>
            <Link
              to='/recurring'
              className='block rounded-xl border border-surface-border bg-surface-muted px-4 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface'
            >
              Review Recurring Automations
            </Link>
            <Link
              to='/savings-goals'
              className='block rounded-xl border border-surface-border bg-surface-muted px-4 py-3 text-sm font-semibold text-text-primary transition hover:bg-surface'
            >
              Open Savings Goals
            </Link>
          </div>

          <div className='mt-6 rounded-xl border border-surface-border bg-surface-muted p-4'>
            <p className='text-sm text-text-secondary'>Session</p>
            <button
              type='button'
              onClick={logout}
              className='mt-3 w-full rounded-xl border border-surface-border bg-surface px-4 py-2.5 text-sm font-semibold text-text-secondary transition hover:text-danger sm:w-auto'
            >
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
