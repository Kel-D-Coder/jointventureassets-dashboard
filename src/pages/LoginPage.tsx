import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import { useLogin, useSession } from "@/hooks/useAuth";
import { DEMO_ADMIN } from "@/lib/api";
import { websiteUrl } from "@/data/site";
import { Field, inputClass } from "@/ui";

export default function LoginPage() {
  const session = useSession();
  const { login, loading } = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (session) return <Navigate to={from} replace />;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't sign in. Try again.");
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_ADMIN.email);
    setPassword(DEMO_ADMIN.password);
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="theme-dark relative hidden overflow-hidden bg-ink lg:block">
        <img src="/placeholders/tower-02.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
        <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/60 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <img src="/logo.png" alt="Joint Venture Assets" width={500} height={500} className="h-20 w-20 object-contain" />
          <div>
            <p className="label text-gold">Admin console</p>
            <p className="mt-3 max-w-md font-serif text-4xl leading-tight text-fg">
              Review requests, publish listings and keep every partnership moving.
            </p>
          </div>
        </div>
      </div>

      <div className="grid place-items-center px-5 py-10">
        <div className="w-full max-w-sm">
          <img src="/logo.png" alt="" width={500} height={500} className="theme-dark mx-auto h-20 w-20 rounded-xl bg-ink object-contain p-2 lg:hidden" />

          <h1 className="mt-6 text-3xl text-fg lg:mt-0">Sign in</h1>
          <p className="mt-2 text-sm text-muted">Joint Venture Assets admin dashboard</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Field label="Email">
              <input
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${inputClass} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-muted hover:text-fg focus-visible:text-fg focus-visible:outline-none"
                >
                  {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                </button>
              </div>
            </Field>

            {error ? (
              <p role="alert" className="rounded-lg border border-danger/20 bg-danger/8 px-3.5 py-2.5 text-sm font-medium text-danger">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-ink py-3 text-sm font-bold text-white transition-colors hover:bg-ink/85 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 rounded-xl border border-fg/10 bg-raised p-4 text-sm text-muted">
            Sign in with your JVA admin account. The first sign-in can take up to a minute while the server wakes up.
          </p>

          <div className="mt-4 rounded-xl border border-gold/30 bg-gold-soft/50 p-4 text-sm">
            <p className="font-semibold text-fg">Testing with the demo login</p>
            <p className="mt-1 text-muted">
              {DEMO_ADMIN.email} / {DEMO_ADMIN.password}
            </p>
            <button type="button" onClick={fillDemo} className="mt-2 text-sm font-semibold text-gold-deep underline underline-offset-4">
              Fill in the demo login
            </button>
          </div>

          <p className="mt-6 text-xs text-muted">
            <a href={websiteUrl()} className="font-semibold hover:text-fg">
              ← Back to the website
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
