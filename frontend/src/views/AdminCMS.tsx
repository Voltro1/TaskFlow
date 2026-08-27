import { useEffect, useMemo, useState } from "react"
import { type View } from "../App"
import { ADMIN_METRICS, CURRENT_USER, isPlatformAdminEmail, type User } from "../data"
import { apiJson } from "../lib/api"
import { Avatar, Button, ConfirmDialog } from "../components/ui"

type AdminTab = "overview" | "users" | "admins"

type DashboardMetrics = {
  users: number
  admins: number
  activeUsers: number
  activeProjects: number
  archivedProjects: number
  newUsers: number
  newUsersToday: number
  disabledUsers: number
}

type ApiUser = User & { isActive?: boolean; createdAt?: string }

type UsersResponse = {
  data: { users: ApiUser[] }
  meta?: { pagination?: { page: number; pages: number; total: number; limit: number } }
}

const PAGE_SIZE = 50

function initialsForName(name: string | null | undefined) {
  return String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?"
}

function isProtectedManager(user: Pick<ApiUser, "email"> | null | undefined) {
  return isPlatformAdminEmail(user?.email)
}

function roleLabel(user: ApiUser) {
  return isProtectedManager(user) ? "Manager" : user.role === "admin" ? "Admin" : "Member"
}

function roleBadgeClass(user: ApiUser) {
  if (isProtectedManager(user)) return "bg-amber-100 text-amber-700"
  return user.role === "admin" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-700"
}

const TABS: { id: AdminTab; label: string; icon: JSX.Element }[] = [
  {
    id: "overview",
    label: "Website Status",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h10.5" />
      </svg>
    ),
  },
  {
    id: "users",
    label: "Users",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198A11.944 11.944 0 0112 21a11.944 11.944 0 01-5.963-1.584m11.962 0A5.971 5.971 0 0012 12.75a5.971 5.971 0 00-5.999 6.666M15 6.75a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "admins",
    label: "Admins",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7.5 4.5v4.75c0 4.382-2.77 8.287-6.91 9.74L12 22l-.59-.01C7.27 20.537 4.5 16.632 4.5 12.25V7.5L12 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 10.5a2.25 2.25 0 104.5 0 2.25 2.25 0 00-4.5 0zM12 15c-1.182 0-2.277.404-3.146 1.083a8.48 8.48 0 006.292 0A5.044 5.044 0 0012 15z" />
      </svg>
    ),
  },
]

function ErrorBanner({ message }: { message: string }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
}

function Panel({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description?: string
  icon: JSX.Element
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {description ? <p className="mt-1 text-xs text-gray-400">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}

function StatCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string
  value: number
  hint: string
  icon: JSX.Element
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          {icon}
        </div>
        <div className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
          {value}
        </div>
      </div>
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-1 text-xs text-gray-400">{hint}</div>
    </div>
  )
}

function Pagination({
  page,
  pages,
  total,
  label,
  loading,
  onPrev,
  onNext,
}: {
  page: number
  pages: number
  total: number
  label: string
  loading: boolean
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-gray-500">
        {label}: page {page} of {Math.max(1, pages)} · {total} total
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={loading || page <= 1}>
          Prev 50
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={loading || page >= pages}>
          Next 50
        </Button>
      </div>
    </div>
  )
}

function Sidebar({
  activeTab,
  onSelect,
  onBack,
  onLogout,
}: {
  activeTab: AdminTab
  onSelect: (tab: AdminTab) => void
  onBack: () => void
  onLogout: () => void
}) {
  const [confirmLogout, setConfirmLogout] = useState(false)

  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-gray-100 bg-white lg:flex lg:flex-col">
        <div className="border-b border-gray-100 px-5 py-5">
          <button className="flex items-center gap-3 text-left" onClick={onBack}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>TaskFlow</div>
              <div className="text-xs text-gray-400">Admin CMS</div>
            </div>
          </button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                activeTab === tab.id ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="space-y-2 border-t border-gray-100 p-3">
          <Button variant="ghost" onClick={onBack}>Back to app</Button>
          <Button variant="outline" onClick={() => setConfirmLogout(true)}>Sign out</Button>
        </div>
      </aside>
      <ConfirmDialog
        open={confirmLogout}
        title="Sign out?"
        description="You’re about to leave the admin panel and end this session on the current device."
        confirmLabel="Sign out"
        confirmVariant="danger"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false)
          onLogout()
        }}
      />
    </>
  )
}

