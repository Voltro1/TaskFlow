import { getStoredToken } from "./lib/api"

export const PLATFORM_ADMIN_EMAIL = "voltro.oc@gmail.com"
const DATA_CHANGED_EVENT = "taskflow:data-changed"

export interface User {
  id: string
  name: string
  username: string
  email: string
  avatar: string
  profileImageData?: string | null
  role: "admin" | "member"
}

export interface Project {
  id: string
  name: string
  description: string
  status: "active" | "on-hold" | "completed" | "archived"
  color: string
  ownerId: string
  currentUserRole?: "owner" | "admin" | "member"
  memberIds: string[]
  members?: { userId: string; role: "owner" | "admin" | "member" }[]
  taskCount: number
  completedTaskCount: number
  dueDate: string
  createdAt: string
  tags: string[]
  imageData?: string | null
}

export interface Task {
  id: string
  projectId: string
  title: string
  description: string
  status: "todo" | "in-progress" | "in-review" | "done"
  priority: "low" | "medium" | "high" | "urgent"
  assigneeId: string | null
  color?: string | null
  notes?: string
  dueDate: string | null
  createdAt: string
  tags: string[]
}

type AdminMetrics = {
  users: number
  admins: number
  activeProjects: number
  newUsers: number
  disabledUsers: number
}

const COLORS = ["#5b5fef", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"]
const ROLE_WEIGHT: Record<User["role"], number> = { member: 1, admin: 2 }

async function request<T>(path: string, token = getStoredToken()): Promise<T> {
  const response = await fetch(path, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Request failed")
  }

  return payload as T
}

async function fetchAllPages<T>(path: string, token = getStoredToken(), key: "projects" | "tasks" | "users") {
  const all: T[] = []
  let page = 1
  let totalPages = 1

  do {
    const separator = path.includes("?") ? "&" : "?"
    const payload = await request<{ data: Record<string, T[]>; meta?: { pagination?: { pages?: number } } }>(
      `${path}${separator}page=${page}&limit=100`,
      token,
    )
    all.push(...(payload.data[key] ?? []))
    totalPages = payload.meta?.pagination?.pages ?? 1
    page += 1
  } while (page <= totalPages)

  return all
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function colorForId(id: string) {
  const sum = [...id].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return COLORS[sum % COLORS.length]
}

function mapRole(role: string | undefined): User["role"] {
  if (role === "admin") return "admin"
  return "member"
}

export function normalizeEmail(email: string | null | undefined) {
  const normalized = String(email ?? "").trim().toLowerCase()
  const [localPart, domain] = normalized.split("@")
  if (!localPart || !domain) return normalized
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const canonicalLocalPart = localPart.split("+")[0].replace(/\./g, "")
    return `${canonicalLocalPart}@gmail.com`
  }
  return normalized
}

export function isPlatformAdminEmail(email: string | null | undefined) {
  return normalizeEmail(email) === normalizeEmail(PLATFORM_ADMIN_EMAIL)
}

export function isAdminUser(user: Pick<User, "role" | "email"> | null | undefined) {
  if (!user) return false
  return user.role === "admin" || isPlatformAdminEmail(user.email)
}

export function notifyTaskFlowDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(DATA_CHANGED_EVENT))
  }
}

export function subscribeToTaskFlowDataChange(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {}
  }
  const handler = () => onChange()
  window.addEventListener(DATA_CHANGED_EVENT, handler)
  return () => window.removeEventListener(DATA_CHANGED_EVENT, handler)
}

function pickHigherRole(current: User["role"] | undefined, incoming: User["role"]) {
  if (!current) return incoming
  return ROLE_WEIGHT[incoming] > ROLE_WEIGHT[current] ? incoming : current
}

