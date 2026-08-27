import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type CSSProperties, useState } from "react"
import { XIcon } from "./icons"

// ── Avatar ──────────────────────────────────────────────────────────────
export function Avatar({
  initials,
  color,
  src,
  size = "md",
}: {
  initials: string
  color?: string
  src?: string | null
  size?: "sm" | "md" | "lg"
}) {
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-11 h-11 text-base" }
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none`}
      style={{ backgroundColor: color ?? "#5b5fef" }}
    >
      {src ? (
        <img src={src} alt="" className="w-full h-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}

export function ProjectAvatar({
  name,
  color,
  imageData,
  size = "md",
}: {
  name: string
  color?: string
  imageData?: string | null
  size?: "sm" | "md" | "lg"
}) {
  const sizes = { sm: "w-8 h-8", md: "w-10 h-10", lg: "w-12 h-12" }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
  return (
    <div
      className={`${sizes[size]} rounded-xl overflow-hidden flex items-center justify-center text-white font-bold shrink-0 select-none`}
      style={{ backgroundColor: color ?? "#5b5fef" }}
    >
      {imageData ? (
        <img src={imageData} alt="" className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}

// ── AvatarGroup ──────────────────────────────────────────────────────────
const AVATAR_COLORS = ["#5b5fef", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"]

export function AvatarGroup({ initials }: { initials: string[] }) {
  return (
    <div className="flex -space-x-2">
      {initials.map((i, idx) => (
        <div
          key={idx}
          className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold text-white"
          style={{ backgroundColor: AVATAR_COLORS[idx % AVATAR_COLORS.length] }}
        >
          {i}
        </div>
      ))}
    </div>
  )
}

// ── Badge ───────────────────────────────────────────────────────────────
type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted"

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode
  variant?: BadgeVariant
}) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-indigo-100 text-indigo-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    danger: "bg-red-100 text-red-700",
    info: "bg-sky-100 text-sky-700",
    muted: "bg-gray-100 text-gray-600",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  )
}

// ── Button ──────────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline"

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: {
  children: ReactNode
  variant?: ButtonVariant
  size?: "sm" | "md" | "lg"
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed"
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  }
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300",
    ghost: "text-gray-600 hover:bg-gray-100 active:bg-gray-200",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
    outline: "border border-gray-200 text-gray-700 hover:bg-gray-50 active:bg-gray-100",
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

// ── Input ───────────────────────────────────────────────────────────────
export function Input({
  label,
  error,
  className = "",
  ...props
}: {
  label?: string
  error?: string
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <input
        className={`px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${error ? "border-red-400 focus:ring-red-400" : ""} ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  )
}

// ── Card ────────────────────────────────────────────────────────────────
export function Card({
  children,
  className = "",
  hover = false,
  onClick,
  style,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  style?: CSSProperties
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm ${hover ? "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  )
}

// ── Progress ────────────────────────────────────────────────────────────
export function Progress({ value, color = "#5b5fef" }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }}
      />
    </div>
  )
}

// ── EmptyState ──────────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-5">{description}</p>
      {action}
    </div>
  )
}

// ── LoadingSpinner ──────────────────────────────────────────────────────
export function LoadingSpinner({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-600 rounded-full animate-spin" />
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  )
}

// ── Modal ───────────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "primary",
  loading = false,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: ButtonVariant
  loading?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal open={open} onClose={loading ? () => {} : onCancel} title={title} width="max-w-md">
      <div className="space-y-5 p-6 pt-2">
        <p className="text-sm leading-relaxed text-gray-600">{description}</p>
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
            {loading ? "Working..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── StatusBadge ─────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    active: { label: "Active", variant: "success" },
    "on-hold": { label: "On Hold", variant: "warning" },
    completed: { label: "Completed", variant: "info" },
    archived: { label: "Archived", variant: "muted" },
    todo: { label: "To Do", variant: "muted" },
    "in-progress": { label: "In Progress", variant: "default" },
    "in-review": { label: "In Review", variant: "warning" },
    done: { label: "Done", variant: "success" },
  }
  const { label, variant } = map[status] ?? { label: status, variant: "muted" }
  return <Badge variant={variant}>{label}</Badge>
}

// ── PriorityBadge ────────────────────────────────────────────────────────
export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    low: { label: "Low", variant: "muted" },
    medium: { label: "Medium", variant: "info" },
    high: { label: "High", variant: "warning" },
    urgent: { label: "Urgent", variant: "danger" },
  }
  const { label, variant } = map[priority] ?? { label: priority, variant: "muted" }
  return <Badge variant={variant}>{label}</Badge>
}

// ── SearchBar ────────────────────────────────────────────────────────────
export function SearchBar({
  value,
  onChange,
  placeholder = "Search...",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all w-64"
      />
    </div>
  )
}

// ── Select ───────────────────────────────────────────────────────────────
export function Select({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 cursor-pointer ${
            active === tab.id
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${active === tab.id ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-500"}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Sidebar Nav ─────────────────────────────────────────────────────────
export function NavItem({
  icon,
  label,
  active = false,
  badge,
  onClick,
}: {
  icon: ReactNode
  label: string
  active?: boolean
  badge?: number
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer text-left ${
        active
          ? "bg-indigo-50 text-indigo-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      <span className={`w-4 h-4 shrink-0 ${active ? "text-indigo-600" : "text-gray-400"}`}>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-medium">
          {badge}
        </span>
      )}
    </button>
  )
}

// ── Stat Card ────────────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  change,
  icon,
  color = "indigo",
}: {
  label: string
  value: string | number
  change?: string
  icon: ReactNode
  color?: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg"
          style={{ backgroundColor: color === "indigo" ? "#5b5fef" : color === "purple" ? "#8b5cf6" : color === "green" ? "#10b981" : color === "amber" ? "#f59e0b" : "#5b5fef" }}
        >
          {icon}
        </div>
        {change && (
          <span className={`text-xs font-medium px-2 py-1 rounded-lg ${change.startsWith("+") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {change}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </Card>
  )
}

// ── Dropdown ─────────────────────────────────────────────────────────────
export function Dropdown({
  trigger,
  items,
}: {
  trigger: ReactNode
  items: { label: string; onClick: () => void; danger?: boolean }[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">{trigger}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-100 rounded-xl shadow-lg py-1 min-w-36">
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { item.onClick(); setOpen(false) }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors cursor-pointer ${item.danger ? "text-red-600 hover:bg-red-50" : "text-gray-700 hover:bg-gray-50"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
