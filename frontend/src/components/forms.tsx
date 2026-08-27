/**
 * Reusable validated forms for TaskFlow Admin CMS.
 * UserForm · ProjectForm · TaskForm
 */
import { useState, type FormEvent } from "react"
import { USERS, PROJECTS } from "../data"

// ── Primitives ────────────────────────────────────────────────────────────
function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
    </label>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return (
    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {msg}
    </p>
  )
}

export function TextInput({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
  disabled,
}: {
  id: string
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  error?: string
  autoComplete?: string
  disabled?: boolean
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete={autoComplete}
      disabled={disabled}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 bg-white outline-none transition-all
        ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}
        ${error
          ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
          : "border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        }`}
    />
  )
}

export function Textarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  error,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  error?: string
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 placeholder-gray-400 bg-white outline-none transition-all resize-none
        ${error
          ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
          : "border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        }`}
    />
  )
}

export function SelectInput({
  id,
  value,
  onChange,
  options,
  error,
  disabled,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
  error?: string
  disabled?: boolean
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-900 bg-white outline-none transition-all appearance-none cursor-pointer
        ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : ""}
        ${error
          ? "border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-100"
          : "border-gray-200 hover:border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        }`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h4>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function FormActions({
  onCancel,
  loading,
  submitLabel = "Save changes",
}: {
  onCancel: () => void
  loading: boolean
  submitLabel?: string
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100 mt-6">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-all cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={loading}
        className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
      >
        {loading && (
          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        )}
        {loading ? "Saving…" : submitLabel}
      </button>
    </div>
  )
}

// ── Colour picker swatches ────────────────────────────────────────────────
const PROJECT_COLORS = [
  "#5b5fef", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#06b6d4", "#64748b",
]

// ══════════════════════════════════════════════════════════════════════════
// UserForm
// ══════════════════════════════════════════════════════════════════════════
interface UserFormData {
  name: string
  email: string
  role: string
  password: string
}

function validateUser(d: UserFormData, isEdit: boolean) {
  const e: Partial<UserFormData> = {}
  if (!d.name.trim()) e.name = "Full name is required."
  if (!d.email.trim()) e.email = "Email is required."
  else if (!/\S+@\S+\.\S+/.test(d.email)) e.email = "Enter a valid email."
  if (!isEdit && !d.password) e.password = "Password is required."
  else if (!isEdit && d.password.length < 8) e.password = "Min. 8 characters."
  if (!d.role) e.role = "Select a role."
  return e
}