function upsertUser(
  map: Map<string, User>,
  input: Partial<User> & { id: string; name: string; email: string; role?: User["role"] },
) {
  const existing = map.get(input.id)
  const role = pickHigherRole(existing?.role, input.role ?? "member")
  map.set(input.id, {
    id: input.id,
    name: input.name,
    username: input.username ?? existing?.username ?? input.name.toLowerCase().replace(/\s+/g, "."),
    email: input.email,
    avatar: initials(input.name),
    profileImageData: input.profileImageData ?? existing?.profileImageData ?? null,
    role: isPlatformAdminEmail(input.email) ? "admin" : role,
  })
}

export let USERS: User[] = []
export let PROJECTS: Project[] = []
export let TASKS: Task[] = []
export let PERSONAL_TASKS: Task[] = []
export let ADMIN_METRICS: AdminMetrics | null = null
export let CURRENT_USER: User | null = null

export async function loadTaskFlowData() {
  const token = getStoredToken()
  if (!token) {
    USERS = []
    PROJECTS = []
    TASKS = []
    PERSONAL_TASKS = []
    ADMIN_METRICS = null
    CURRENT_USER = null
    notifyTaskFlowDataChanged()
    return
  }

  const mePayload = await request<{ data: { user: { id: number; name: string; username: string; email: string; role: "user" | "admin"; profileImageData?: string | null } } }>(
    "/api/auth/me",
    token,
  )
  const me = mePayload.data.user

  const current: User = {
    id: String(me.id),
    name: me.name,
    username: me.username,
    email: me.email,
    avatar: initials(me.name),
    role: isPlatformAdminEmail(me.email) ? "admin" : mapRole(me.role),
    profileImageData: me.profileImageData ?? null,
  }

  CURRENT_USER = current

  const projectsPayload = await fetchAllPages<{
    id: number
    name: string
    description: string
    ownerId: number
    owner?: { id: number; name: string; username: string; email: string; role: "user" | "admin" }
    members?: { user: { id: number; name: string; username: string; email: string; role: "user" | "admin" }; role: string }[]
    archived: boolean
    createdAt: string
    color?: string
    imageData?: string | null
  }>("/api/projects", token, "projects")

  const userMap = new Map<string, User>()
  upsertUser(userMap, current)

  const taskRows: Array<{
    id: number
    projectId: number
    title: string
    description: string
    status: "todo" | "in_progress" | "in_review" | "done"
    priority: "low" | "medium" | "high" | "urgent"
    progress: number
    color?: string | null
    notes?: string | null
    assignee?: { id: number; name: string; username: string; email: string; role: "user" | "admin" }
    dueDate: string | null
    createdBy?: { id: number; name: string; username: string; email: string; role: "user" | "admin" }
    createdAt: string
  }> = []

  const personalTaskRows: Array<{
    id: number
    title: string
    description: string
    status: "todo" | "in_progress" | "in_review" | "done"
    priority: "low" | "medium" | "high" | "urgent"
    color?: string | null
    notes?: string | null
    assignee?: { id: number; name: string; username: string; email: string; role: "user" | "admin" } | null
    dueDate: string | null
    createdAt: string
  }> = []

  const hydratedProjects: Project[] = []

  for (const project of projectsPayload) {
    if (project.owner) {
      upsertUser(userMap, {
        id: String(project.owner.id),
        name: project.owner.name,
        username: project.owner.username,
        email: project.owner.email,
        role: mapRole(project.owner.role),
      })
    }

    for (const member of project.members ?? []) {
      upsertUser(userMap, {
        id: String(member.user.id),
        name: member.user.name,
        username: member.user.username,
        email: member.user.email,
        role: mapRole(member.role),
      })
    }

    const taskPayload = await fetchAllPages<{
      id: number
      projectId: number
      title: string
      description: string
      status: "todo" | "in_progress" | "in_review" | "done"
      priority: "low" | "medium" | "high" | "urgent"
      assignee?: { id: number; name: string; username: string; email: string; role: "user" | "admin" } | null
      createdBy?: { id: number; name: string; username: string; email: string; role: "user" | "admin" } | null
      dueDate: string | null
      createdAt: string
    }>(`/api/projects/${project.id}/tasks`, token, "tasks")

    taskRows.push(...taskPayload)

    for (const task of taskPayload) {
      if (task.assignee) {
        upsertUser(userMap, {
          id: String(task.assignee.id),
          name: task.assignee.name,
          username: task.assignee.username,
          email: task.assignee.email,
          role: mapRole(task.assignee.role),
        })
      }
      if (task.createdBy) {
        upsertUser(userMap, {
          id: String(task.createdBy.id),
          name: task.createdBy.name,
          username: task.createdBy.username,
          email: task.createdBy.email,
          role: mapRole(task.createdBy.role),
        })
      }
    }

    const totalTasks = taskPayload.length
    const completedTasks = taskPayload.filter((task) => task.status === "done").length
    const projectDue = taskPayload
      .map((task) => task.dueDate)
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)))
      .at(-1)

    hydratedProjects.push({
      id: String(project.id),
      name: project.name,
      description: project.description,
      status: project.archived ? "archived" : completedTasks === totalTasks && totalTasks > 0 ? "completed" : "active",
      color: project.color ?? colorForId(String(project.id)),
      ownerId: String(project.ownerId),
      currentUserRole:
        String(project.ownerId) === current.id
          ? "owner"
          : project.members?.find((member) => String(member.user.id) === current.id)?.role === "admin"
            ? "admin"
            : "member",
      memberIds: Array.from(
        new Set([
          String(project.ownerId),
          ...(project.members ?? []).map((member) => String(member.user.id)),
        ]),
      ),
      members: [
        { userId: String(project.ownerId), role: "owner" },
        ...(project.members ?? []).map((member) => ({
          userId: String(member.user.id),
          role: member.role === "admin" || member.role === "owner" ? "admin" : "member",
        })),
      ],
      taskCount: totalTasks,
      completedTaskCount: completedTasks,
      dueDate: projectDue ?? project.createdAt,
      createdAt: project.createdAt,
      tags: [],
      imageData: project.imageData ?? null,
    })
  }

  const personalPayload = await fetchAllPages<{
    id: number
    title: string
    description: string
    status: "todo" | "in_progress" | "in_review" | "done"
    priority: "low" | "medium" | "high" | "urgent"
    assignee?: { id: number; name: string; username: string; email: string; role: "user" | "admin" } | null
    dueDate: string | null
    createdAt: string
  }>("/api/personal-tasks", token, "tasks")

  personalTaskRows.push(...personalPayload)

  for (const task of personalPayload) {
    if (task.assignee) {
      upsertUser(userMap, {
        id: String(task.assignee.id),
        name: task.assignee.name,
        username: task.assignee.username,
        email: task.assignee.email,
        role: mapRole(task.assignee.role),
      })
    }
  }

  const adminUsersPayload: Array<{
    id: number
    name: string
    username: string
    email: string
    role: "user" | "admin"
    isActive: boolean
    createdAt: string
    profileImageData?: string | null
  }> = []

  if (isAdminUser(CURRENT_USER)) {
    try {
      const usersPayload = await fetchAllPages<{
        id: number
        name: string
        username: string
        email: string
        role: "user" | "admin"
        isActive: boolean
        createdAt: string
        profileImageData?: string | null
      }>("/api/users", token, "users")

      adminUsersPayload.push(...usersPayload)
    } catch {
      // Keep bootstrapping the workspace even if admin-only user management data fails.
    }
  }

  for (const user of adminUsersPayload) {
    upsertUser(userMap, {
      id: String(user.id),
      name: user.name,
      username: user.username,
      email: user.email,
      role: mapRole(user.role),
      profileImageData: user.profileImageData ?? null,
    })
  }

  USERS = Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  PROJECTS = hydratedProjects.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  TASKS = taskRows
    .map((task) => ({
      id: String(task.id),
      projectId: String(task.projectId),
      title: task.title,
      description: task.description,
      status: task.status === "in_progress" ? "in-progress" : task.status === "in_review" ? "in-review" : task.status,
      priority: task.priority,
      assigneeId: task.assignee ? String(task.assignee.id) : null,
      color: task.color ?? null,
      notes: task.notes ?? "No extra details",
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      tags: [],
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  PERSONAL_TASKS = personalTaskRows
    .map((task) => ({
      id: String(task.id),
      projectId: "",
      title: task.title,
      description: task.description,
      status: task.status === "in_progress" ? "in-progress" : task.status === "in_review" ? "in-review" : task.status,
      priority: task.priority,
      assigneeId: task.assignee ? String(task.assignee.id) : null,
      color: task.color ?? "#5b5fef",
      notes: task.notes ?? "No extra details",
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      tags: [],
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  ADMIN_METRICS = {
    users: USERS.length,
    admins: USERS.filter((user) => user.role === "admin").length,
    activeProjects: PROJECTS.filter((project) => project.status === "active").length,
    newUsers: 0,
    disabledUsers: 0,
  }

  if (isAdminUser(CURRENT_USER)) {
    try {
      const metricsPayload = await request<{ data: { metrics: AdminMetrics } }>("/api/admin/dashboard", token)
      ADMIN_METRICS = metricsPayload.data.metrics
    } catch {
      // Fall back to locally derived metrics so admin accounts can still load the app.
    }
  }

  notifyTaskFlowDataChanged()
}

export function getUser(id: string) {
  return USERS.find((user) => user.id === id)
}

export function getProject(id: string) {
  return PROJECTS.find((project) => project.id === id)
}

export function getTasksForProject(projectId: string) {
  return TASKS.filter((task) => task.projectId === projectId)
}

export function getTask(id: string) {
  return TASKS.find((task) => task.id === id)
}

export function mapApiTask(task: {
  id: number
  projectId?: number | null
  title: string
  description: string
  status: "todo" | "in_progress" | "in_review" | "done"
  priority: "low" | "medium" | "high" | "urgent"
  assignee?: { id: number } | null
  dueDate: string | null
  createdAt: string
  color?: string | null
  notes?: string | null
}) {
  return {
    id: String(task.id),
    projectId: task.projectId ? String(task.projectId) : "",
    title: task.title,
    description: task.description,
    status: task.status === "in_progress" ? "in-progress" : task.status === "in_review" ? "in-review" : task.status,
    priority: task.priority,
    assigneeId: task.assignee ? String(task.assignee.id) : null,
    color: task.color ?? null,
    notes: task.notes ?? "No extra details",
    dueDate: task.dueDate,
    createdAt: task.createdAt,
    tags: [],
  } satisfies Task
}

export function mapApiProject(project: {
  id: number
  name: string
  description: string
  ownerId: number
  members?: { user: { id: number }; role: string }[]
  archived: boolean
  createdAt: string
  color?: string
  imageData?: string | null
}) {
  return {
    id: String(project.id),
    name: project.name,
    description: project.description,
    status: project.archived ? "archived" : "active",
    color: project.color ?? colorForId(String(project.id)),
    ownerId: String(project.ownerId),
    currentUserRole:
      CURRENT_USER?.id === String(project.ownerId)
        ? "owner"
        : project.members?.find((member) => String(member.user.id) === CURRENT_USER?.id)?.role === "admin"
          ? "admin"
          : "member",
    memberIds: Array.from(new Set([String(project.ownerId), ...(project.members ?? []).map((member) => String(member.user.id))])),
    members: [
      { userId: String(project.ownerId), role: "owner" as const },
      ...(project.members ?? []).map((member) => ({
        userId: String(member.user.id),
        role: member.role === "admin" ? "admin" as const : "member" as const,
      })),
    ],
    taskCount: 0,
    completedTaskCount: 0,
    dueDate: project.createdAt,
    createdAt: project.createdAt,
    tags: [],
    imageData: project.imageData ?? null,
  } satisfies Project
}