function OverviewTab({ metrics }: { metrics: DashboardMetrics | null }) {
  const values = metrics ?? (ADMIN_METRICS as DashboardMetrics | null)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Users"
          value={values?.users ?? 0}
          hint={`${values?.activeUsers ?? 0} active accounts right now`}
          icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198A11.944 11.944 0 0112 21a11.944 11.944 0 01-5.963-1.584m11.962 0A5.971 5.971 0 0012 12.75a5.971 5.971 0 00-5.999 6.666M15 6.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          title="New users"
          value={values?.newUsers ?? 0}
          hint={`${values?.newUsersToday ?? 0} joined in the last 24 hours`}
          icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>}
        />
        <StatCard
          title="Active projects"
          value={values?.activeProjects ?? 0}
          hint={`${values?.archivedProjects ?? 0} archived across the platform`}
          icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>}
        />
        <StatCard
          title="Admins"
          value={values?.admins ?? 0}
          hint={`${values?.disabledUsers ?? 0} disabled accounts need review`}
          icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7.5 4.5v4.75c0 4.382-2.77 8.287-6.91 9.74L12 22l-.59-.01C7.27 20.537 4.5 16.632 4.5 12.25V7.5L12 3z" /></svg>}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Moderation API surface"
          description="Useful admin-only endpoints currently available in the backend."
          icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9A2.25 2.25 0 015.25 16.5v-9A2.25 2.25 0 017.5 5.25h9A2.25 2.25 0 0118.75 7.5v9A2.25 2.25 0 0116.5 18.75z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9.75h7.5M8.25 12h7.5M8.25 14.25h4.5" /></svg>}
        >
          <div className="space-y-3 text-sm text-gray-600">
            <div><code>GET /api/admin/dashboard</code> for platform moderation metrics.</div>
            <div><code>GET /api/admin/users?page=1&limit=50</code> for catalogued member review.</div>
            <div><code>GET /api/admin/users?role=admin&page=1&limit=50</code> for admin review only.</div>
            <div><code>PATCH /api/admin/users/:id</code> for promoting, demoting, disabling, and restoring accounts.</div>
            <div><code>DELETE /api/users/:id</code> for removing an account that no longer owns projects.</div>
          </div>
        </Panel>

        <Panel
          title="Operational signals"
          description="These counters come from live platform data, not the current admin’s own workspace."
          icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h4.5l2.25-6 3 12 2.25-6h4.5" /></svg>}
        >
          <div className="space-y-3 text-sm text-gray-600">
            <div>{values?.users ?? 0} total registered accounts are in the system.</div>
            <div>{values?.activeUsers ?? 0} of them are currently active, while {values?.disabledUsers ?? 0} are disabled.</div>
            <div>{values?.newUsersToday ?? 0} new users registered in the last 24 hours and {values?.newUsers ?? 0} in the past week.</div>
            <div>{values?.activeProjects ?? 0} active projects and {values?.archivedProjects ?? 0} archived projects exist platform-wide.</div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

