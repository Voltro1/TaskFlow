import { Component, useEffect, useState, type ReactNode } from "react"
import LandingPage from "./views/LandingPage"
import LoginPage from "./views/LoginPage"
import Dashboard from "./views/Dashboard"
import ProjectsPage from "./views/ProjectsPage"
import ProjectDetail from "./views/ProjectDetail"
import TaskDetail from "./views/TaskDetail"
import TasksPage from "./views/TasksPage"
import PersonalTasksPage from "./views/PersonalTasksPage"
import TeamPage from "./views/TeamPage"
import ProfilePage from "./views/ProfilePage"
import AdminCMS from "./views/AdminCMS"
import { LoadingSpinner } from "./components/ui"
import { CURRENT_USER, getProject, getTask, isAdminUser, loadTaskFlowData, subscribeToTaskFlowDataChange } from "./data"
import { clearStoredToken, getStoredToken, setStoredToken } from "./lib/api"

export type View =
  | "landing"
  | "login"
  | "signup"
  | "dashboard"
  | "projects"
  | "personal"
  | "project"
  | "task"
  | "tasks"
  | "team"
  | "profile"
  | "admin"

export interface AppState {
  currentView: View
  selectedProjectId: string | null
  selectedTaskId: string | null
}

function parsePath(pathname: string): AppState {
  const clean = pathname.replace(/\/+$/, '') || '/'
  const projectMatch = clean.match(/^\/projects\/(\d+)(?:\/tasks\/(\d+))?$/)
  if (projectMatch) {
    return {
      currentView: projectMatch[2] ? 'task' : 'project',
      selectedProjectId: projectMatch[1],
      selectedTaskId: projectMatch[2] ?? null,
    }
  }
  switch (clean) {
    case '/login':
      return { currentView: 'login', selectedProjectId: null, selectedTaskId: null }
    case '/signup':
      return { currentView: 'signup', selectedProjectId: null, selectedTaskId: null }
    case '/dashboard':
    case '/':
      return { currentView: 'dashboard', selectedProjectId: null, selectedTaskId: null }
    case '/projects':
      return { currentView: 'projects', selectedProjectId: null, selectedTaskId: null }
    case '/personal':
      return { currentView: 'personal', selectedProjectId: null, selectedTaskId: null }
    case '/tasks':
      return { currentView: 'tasks', selectedProjectId: null, selectedTaskId: null }
    case '/team':
      return { currentView: 'team', selectedProjectId: null, selectedTaskId: null }
    case '/profile':
      return { currentView: 'profile', selectedProjectId: null, selectedTaskId: null }
    case '/admin':
      return { currentView: 'admin', selectedProjectId: null, selectedTaskId: null }
    default:
      return { currentView: 'landing', selectedProjectId: null, selectedTaskId: null }
  }
}

function pathFor(view: View, opts?: { projectId?: string; taskId?: string }) {
  switch (view) {
    case 'landing':
      return '/'
    case 'login':
      return '/login'
    case 'signup':
      return '/signup'
    case 'dashboard':
      return '/dashboard'
    case 'projects':
      return '/projects'
    case 'personal':
      return '/personal'
    case 'tasks':
      return '/tasks'
    case 'team':
      return '/team'
    case 'profile':
      return '/profile'
    case 'admin':
      return '/admin'
    case 'project':
      return opts?.projectId ? `/projects/${opts.projectId}` : '/dashboard'
    case 'task':
      return opts?.projectId && opts?.taskId ? `/projects/${opts.projectId}/tasks/${opts.taskId}` : '/dashboard'
    default:
      return '/'
  }
}

function ErrorFallback({
  error,
  onReset,
}: {
  error: Error
  onReset: () => void
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="max-w-xl w-full rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-600">
          The page crashed while loading. You can go back to the dashboard or sign out and try again.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-xl bg-red-50 p-3 text-xs text-red-700 whitespace-pre-wrap">
          {error.message || "Unknown error"}
        </pre>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onReset}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

class AppErrorBoundary extends Component<{ children: ReactNode; onReset: () => void }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error("App crashed", error)
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onReset={this.props.onReset} />
    }
    return this.props.children
  }
}

