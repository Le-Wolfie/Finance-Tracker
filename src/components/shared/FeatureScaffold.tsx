import { Link } from "react-router-dom";
import {
  ChartNoAxesCombined,
  CircleUserRound,
  PanelsTopLeft,
} from "lucide-react";

type FeatureScaffoldProps = {
  eyebrow?: string;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    to: string;
  };
};

export function FeatureScaffold({
  eyebrow,
  title,
  description,
  primaryAction,
}: FeatureScaffoldProps) {
  return (
    <section className='space-y-6'>
      <header className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          {eyebrow ? (
            <p className='mb-2 text-xs font-bold uppercase tracking-[0.18em] text-text-muted'>
              {eyebrow}
            </p>
          ) : null}
          <h1 className='font-headline text-4xl font-extrabold tracking-tight'>
            {title}
          </h1>
          <p className='mt-2 max-w-2xl text-text-secondary'>{description}</p>
        </div>

        {primaryAction ? (
          <Link
            to={primaryAction.to}
            className='rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90'
          >
            {primaryAction.label}
          </Link>
        ) : null}
      </header>

      <article className='grid gap-6 lg:grid-cols-[1fr_300px]'>
        <div className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h2 className='font-headline text-xl font-bold'>
            Implementation Queue
          </h2>
          <p className='mt-2 text-sm text-text-secondary'>
            This screen shell and navigation are ready. The feature-specific API
            wiring and interactions are implemented in the next phase with
            strict verification.
          </p>
          <div className='mt-6 grid gap-3 rounded-xl border border-surface-border bg-surface-muted p-5 sm:grid-cols-3'>
            <div className='rounded-lg bg-surface p-4 text-center'>
              <PanelsTopLeft className='mx-auto h-5 w-5 text-text-secondary' />
              <p className='mt-2 text-xs font-semibold text-text-secondary'>
                Layout
              </p>
            </div>
            <div className='rounded-lg bg-surface p-4 text-center'>
              <ChartNoAxesCombined className='mx-auto h-5 w-5 text-text-secondary' />
              <p className='mt-2 text-xs font-semibold text-text-secondary'>
                Data
              </p>
            </div>
            <div className='rounded-lg bg-surface p-4 text-center'>
              <CircleUserRound className='mx-auto h-5 w-5 text-text-secondary' />
              <p className='mt-2 text-xs font-semibold text-text-secondary'>
                Interactions
              </p>
            </div>
          </div>
        </div>

        <aside className='rounded-2xl border border-surface-border bg-surface p-6 shadow-soft'>
          <h3 className='font-headline text-lg font-bold'>Phase Note</h3>
          <p className='mt-2 text-sm text-text-secondary'>
            This page intentionally avoids unsupported feature controls and
            external imagery. Data and actions are added only when backend
            contracts are wired.
          </p>
          <div className='mt-5 flex h-16 w-16 items-center justify-center rounded-full border border-surface-border bg-surface-muted text-text-secondary'>
            <CircleUserRound className='h-8 w-8' />
          </div>
        </aside>
      </article>
    </section>
  );
}