function UsersTable({
  rows,
  loading,
  pendingUserId,
  onToggleActive,
}: {
  rows: ApiUser[]
  loading: boolean
  pendingUserId: string | null
  onToggleActive: (user: ApiUser) => void
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            {["Member", "Username", "Role", "Status", "Joined", "Moderation"].map((header) => (
              <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {rows.map((user) => (
            <tr key={user.id}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar initials={user.avatar || initialsForName(user.name)} src={user.profileImageData ?? undefined} size="sm" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-400">{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">@{user.username}</td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${roleBadgeClass(user)}`}>
                  {roleLabel(user)}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-500">{user.isActive === false ? "Disabled" : "Active"}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
              <td className="px-4 py-3">
                {user.id === CURRENT_USER?.id ? (
                  <span className="text-xs text-gray-400">Current manager</span>
                ) : isProtectedManager(user) ? (
                  <span className="text-xs font-medium text-amber-700">Protected manager</span>
                ) : (
                  <Button variant="outline" size="sm" disabled={loading || pendingUserId === user.id} onClick={() => onToggleActive(user)}>
                    {user.isActive === false ? "Restore account" : "Disable account"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-16 text-center text-sm text-gray-400">No users matched this page.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

function UsersTab({
  search,
}: {
  search: string
}) {
  const [rows, setRows] = useState<ApiUser[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [pendingUser, setPendingUser] = useState<ApiUser | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    apiJson<UsersResponse>(`/api/admin/users?page=${page}&limit=${PAGE_SIZE}&search=${encodeURIComponent(search)}`)
      .then((payload) => {
        if (!active) return
        setRows(payload.data.users)
        setPages(payload.meta?.pagination?.pages ?? 1)
        setTotal(payload.meta?.pagination?.total ?? payload.data.users.length)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load users.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [page, search])

  const toggleActive = async () => {
    if (!pendingUser) return
    setSavingId(pendingUser.id)
    setError("")
    try {
      await apiJson(`/api/admin/users/${pendingUser.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: pendingUser.isActive === false }),
      })
      const payload = await apiJson<UsersResponse>(`/api/admin/users?page=${page}&limit=${PAGE_SIZE}&search=${encodeURIComponent(search)}`)
      setRows(payload.data.users)
      setPages(payload.meta?.pagination?.pages ?? 1)
      setTotal(payload.meta?.pagination?.total ?? payload.data.users.length)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update the user.")
    } finally {
      setSavingId(null)
      setPendingUser(null)
    }
  }

  return (
    <div className="space-y-4">
      {error ? <ErrorBanner message={error} /> : null}
      <UsersTable rows={rows} loading={loading} pendingUserId={savingId} onToggleActive={setPendingUser} />
      <Pagination
        page={page}
        pages={pages}
        total={total}
        label="Users catalogue"
        loading={loading}
        onPrev={() => setPage((value) => Math.max(1, value - 1))}
        onNext={() => setPage((value) => Math.min(pages, value + 1))}
      />
      <ConfirmDialog
        open={Boolean(pendingUser)}
        title={pendingUser?.isActive === false ? "Restore this account?" : "Disable this account?"}
        description={
          pendingUser?.isActive === false
            ? `Restore ${pendingUser?.name ?? "this user"} so they can sign in again.`
            : `Disable ${pendingUser?.name ?? "this user"} so they can no longer sign in until restored.`
        }
        confirmLabel={pendingUser?.isActive === false ? "Restore account" : "Disable account"}
        confirmVariant={pendingUser?.isActive === false ? "primary" : "danger"}
        loading={Boolean(savingId)}
        onCancel={() => setPendingUser(null)}
        onConfirm={() => void toggleActive()}
      />
    </div>
  )
}

function AdminsTab({
  search,
}: {
  search: string
}) {
  const [adminRows, setAdminRows] = useState<ApiUser[]>([])
  const [memberRows, setMemberRows] = useState<ApiUser[]>([])
  const [adminPage, setAdminPage] = useState(1)
  const [memberPage, setMemberPage] = useState(1)
  const [adminPages, setAdminPages] = useState(1)
  const [memberPages, setMemberPages] = useState(1)
  const [adminTotal, setAdminTotal] = useState(0)
  const [memberTotal, setMemberTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [pendingAppoint, setPendingAppoint] = useState<ApiUser | null>(null)
  const [pendingRemove, setPendingRemove] = useState<ApiUser | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    setAdminPage(1)
    setMemberPage(1)
  }, [search])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    Promise.all([
      apiJson<UsersResponse>(`/api/admin/users?page=${adminPage}&limit=${PAGE_SIZE}&role=admin&search=${encodeURIComponent(search)}`),
      apiJson<UsersResponse>(`/api/admin/users?page=${memberPage}&limit=${PAGE_SIZE}&role=user&search=${encodeURIComponent(search)}`),
    ])
      .then(([adminsPayload, membersPayload]) => {
        if (!active) return
        setAdminRows(adminsPayload.data.users)
        setMemberRows(membersPayload.data.users)
        setAdminPages(adminsPayload.meta?.pagination?.pages ?? 1)
        setMemberPages(membersPayload.meta?.pagination?.pages ?? 1)
        setAdminTotal(adminsPayload.meta?.pagination?.total ?? adminsPayload.data.users.length)
        setMemberTotal(membersPayload.meta?.pagination?.total ?? membersPayload.data.users.length)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load admins.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [adminPage, memberPage, search])

  const reload = async () => {
    const [adminsPayload, membersPayload] = await Promise.all([
      apiJson<UsersResponse>(`/api/admin/users?page=${adminPage}&limit=${PAGE_SIZE}&role=admin&search=${encodeURIComponent(search)}`),
      apiJson<UsersResponse>(`/api/admin/users?page=${memberPage}&limit=${PAGE_SIZE}&role=user&search=${encodeURIComponent(search)}`),
    ])
    setAdminRows(adminsPayload.data.users)
    setMemberRows(membersPayload.data.users)
    setAdminPages(adminsPayload.meta?.pagination?.pages ?? 1)
    setMemberPages(membersPayload.meta?.pagination?.pages ?? 1)
    setAdminTotal(adminsPayload.meta?.pagination?.total ?? adminsPayload.data.users.length)
    setMemberTotal(membersPayload.meta?.pagination?.total ?? membersPayload.data.users.length)
  }

  const applyRoleChange = async (user: ApiUser, role: "admin" | "user") => {
    setSavingId(user.id)
    setError("")
    try {
      await apiJson(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      })
      await reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update admin access.")
    } finally {
      setSavingId(null)
      setPendingAppoint(null)
      setPendingRemove(null)
    }
  }

  const adminList = useMemo(() => adminRows, [adminRows])
  const appointableList = useMemo(() => memberRows, [memberRows])

  return (
    <div className="space-y-6">
      {error ? <ErrorBanner message={error} /> : null}

      <Panel
        title="Current admins"
        description="This catalogue shows up to 50 admin accounts per page from the full platform user base."
        icon={TABS[2].icon}
      >
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {["Admin", "Username", "Status", "Access"].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {adminList.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar initials={user.avatar || initialsForName(user.name)} src={user.profileImageData ?? undefined} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">@{user.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.isActive === false ? "Disabled" : "Active"}</td>
                    <td className="px-4 py-3">
                      {user.id === CURRENT_USER?.id ? (
                        <span className="text-xs font-medium text-amber-700">Current manager</span>
                      ) : isProtectedManager(user) ? (
                        <span className="text-xs font-medium text-amber-700">Protected manager</span>
                      ) : (
                        <Button variant="outline" size="sm" disabled={loading || savingId === user.id} onClick={() => setPendingRemove(user)}>
                          Remove admin
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {adminList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center text-sm text-gray-400">No admins matched this page.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Pagination
            page={adminPage}
            pages={adminPages}
            total={adminTotal}
            label="Admins catalogue"
            loading={loading}
            onPrev={() => setAdminPage((value) => Math.max(1, value - 1))}
            onNext={() => setAdminPage((value) => Math.min(adminPages, value + 1))}
          />
        </div>
      </Panel>

      <Panel
        title="Appoint an admin"
        description="Promote an existing platform member instead of creating a separate artificial admin account."
        icon={<svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" /></svg>}
      >
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {["Member", "Username", "Status", "Action"].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointableList.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar initials={user.avatar || initialsForName(user.name)} src={user.profileImageData ?? undefined} size="sm" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">@{user.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{user.isActive === false ? "Disabled" : "Active"}</td>
                    <td className="px-4 py-3">
                      <Button variant="primary" size="sm" disabled={loading || savingId === user.id || user.isActive === false || isProtectedManager(user)} onClick={() => setPendingAppoint(user)}>
                        Appoint admin
                      </Button>
                    </td>
                  </tr>
                ))}
                {appointableList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-16 text-center text-sm text-gray-400">No appointable members matched this page.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <Pagination
            page={memberPage}
            pages={memberPages}
            total={memberTotal}
            label="Appointable members"
            loading={loading}
            onPrev={() => setMemberPage((value) => Math.max(1, value - 1))}
            onNext={() => setMemberPage((value) => Math.min(memberPages, value + 1))}
          />
        </div>
      </Panel>

      <ConfirmDialog
        open={Boolean(pendingAppoint)}
        title="Appoint this member as admin?"
        description={`${pendingAppoint?.name ?? "This member"} will gain platform moderation access immediately.`}
        confirmLabel="Appoint admin"
        loading={Boolean(savingId)}
        onCancel={() => setPendingAppoint(null)}
        onConfirm={() => pendingAppoint && void applyRoleChange(pendingAppoint, "admin")}
      />

      <ConfirmDialog
        open={Boolean(pendingRemove)}
        title="Remove admin access?"
        description={`${pendingRemove?.name ?? "This admin"} will return to a regular member account immediately.`}
        confirmLabel="Remove admin"
        confirmVariant="danger"
        loading={Boolean(savingId)}
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => pendingRemove && void applyRoleChange(pendingRemove, "user")}
      />
    </div>
  )
}

export default function AdminCMS({
  navigate,
  onLogout,
}: {
  navigate: (view: View) => void
  onLogout: () => void
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview")
  const [search, setSearch] = useState("")
  const [metrics, setMetrics] = useState<DashboardMetrics | null>((ADMIN_METRICS as DashboardMetrics | null) ?? null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    setLoadingMetrics(true)
    setError("")
    apiJson<{ data: { metrics: DashboardMetrics } }>("/api/admin/dashboard")
      .then((payload) => {
        if (active) setMetrics(payload.data.metrics)
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load admin dashboard.")
      })
      .finally(() => {
        if (active) setLoadingMetrics(false)
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="flex min-h-screen bg-gray-50" style={{ fontFamily: "Inter, sans-serif" }}>
      <Sidebar activeTab={activeTab} onSelect={setActiveTab} onBack={() => navigate("dashboard")} onLogout={onLogout} />
      <div className="flex-1">
        <header className="border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                {TABS.find((tab) => tab.id === activeTab)?.label ?? "Admin CMS"}
              </h1>
              <p className="mt-1 text-sm text-gray-500">Moderate platform accounts with live platform-wide metrics and paginated catalogues.</p>
            </div>
            {activeTab !== "overview" ? (
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={activeTab === "admins" ? "Search admins or members..." : "Search users..."}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-72"
              />
            ) : (
              <Button variant="outline" disabled={loadingMetrics} onClick={() => window.location.reload()}>
                {loadingMetrics ? "Refreshing..." : "Refresh panel"}
              </Button>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-6">
          {error ? <div className="mb-6"><ErrorBanner message={error} /></div> : null}
          {activeTab === "overview" ? <OverviewTab metrics={metrics} /> : null}
          {activeTab === "users" ? <UsersTab search={search} /> : null}
          {activeTab === "admins" ? <AdminsTab search={search} /> : null}
        </main>
      </div>
    </div>
  )
}