export default function App() {
  const initialToken = getStoredToken()
  const [state, setState] = useState<AppState>(() => {
    const parsed = parsePath(window.location.pathname)
    return initialToken ? parsed : { currentView: 'landing', selectedProjectId: null, selectedTaskId: null }
  })
  const [authToken, setAuthToken] = useState(initialToken)
  const [bootstrapping, setBootstrapping] = useState(Boolean(initialToken))
  const [, setDataRevision] = useState(0)

  const navigate = (
    view: View,
    opts?: { projectId?: string; taskId?: string }
  ) => {
    const nextPath = pathFor(view, opts)
    window.history.pushState({}, '', nextPath)
    setState((prev) => ({
      ...prev,
      currentView: view,
      selectedProjectId: opts?.projectId ?? (view === 'project' || view === 'task' ? prev.selectedProjectId : null),
      selectedTaskId: opts?.taskId ?? (view === 'task' ? prev.selectedTaskId : null),
    }))
  }

  const login = async (token?: string, remember = true) => {
    if (!token) {
      throw new Error("Authentication token missing")
    }

    setStoredToken(token, remember)
    setAuthToken(token)
    setBootstrapping(true)
    try {
      await loadTaskFlowData()
      setState((prev) => ({
        ...prev,
        currentView: "dashboard",
      }))
    } catch (error) {
      clearStoredToken()
      setAuthToken("")
      setState({
        currentView: "landing",
        selectedProjectId: null,
        selectedTaskId: null,
      })
      window.history.replaceState({}, '', '/')
      throw error
    } finally {
      setBootstrapping(false)
    }
  }

  const logout = () => {
    clearStoredToken()
    setAuthToken("")
    setState({
      currentView: "landing",
      selectedProjectId: null,
      selectedTaskId: null,
    })
    window.history.replaceState({}, '', '/')
  }

  useEffect(() => {
    let active = true

    const onPopState = () => {
      setState(parsePath(window.location.pathname))
    }
    window.addEventListener('popstate', onPopState)

    async function hydrate() {
      if (!initialToken) {
        setBootstrapping(false)
        return
      }

      try {
        await loadTaskFlowData()
        if (active) setBootstrapping(false)
      } catch {
        if (active) {
          logout()
          setBootstrapping(false)
        }
      }
    }

    hydrate()

    return () => {
      active = false
      window.removeEventListener('popstate', onPopState)
    }
  }, [])

  useEffect(() => subscribeToTaskFlowDataChange(() => {
    setDataRevision((value) => value + 1)
  }), [])

  const isLoggedIn = Boolean(authToken)

  useEffect(() => {
    const appName = "TaskFlow"
    let title = appName

    switch (state.currentView) {
      case "landing":
        title = appName
        break
      case "login":
        title = `Login | ${appName}`
        break
      case "signup":
        title = `Sign Up | ${appName}`
        break
      case "dashboard":
        title = `Dashboard | ${appName}`
        break
      case "projects":
        title = `Projects | ${appName}`
        break
      case "personal":
        title = `Personal Tasks | ${appName}`
        break
      case "tasks":
        title = `Team Tasks | ${appName}`
        break
      case "team":
        title = `Team | ${appName}`
        break
      case "profile":
        title = `Profile | ${appName}`
        break
      case "admin":
        title = `Admin CMS | ${appName}`
        break
      case "project": {
        const project = state.selectedProjectId ? getProject(state.selectedProjectId) : null
        title = `${project?.name ?? "Project"} | ${appName}`
        break
      }
      case "task": {
        const task = state.selectedTaskId ? getTask(state.selectedTaskId) : null
        const project = state.selectedProjectId ? getProject(state.selectedProjectId) : null
        const taskLabel = task?.title ?? "Task"
        title = project ? `${taskLabel} · ${project.name} | ${appName}` : `${taskLabel} | ${appName}`
        break
      }
      default:
        title = appName
    }

    document.title = title
  }, [state.currentView, state.selectedProjectId, state.selectedTaskId, bootstrapping, authToken])

  if (bootstrapping && isLoggedIn) {
    return <LoadingSpinner label="Loading your workspace..." />
  }

  let content: ReactNode

  switch (state.currentView) {
    case "landing":
      content = <LandingPage navigate={navigate} />
      break
    case "login":
      content = <LoginPage navigate={navigate} onLogin={login} initialMode="signin" />
      break
    case "signup":
      content = <LoginPage navigate={navigate} onLogin={login} initialMode="signup" />
      break
    case "dashboard":
      content = (
        <Dashboard
          navigate={navigate}
          onLogout={logout}
          isAdmin={isAdminUser(CURRENT_USER)}
        />
      )
      break
    case "projects":
      content = <ProjectsPage navigate={navigate} onLogout={logout} />
      break
    case "personal":
      content = <PersonalTasksPage navigate={navigate} onLogout={logout} />
      break
    case "project":
      content = (
        <ProjectDetail
          key={state.selectedProjectId!}
          projectId={state.selectedProjectId!}
          navigate={navigate}
          onLogout={logout}
        />
      )
      break
    case "task":
      content = (
        <TaskDetail
          key={`${state.selectedProjectId!}:${state.selectedTaskId!}`}
          taskId={state.selectedTaskId!}
          projectId={state.selectedProjectId!}
          navigate={navigate}
          onLogout={logout}
        />
      )
      break
    case "tasks":
      content = <TasksPage navigate={navigate} onLogout={logout} />
      break
    case "team":
      content = <TeamPage navigate={navigate} onLogout={logout} />
      break
    case "profile":
      content = <ProfilePage navigate={navigate} onLogout={logout} />
      break
    case "admin":
      content = <AdminCMS navigate={navigate} onLogout={logout} />
      break
    default:
      content = <LandingPage navigate={navigate} />
  }

  return (
    <AppErrorBoundary
      onReset={() => {
        window.history.replaceState({}, "", "/dashboard")
        setState({
          currentView: "dashboard",
          selectedProjectId: null,
          selectedTaskId: null,
        })
      }}
    >
      {content}
    </AppErrorBoundary>
  )
}
