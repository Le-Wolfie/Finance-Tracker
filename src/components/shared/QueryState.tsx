import type { ReactNode } from "react";
import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";

type StateProps = {
  title?: string;
  message: string;
  action?: ReactNode;
  compact?: boolean;
};

export function LoadingState({
  title = "Loading",
  message,
  compact = false,
}: Omit<StateProps, "action">) {
  return (
    <div
      className={[
        "rounded-xl border border-surface-border bg-surface-muted text-text-secondary",
        compact ? "px-4 py-3" : "px-5 py-4",
      ].join(" ")}
      role='status'
      aria-live='polite'
    >
      <div className='flex items-start gap-3'>
        <LoaderCircle className='mt-0.5 h-4 w-4 animate-spin' />
        <div>
          <p className='text-sm font-semibold text-text-primary'>{title}</p>
          <p className='text-sm'>{message}</p>
        </div>
      </div>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  action,
  compact = false,
}: StateProps) {
  return (
    <div
      className={[
        "rounded-xl border border-red-200 bg-red-50 text-danger",
        compact ? "px-4 py-3" : "px-5 py-4",
      ].join(" ")}
      role='alert'
    >
      <div className='flex items-start gap-3'>
        <AlertTriangle className='mt-0.5 h-4 w-4' />
        <div className='space-y-2'>
          <p className='text-sm font-semibold'>{title}</p>
          <p className='text-sm'>{message}</p>
          {action ? <div>{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title = "No data yet",
  message,
  action,
  compact = false,
}: StateProps) {
  return (
    <div
      className={[
        "rounded-xl border border-dashed border-surface-border bg-surface-muted text-text-secondary",
        compact ? "px-4 py-3" : "px-5 py-4",
      ].join(" ")}
    >
      <div className='flex items-start gap-3'>
        <Inbox className='mt-0.5 h-4 w-4' />
        <div className='space-y-2'>
          <p className='text-sm font-semibold text-text-primary'>{title}</p>
          <p className='text-sm'>{message}</p>
          {action ? <div>{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
