import { type ReactNode, useState } from "react"
import { type View } from "../App"
import { Avatar, ConfirmDialog, NavItem } from "./ui"
import { CURRENT_USER, PROJECTS, TASKS, isAdminUser, isPlatformAdminEmail } from "../data"

const NAV_ICONS = {
  home: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  projects: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  ),
  tasks: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  personal: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3.75 2.25M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  team: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  ),
  settings: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  admin: (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
}

export default function AppShell({
  children,
  navigate,
  onLogout,
  activeView,
}: {
  children: ReactNode
  navigate: (view: View, opts?: { projectId?: string; taskId?: string }) => void
  onLogout: () => void
  activeView: View
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const showAdmin = isAdminUser(CURRENT_USER)
  const showManager = isPlatformAdminEmail(CURRENT_USER?.email)

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 pt-5 pb-6">
        <button className="flex items-center gap-2.5 cursor-pointer text-left" onClick={() => { navigate("dashboard"); setMobileOpen(false) }}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" fillRule="evenodd" clipRule="evenodd" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
            TaskFlow
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        <NavItem
          icon={NAV_ICONS.home}
          label="Dashboard"
          active={activeView === "dashboard"}
          onClick={() => { navigate("dashboard"); setMobileOpen(false) }}
        />
        <NavItem
          icon={NAV_ICONS.projects}
          label="Projects"
          active={activeView === "projects" || activeView === "project"}
          badge={PROJECTS.length || undefined}
          onClick={() => { navigate("projects"); setMobileOpen(false) }}
        />
        <NavItem
          icon={NAV_ICONS.tasks}
          label="Team Tasks"
          active={activeView === "task" || activeView === "tasks"}
          badge={TASKS.length || undefined}
          onClick={() => { navigate("tasks"); setMobileOpen(false) }}
        />
        <NavItem
          icon={NAV_ICONS.team}
          label="Team"
          active={activeView === "team"}
          onClick={() => { navigate("team"); setMobileOpen(false) }}
        />
        <div className="mx-3 my-3 border-t border-gray-100" />
        <NavItem
          icon={NAV_ICONS.personal}
          label="Personal Tasks"
          active={activeView === "personal"}
          onClick={() => { navigate("personal"); setMobileOpen(false) }}
        />
        {showAdmin && <div className="pt-4 pb-1">
          <span className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</span>
        </div>}
        {showAdmin && <NavItem
          icon={NAV_ICONS.admin}
          label="Admin CMS"
          active={activeView === "admin"}
          onClick={() => { navigate("admin"); setMobileOpen(false) }}
        />}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-2">
        <button
          onClick={() => { navigate("profile"); setMobileOpen(false) }}
          className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left ${
            activeView === "profile" ? "bg-indigo-50" : "hover:bg-gray-50"
          }`}
        >
          <Avatar initials={CURRENT_USER?.avatar ?? "?"} src={CURRENT_USER?.profileImageData ?? undefined} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{CURRENT_USER?.name ?? "Account"}</div>
            <div className={`text-xs truncate ${showManager ? "text-amber-800" : "text-gray-400"}`}>
              {showManager ? "manager" : CURRENT_USER?.role ?? ""}
            </div>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        <button
          onClick={() => setLogoutConfirmOpen(true)}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors text-left"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-white border-r border-gray-100">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-white flex flex-col h-full shadow-xl">
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button className="font-bold text-gray-900 cursor-pointer" style={{ fontFamily: "Outfit, sans-serif" }} onClick={() => navigate("dashboard")}>TaskFlow</button>
          <Avatar initials={CURRENT_USER?.avatar ?? "?"} src={CURRENT_USER?.profileImageData ?? undefined} size="sm" />
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Sign out?"
        description="You’ll be returned to the landing page and your current session will end on this device."
        confirmLabel="Sign out"
        confirmVariant="danger"
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={() => {
          setLogoutConfirmOpen(false)
          onLogout()
        }}
      />
    </div>
  )
}
