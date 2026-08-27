import { useMemo, useState, type ReactNode } from "react"
import { type View } from "../App"
import { ArrowLeftIcon, BoltIcon, CheckCircleIcon, ProjectIcon, ShieldLockIcon } from "../components/icons"

type Mode = "signin" | "signup"

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string
  id: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function TextInput({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled,
}: {
  id: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  disabled?: boolean
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
      spellCheck={false}
      autoCapitalize="none"
      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50 disabled:text-gray-400"
    />
  )
}

export default function LoginPage({
  navigate,
  onLogin,
  initialMode = "signin",
}: {
  navigate: (view: View) => void
  onLogin: (token?: string, remember?: boolean) => Promise<void> | void
  initialMode?: Mode
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [serverError, setServerError] = useState("")
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const errors = useMemo(() => {
    const next: Record<string, string> = {}
    if (touched.email && !/\S+@\S+\.\S+/.test(email)) next.email = "Enter a valid email address."
    if (touched.password && password.length < 8) next.password = "Use at least 8 characters."
    if (mode === "signup" && touched.name && name.trim().length < 2) next.name = "Enter your full name."
    return next
  }, [email, password, name, touched, mode])

  async function submitAuth(action: "login" | "register") {
    const response = await fetch(`/api/auth/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        action === "login"
          ? { email, password }
          : { name, email, password },
      ),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      throw new Error(payload?.error?.message ?? "Authentication failed")
    }

    return payload?.data?.token as string | undefined
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched({ email: true, password: true, name: true })
    setServerError("")

    if (Object.keys(errors).length > 0) return

    setLoading(true)
    try {
      const token = await submitAuth(mode === "signin" ? "login" : "register")
      await onLogin(token, rememberMe)
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  const PreviewPanel = () => (
    <div
      className="hidden lg:flex lg:w-[52%] flex-col relative overflow-hidden"
      style={{
        background: "linear-gradient(150deg, #312e9e 0%, #4f46e5 42%, #7c3aed 100%)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at center, rgba(255,255,255,0.08) 1px, transparent 1.5px)",
          backgroundSize: "26px 26px",
        }}
      />
        <div className="relative px-10 pt-10">
        <button className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("landing")}>
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <CheckCircleIcon className="w-5 h-5 text-white" />
            </div>
          <span className="font-bold text-white text-xl tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            TaskFlow
          </span>
        </button>
      </div>

      <div className="relative flex-1 flex flex-col justify-center px-10 py-8">
        <h2 className="text-4xl xl:text-5xl font-bold text-white leading-[1.1] mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
          Work smarter,<br />ship faster.
        </h2>
        <p className="text-indigo-200 text-base leading-relaxed max-w-sm mb-8">
          Keep projects moving with clear ownership, focused assignments, and one shared view of what needs to happen next.
        </p>

        <div className="grid gap-3 max-w-xl">
          {[
            { icon: <ProjectIcon className="w-5 h-5" />, title: "Project clarity", desc: "See which projects are active, who owns them, and where work is blocked." },
            { icon: <CheckCircleIcon className="w-5 h-5" />, title: "Task accountability", desc: "Keep due dates, statuses, and assignees visible for the whole team." },
            { icon: <ShieldLockIcon className="w-5 h-5" />, title: "Role-based teamwork", desc: "Give admins the controls they need while members stay focused on delivery." },
            { icon: <BoltIcon className="w-5 h-5" />, title: "Faster execution", desc: "Claim open work, update progress, and keep momentum without extra tools." },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3 rounded-2xl px-4 py-4 border border-white/10 bg-white/10 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="text-white text-sm font-semibold">{item.title}</div>
                <div className="text-indigo-200 text-xs">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <PreviewPanel />

      <div className="flex-1 flex flex-col">
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button
            onClick={() => navigate("landing")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <CheckCircleIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>TaskFlow</span>
          </button>
          <button
            onClick={() => navigate("landing")}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <span className="inline-flex items-center gap-1">
              <ArrowLeftIcon className="w-3.5 h-3.5" />
              Home
            </span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-[420px]">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-1.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-gray-500 text-sm">
                {mode === "signin"
                  ? "Sign in to your TaskFlow workspace."
                  : "Start managing projects in minutes."}
              </p>
            </div>

            {serverError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700 leading-snug">{serverError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {mode === "signup" && (
                  <Field label="Full name" id="name" error={errors.name}>
                    <TextInput
                      id="name"
                      placeholder="Sophia Chen"
                      value={name}
                      onChange={setName}
                      autoComplete="name"
                      disabled={loading}
                    />
                  </Field>
                )}

                <Field label="Work email" id="email" error={errors.email}>
                  <TextInput
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={setEmail}
                    autoComplete="email"
                    disabled={loading}
                  />
                </Field>

                <Field label="Password" id="password" error={errors.password}>
                  <div className="relative">
                    <TextInput
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={mode === "signup" ? "Min. 8 characters" : "Your password"}
                      value={password}
                      onChange={setPassword}
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </Field>

                {mode === "signin" && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.currentTarget.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Remember me
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shadow-sm shadow-indigo-200 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {mode === "signin" ? "Signing in…" : mode === "signup" ? "Creating account…" : "Sending…"}
                    </>
                  ) : mode === "signin" ? (
                    "Sign in →"
                  ) : mode === "signup" ? (
                    "Create account →"
                  ) : "Create account →"}
                </button>
              </form>


            <div className="flex items-center justify-between mt-6 text-sm">
              <button
                type="button"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                {mode === "signin" ? "Sign up free" : "Sign in"}
              </button>
            </div>

            <button
              onClick={() => navigate("landing")}
              className="hidden lg:flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-8 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
