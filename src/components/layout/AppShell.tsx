import {
  BarChart3,
  CalendarClock,
  ChartPie,
  Goal,
  LayoutDashboard,
  PiggyBank,
  ReceiptText,
  Settings,
  Wallet,
  Landmark,
  Plus,
  LogOut,
  User,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../lib/auth/useAuth";
import { cn } from "../../lib/utils";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/categories", label: "Categories", icon: ChartPie },
  { to: "/transactions", label: "Transactions", icon: ReceiptText },
  { to: "/budgets", label: "Budgets", icon: Goal },
  { to: "/savings-goals", label: "Savings Goals", icon: PiggyBank },
  { to: "/recurring", label: "Recurring", icon: CalendarClock },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

type SidebarContentProps = {
  email: string | null;
  logout: () => void;
  onNavigate?: () => void;
};

function SidebarContent({ email, logout, onNavigate }: SidebarContentProps) {
  return (
    <>
      <Link
        to='/dashboard'
        onClick={onNavigate}
        className='mb-8 flex items-center gap-3'
      >
        <span className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white'>
          <Landmark className='h-5 w-5' />
        </span>
        <span>
          <strong className='font-headline block text-lg font-extrabold'>
            Finance Tracker
          </strong>
        </span>
      </Link>

      <nav className='space-y-2'>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-semibold transition",
                  isActive
                    ? "bg-surface-muted text-primary"
                    : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
                )
              }
            >
              <Icon className='h-5 w-5' />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <Link
        to='/transactions/new'
        onClick={onNavigate}
        className='mt-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90'
      >
        <Plus className='h-4 w-4' /> Add Transaction
      </Link>

      <div className='mt-4 rounded-xl border border-surface-border bg-surface-muted p-3'>
        <div className='flex items-center gap-3'>
          <span className='flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface text-text-secondary'>
            <User className='h-5 w-5' />
          </span>
          <div className='min-w-0 flex-1'>
            <p
              className='truncate text-sm font-semibold'
              title={email ?? "Signed-in User"}
            >
              {email ?? "Signed-in User"}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            onNavigate?.();
          }}
          type='button'
          className='mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition hover:text-text-primary'
        >
          <LogOut className='h-4 w-4' /> Logout
        </button>
      </div>
    </>
  );
}

export function AppShell({ children }: AppShellProps) {
  const { email, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className='min-h-screen bg-background text-text-primary'>
      {isMobileMenuOpen ? (
        <button
          type='button'
          aria-label='Close navigation menu'
          onClick={() => setIsMobileMenuOpen(false)}
          className='fixed inset-0 z-30 bg-black/50 lg:hidden'
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] border-r border-surface-border bg-surface transition-transform duration-200 lg:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className='flex h-full flex-col p-5'>
          <div className='mb-3 flex justify-end'>
            <button
              type='button'
              aria-label='Close navigation menu'
              onClick={() => setIsMobileMenuOpen(false)}
              className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface text-text-secondary'
            >
              <X className='h-4 w-4' />
            </button>
          </div>
          <SidebarContent
            email={email}
            logout={logout}
            onNavigate={() => setIsMobileMenuOpen(false)}
          />
        </div>
      </aside>

      <aside className='fixed left-0 top-0 hidden h-screen w-64 border-r border-surface-border bg-surface lg:block'>
        <div className='flex h-full flex-col p-5'>
          <SidebarContent email={email} logout={logout} />
        </div>
      </aside>

      <div className='lg:ml-64'>
        <header className='sticky top-0 z-20 border-b border-surface-border bg-surface/95 backdrop-blur'>
          <div className='mx-auto flex h-16 max-w-[1400px] items-center px-4 sm:px-6 lg:px-8'>
            <button
              type='button'
              aria-label='Open navigation menu'
              onClick={() => setIsMobileMenuOpen(true)}
              className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border bg-surface text-text-secondary lg:hidden'
            >
              <Menu className='h-4 w-4' />
            </button>
            <div className='mx-auto flex w-full max-w-2xl items-center justify-center gap-3'>
              <p className='font-headline w-full text-center text-lg font-black uppercase tracking-[0.22em]'>
                Finance Tracker
              </p>
            </div>
            <div className='h-9 w-9 lg:hidden' />
          </div>
        </header>

        <main className='mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8'>
          {children}
        </main>
      </div>
    </div>
  );
}
