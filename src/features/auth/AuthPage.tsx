import { useMutation } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  Landmark,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { login, register } from "./api";
import { toApiError } from "../../lib/api/client";
import { useAuth } from "../../lib/auth/useAuth";
import { useNavigate } from "react-router-dom";

const authSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password is too long."),
});

type AuthFormValues = z.infer<typeof authSchema>;

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { login: setAuth } = useAuth();

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    mode: "onBlur",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const mutation = useMutation<
    { token: string; expiresAt: string },
    Error,
    AuthFormValues
  >({
    mutationFn: async (payload: AuthFormValues) => {
      const authPayload = {
        email: payload.email.trim(),
        password: payload.password,
      };

      return mode === "login" ? login(authPayload) : register(authPayload);
    },
    onSuccess: (data) => {
      setSubmissionError(null);
      setAuth(data.token, data.expiresAt, form.getValues("email").trim());
      navigate("/dashboard", { replace: true });
    },
    onError: (error) => {
      setSubmissionError(toApiError(error));
    },
  });

  const submitHandler = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <main className='flex min-h-screen bg-background'>
      <section className='relative hidden w-1/2 flex-col justify-between overflow-hidden bg-editorial p-12 text-white lg:flex'>
        <div className='relative z-10 flex items-center gap-3'>
          <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-white'>
            <Landmark className='h-6 w-6 text-primary' />
          </div>
          <span className='font-headline text-2xl font-extrabold tracking-tight'>
            Finance Tracker
          </span>
        </div>

        <div className='relative z-10 max-w-xl space-y-6'>
          <h1 className='font-headline text-5xl font-extrabold leading-tight tracking-tight'>
            The Precision Ledger for modern wealth.
          </h1>
          <p className='text-xl font-medium text-blue-100/90'>
            Experience an authoritative interface designed for high-net-worth
            clarity and absolute fiscal control.
          </p>
          <div className='grid grid-cols-2 gap-4 pt-8'>
            <div className='rounded-xl border border-white/15 bg-white/5 p-6 backdrop-blur-md'>
              <ShieldCheck className='mb-3 h-6 w-6 text-emerald-300' />
              <h3 className='font-semibold'>Bank-Grade</h3>
              <p className='text-sm text-blue-100/70'>Encrypted ledger tech</p>
            </div>
            <div className='rounded-xl border border-white/15 bg-white/5 p-6 backdrop-blur-md'>
              <Sparkles className='mb-3 h-6 w-6 text-emerald-300' />
              <h3 className='font-semibold'>Analytics Ready</h3>
              <p className='text-sm text-blue-100/70'>Predictive cashflow</p>
            </div>
          </div>
        </div>

        <div className='relative z-10 flex items-center gap-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-100/50'>
          <span>Finance Tracker</span>
          <span className='h-1 w-1 rounded-full bg-blue-100/50' />
          <span>Global Asset Mgmt</span>
        </div>

        <div className='absolute inset-0 opacity-15'>
          <div className='h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(84,132,255,.45),transparent_32%),radial-gradient(circle_at_75%_35%,rgba(111,251,190,.25),transparent_30%),radial-gradient(circle_at_50%_70%,rgba(255,255,255,.15),transparent_45%)]' />
        </div>
      </section>

      <section className='flex w-full items-center justify-center bg-surface px-6 py-10 lg:w-1/2 lg:px-20'>
        <div className='w-full max-w-md'>
          <div className='mb-10 lg:hidden'>
            <div className='mb-8 flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white'>
                <Landmark className='h-6 w-6' />
              </div>
              <span className='font-headline text-2xl font-extrabold tracking-tight'>
                Finance Tracker
              </span>
            </div>
          </div>

          <div className='mb-8'>
            <h2 className='font-headline text-4xl font-extrabold tracking-tight'>
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className='mt-2 text-text-secondary'>
              {mode === "login"
                ? "Access your global portfolio with precision."
                : "Set up your Precision Ledger workspace."}
            </p>
          </div>

          <div className='mb-8 flex rounded-xl bg-surface-muted p-1'>
            <button
              type='button'
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${mode === "login" ? "bg-editorial text-white shadow-soft" : "text-text-secondary hover:text-text-primary"}`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type='button'
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${mode === "register" ? "bg-editorial text-white shadow-soft" : "text-text-secondary hover:text-text-primary"}`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          <form className='space-y-5' onSubmit={submitHandler}>
            <div>
              <label
                htmlFor='email'
                className='mb-1.5 block px-1 text-[11px] font-extrabold uppercase tracking-[0.2em] text-text-muted'
              >
                Email Address
              </label>
              <div className='relative'>
                <Mail className='pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted' />
                <input
                  id='email'
                  type='email'
                  placeholder='name@firm.com'
                  className='w-full rounded-xl border border-surface-border bg-surface px-4 py-3.5 pl-12 font-medium outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className='mt-1 px-1 text-sm text-danger'>
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <div className='mb-1.5 flex items-center justify-between px-1'>
                <label
                  htmlFor='password'
                  className='text-[11px] font-extrabold uppercase tracking-[0.2em] text-text-muted'
                >
                  Password
                </label>
              </div>
              <div className='relative'>
                <Lock className='pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted' />
                <input
                  id='password'
                  type={showPassword ? "text" : "password"}
                  placeholder='••••••••••••'
                  className='w-full rounded-xl border border-surface-border bg-surface px-4 py-3.5 pl-12 pr-12 font-medium outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
                  {...form.register("password")}
                />
                <button
                  type='button'
                  className='absolute right-4 top-1/2 -translate-y-1/2 text-text-muted transition hover:text-text-primary'
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className='h-5 w-5' />
                  ) : (
                    <Eye className='h-5 w-5' />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className='mt-1 px-1 text-sm text-danger'>
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {submissionError && (
              <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-danger'>
                {submissionError}
              </div>
            )}

            <button
              type='submit'
              disabled={mutation.isPending}
              className='flex w-full items-center justify-center gap-2 rounded-xl bg-editorial px-4 py-4 text-base font-bold text-white shadow-soft transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70'
            >
              {mutation.isPending
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In to Ledger"
                  : "Create Ledger Account"}
              <ArrowRight className='h-4 w-4' />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