export function UserForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<UserFormData>
  onSave: (data: UserFormData) => void | Promise<void>
  onCancel: () => void
}) {
  const isEdit = !!initial?.email
  const [data, setData] = useState<UserFormData>({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    role: initial?.role ?? "member",
    password: "",
  })
  const [errors, setErrors] = useState<Partial<UserFormData>>({})
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const set = (key: keyof UserFormData) => (v: string) => {
    setData((p) => ({ ...p, [key]: v }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }
  const visibleError = (key: keyof UserFormData) =>
    touched[key] ? errors[key] : undefined

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validateUser(data, isEdit)
    setErrors(errs as Partial<UserFormData>)
    setTouched({ name: true, email: true, role: true, password: true })
    if (Object.keys(errs).length) return
    setLoading(true)
    Promise.resolve(onSave(data)).finally(() => setLoading(false))
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-5">
        <FormSection title="Personal info">
          <div>
            <Label htmlFor="u-name">Full name</Label>
            <TextInput
              id="u-name"
              value={data.name}
              onChange={set("name")}
              placeholder="Sophia Chen"
              error={visibleError("name")}
              autoComplete="name"
            />
            <FieldError msg={visibleError("name")} />
          </div>

          <div>
            <Label htmlFor="u-email">Email address</Label>
            <TextInput
              id="u-email"
              type="email"
              value={data.email}
              onChange={set("email")}
              placeholder="sophia@company.com"
              error={visibleError("email")}
              autoComplete="email"
              disabled={isEdit}
            />
            {isEdit && (
              <p className="mt-1.5 text-xs text-gray-400">Email cannot be changed after account creation.</p>
            )}
            <FieldError msg={visibleError("email")} />
          </div>
        </FormSection>

        <FormSection title="Access">
          <div>
            <Label htmlFor="u-role">Role</Label>
            <SelectInput
              id="u-role"
              value={data.role}
              onChange={set("role")}
              error={visibleError("role")}
              options={[
                { label: "Member — read / contribute", value: "member" },
                { label: "Admin — platform moderation access", value: "admin" },
              ]}
            />
            <FieldError msg={visibleError("role")} />
          </div>

          {!isEdit && (
            <div>
              <Label htmlFor="u-pw">Temporary password</Label>
              <TextInput
                id="u-pw"
                type="password"
                value={data.password}
                onChange={set("password")}
                placeholder="Min. 8 characters"
                error={visibleError("password")}
                autoComplete="new-password"
              />
              <p className="mt-1.5 text-xs text-gray-400">
                The user will be prompted to change this on first sign-in.
              </p>
              <FieldError msg={visibleError("password")} />
            </div>
          )}
        </FormSection>
      </div>

      <FormActions
        onCancel={onCancel}
        loading={loading}
        submitLabel={isEdit ? "Save changes" : "Create user"}
      />
    </form>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// ProjectForm
// ══════════════════════════════════════════════════════════════════════════
interface ProjectFormData {
  name: string
  description: string
  status: string
  ownerId: string
  color: string
  imageData: string
  dueDate: string
}

function validateProject(d: ProjectFormData) {
  const e: Partial<ProjectFormData> = {}
  if (!d.name.trim()) e.name = "Project name is required."
  else if (d.name.length > 60) e.name = "Name must be 60 characters or fewer."
  if (!d.description.trim()) e.description = "Description is required."
  if (!d.ownerId) e.ownerId = "Select a project owner."
  if (!d.dueDate) e.dueDate = "Due date is required."
  return e
}

export function ProjectForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<ProjectFormData>
  onSave: (data: ProjectFormData) => void | Promise<void>
  onCancel: () => void
}) {
  const isEdit = !!initial?.name
  const [data, setData] = useState<ProjectFormData>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "active",
    ownerId: initial?.ownerId ?? "",
    color: initial?.color ?? PROJECT_COLORS[0],
    imageData: initial?.imageData ?? "",
    dueDate: initial?.dueDate ?? "",
  })
  const [errors, setErrors] = useState<Partial<ProjectFormData>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  const set = (key: keyof ProjectFormData) => (v: string) => {
    setData((p) => ({ ...p, [key]: v }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  const visibleError = (key: keyof ProjectFormData) =>
    touched[key] ? errors[key] : undefined

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validateProject(data)
    setErrors(errs as Partial<ProjectFormData>)
    const allTouched = Object.fromEntries(Object.keys(data).map((k) => [k, true]))
    setTouched(allTouched)
    if (Object.keys(errs).length) return
    setLoading(true)
    Promise.resolve(onSave(data)).finally(() => setLoading(false))
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-6">
        <FormSection title="Project details">
          <div>
            <Label htmlFor="p-name">Project name</Label>
            <TextInput
              id="p-name"
              value={data.name}
              onChange={set("name")}
              placeholder="e.g. Website Redesign"
              error={visibleError("name")}
            />
            <div className="mt-1.5 flex items-center justify-between">
              <FieldError msg={visibleError("name")} />
              <span className={`text-xs ml-auto ${data.name.length > 55 ? "text-amber-500" : "text-gray-400"}`}>
                {data.name.length}/60
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="p-desc">Description</Label>
            <Textarea
              id="p-desc"
              value={data.description}
              onChange={set("description")}
              placeholder="What is this project about? Who is it for?"
              rows={3}
              error={visibleError("description")}
            />
            <FieldError msg={visibleError("description")} />
          </div>

        </FormSection>

        <FormSection title="Colour">
          <div>
            <Label htmlFor="p-color">Project colour</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color")(c)}
                  className="w-8 h-8 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center"
                  style={{
                    backgroundColor: c,
                    borderColor: data.color === c ? "white" : c,
                    boxShadow: data.color === c ? `0 0 0 3px ${c}` : "none",
                  }}
                >
                  {data.color === c && (
                    <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="p-image">Project image</Label>
            <TextInput
              id="p-image"
              value={data.imageData}
              onChange={set("imageData")}
              placeholder="image data URL or use the upload field below"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Uploading an image is the easiest way to set this field.
            </p>
            <input
              id="p-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="mt-2 block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-indigo-700 hover:file:bg-indigo-100"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  setData((p) => ({ ...p, imageData: String(reader.result ?? "") }))
                }
                reader.readAsDataURL(file)
                e.currentTarget.value = ""
              }}
            />
          </div>
        </FormSection>

        <FormSection title="Settings">
          <FormRow>
            <div>
              <Label htmlFor="p-status">Status</Label>
              <SelectInput
                id="p-status"
                value={data.status}
                onChange={set("status")}
                options={[
                  { label: "Active", value: "active" },
                  { label: "On Hold", value: "on-hold" },
                  { label: "Completed", value: "completed" },
                  { label: "Archived", value: "archived" },
                ]}
              />
            </div>

            <div>
              <Label htmlFor="p-due">Due date</Label>
              <TextInput
                id="p-due"
                type="date"
                value={data.dueDate}
                onChange={set("dueDate")}
                error={visibleError("dueDate")}
              />
              <FieldError msg={visibleError("dueDate")} />
            </div>
          </FormRow>

          <div>
            <Label htmlFor="p-owner">Project owner</Label>
            <SelectInput
              id="p-owner"
              value={data.ownerId}
              onChange={set("ownerId")}
              error={visibleError("ownerId")}
              options={[
                { label: "— Select owner —", value: "" },
                ...USERS.map((u) => ({ label: u.name, value: u.id })),
              ]}
            />
            <FieldError msg={visibleError("ownerId")} />
          </div>
        </FormSection>
      </div>

      <FormActions
        onCancel={onCancel}
        loading={loading}
        submitLabel={isEdit ? "Save project" : "Create project"}
      />
    </form>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// TaskForm
// ══════════════════════════════════════════════════════════════════════════
interface TaskFormData {
  title: string
  description: string
  projectId: string
  assigneeId: string
  status: string
  priority: string
  dueDate: string
  color: string
  notes: string
}

function validateTask(d: TaskFormData, allowNoProject: boolean) {
  const e: Partial<TaskFormData> = {}
  if (!d.title.trim()) e.title = "Task title is required."
  else if (d.title.length > 120) e.title = "Title must be 120 characters or fewer."
  if (!allowNoProject && !d.projectId) e.projectId = "Select a project."
  if (!d.priority) e.priority = "Select a priority."
  if (allowNoProject && !/^#[0-9a-fA-F]{6}$/.test(d.color)) e.color = "Enter a valid hex color like #5b5fef."
  return e
}

export function TaskForm({
  initial,
  allowNoProject = false,
  onSave,
  onCancel,
}: {
  initial?: Partial<TaskFormData>
  allowNoProject?: boolean
  onSave: (data: TaskFormData) => void | Promise<void>
  onCancel: () => void
}) {
  const isEdit = !!initial?.title
  const [data, setData] = useState<TaskFormData>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    projectId: initial?.projectId ?? "",
    assigneeId: initial?.assigneeId ?? "",
    status: initial?.status ?? "todo",
    priority: initial?.priority ?? "medium",
    dueDate: initial?.dueDate ?? "",
    color: initial?.color ?? "#5b5fef",
    notes: initial?.notes ?? "No extra details",
  })
  const [errors, setErrors] = useState<Partial<TaskFormData>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)

  const set = (key: keyof TaskFormData) => (v: string) => {
    setData((p) => ({ ...p, [key]: v }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  const visibleError = (key: keyof TaskFormData) =>
    touched[key] ? errors[key] : undefined

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validateTask(data, allowNoProject)
    setErrors(errs as Partial<TaskFormData>)
    const allTouched = Object.fromEntries(Object.keys(data).map((k) => [k, true]))
    setTouched(allTouched)
    if (Object.keys(errs).length) return
    setLoading(true)
    Promise.resolve(onSave(data)).finally(() => setLoading(false))
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="space-y-6">
        <FormSection title="Task details">
          <div>
            <Label htmlFor="t-title">Title</Label>
            <TextInput
              id="t-title"
              value={data.title}
              onChange={set("title")}
              placeholder="What needs to be done?"
              error={visibleError("title")}
            />
            <div className="mt-1.5 flex items-center justify-between">
              <FieldError msg={visibleError("title")} />
              <span className={`text-xs ml-auto ${data.title.length > 110 ? "text-amber-500" : "text-gray-400"}`}>
                {data.title.length}/120
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="t-desc">Description</Label>
            <Textarea
              id="t-desc"
              value={data.description}
              onChange={set("description")}
              placeholder="Add context, acceptance criteria, or links…"
              rows={4}
            />
          </div>

          {allowNoProject ? (
            <div>
              <Label htmlFor="t-color">Task color</Label>
              <TextInput
                id="t-color"
                value={data.color}
                onChange={set("color")}
                placeholder="#5b5fef"
                error={visibleError("color")}
              />
              <FieldError msg={visibleError("color")} />
            </div>
          ) : null}
        </FormSection>

        <FormSection title="Assignment">
          {allowNoProject ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              This task belongs to your personal task list.
            </div>
          ) : (
            <div>
              <Label htmlFor="t-project">Project</Label>
              <SelectInput
                id="t-project"
                value={data.projectId}
                onChange={set("projectId")}
                error={visibleError("projectId")}
                options={[
                  { label: "— Select project —", value: "" },
                  ...PROJECTS.map((p) => ({ label: p.name, value: p.id })),
                ]}
              />
              <FieldError msg={visibleError("projectId")} />
            </div>
          )}

          {!allowNoProject && (
            <div>
              <Label htmlFor="t-assignee">Assignee</Label>
              <SelectInput
                id="t-assignee"
                value={data.assigneeId}
                onChange={set("assigneeId")}
                options={[
                  { label: "Free for anyone", value: "" },
                  ...USERS.map((u) => ({ label: u.name, value: u.id })),
                ]}
              />
            </div>
          )}
        </FormSection>

        <FormSection title="Priority &amp; scheduling">
          <FormRow>
            <div>
              <Label htmlFor="t-priority">Priority</Label>
              <SelectInput
                id="t-priority"
                value={data.priority}
                onChange={set("priority")}
                error={visibleError("priority")}
                options={[
                  { label: "🔵  Low", value: "low" },
                  { label: "🟢  Medium", value: "medium" },
                  { label: "🟡  High", value: "high" },
                  { label: "🔴  Urgent", value: "urgent" },
                ]}
              />
              <FieldError msg={visibleError("priority")} />
            </div>

            <div>
              <Label htmlFor="t-status">Status</Label>
              <SelectInput
                id="t-status"
                value={data.status}
                onChange={set("status")}
                options={[
                  { label: "To Do", value: "todo" },
                  { label: "In Progress", value: "in-progress" },
                  { label: "In Review", value: "in-review" },
                  { label: "Done", value: "done" },
                ]}
              />
            </div>
          </FormRow>

          <div>
            <Label htmlFor="t-due">Due date</Label>
            <TextInput
              id="t-due"
              type="date"
              value={data.dueDate}
              onChange={set("dueDate")}
            />
            <p className="mt-1.5 text-xs text-gray-400">Leave blank for no deadline.</p>
          </div>
        </FormSection>

        <FormSection title="Notes">
          <div>
            <Label htmlFor="t-notes">Extra details</Label>
            <Textarea
              id="t-notes"
              value={data.notes}
              onChange={set("notes")}
              placeholder="No extra details"
              rows={4}
            />
          </div>
        </FormSection>
      </div>

      <FormActions
        onCancel={onCancel}
        loading={loading}
        submitLabel={isEdit ? "Save task" : "Create task"}
      />
    </form>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// SlideOver wrapper  (right-side panel for create / edit)
// ══════════════════════════════════════════════════════════════════════════
export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = "max-w-lg",
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  width?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`relative flex flex-col bg-white h-full shadow-2xl w-full ${width} overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              {title}
            </h2>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer mt-0.5"
            aria-label="Close panel"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════
// Delete-confirm modal (shared)
// ══════════════════════════════════════════════════════════════════════════
export function DeleteModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
}) {
  const [loading, setLoading] = useState(false)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
          </div>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed mb-6 pl-[52px]">{description}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => { setLoading(true); setTimeout(() => { setLoading(false); onConfirm() }, 600) }}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  )
}
