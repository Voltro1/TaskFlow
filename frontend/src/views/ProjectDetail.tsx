import { useEffect, useState, type CSSProperties } from "react"
import { type View } from "../App"
import AppShell from "../components/AppShell"
import {
  Card,
  Button,
  Input,
  Progress,
  StatusBadge,
  PriorityBadge,
  Avatar,
  ProjectAvatar,
  SearchBar,
  Select,
  Modal,
  EmptyState,
  LoadingSpinner,
  ConfirmDialog,
} from "../components/ui"
import { CURRENT_USER, getProject, getTasksForProject, getUser, loadTaskFlowData, mapApiProject, mapApiTask, type Project, type Task } from "../data"
import { TaskForm } from "../components/forms"
import { apiJson } from "../lib/api"
import { completionPercent } from "../lib/metrics"
import { projectSurfaceStyle } from "../lib/color"

function formatDate(value: string | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "—"
  return parsed.toLocaleDateString("en-US", options)
}

function dedupeMembers(project: Project) {
  const seen = new Set<string>()
  return (project.members ?? [])
    .filter((membership) => {
      if (!membership?.userId || seen.has(membership.userId)) return false
      seen.add(membership.userId)
      return true
    })
    .map((membership) => ({
      user: getUser(membership.userId),
      role: membership.role,
    }))
    .filter((entry): entry is { user: NonNullable<ReturnType<typeof getUser>>; role: "owner" | "admin" | "member" } => Boolean(entry.user))
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Unable to read file"))
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.readAsDataURL(file)
  })
}

function TaskRow({
  task,
  onClick,
  onClaim,
  claiming,
}: {
  task: Task
  onClick: () => void
  onClaim?: () => void
  claiming?: boolean
}) {
  const assignee = task.assigneeId ? getUser(task.assigneeId) : null

  return (
    <tr
      onClick={onClick}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
              task.status === "done"
                ? "border-emerald-500 bg-emerald-500"
                : "border-gray-300"
            }`}
          >
            {task.status === "done" && (
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className={`text-sm font-medium ${task.status === "done" ? "line-through text-gray-400" : "text-gray-900"}`}>
            {task.title}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={task.status} />
      </td>
      <td className="px-4 py-3">
        <PriorityBadge priority={task.priority} />
      </td>
      <td className="px-4 py-3">
        {assignee ? (
          <div className="flex items-center gap-2">
            <Avatar initials={assignee.avatar} src={assignee.profileImageData ?? undefined} size="sm" />
            <span className="text-xs text-gray-600">{assignee.name.split(" ")[0]}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Free for anyone</span>
            {onClaim ? (
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation()
                  onClaim()
                }}
                disabled={claiming}
              >
                {claiming ? "Claiming…" : "Claim"}
              </Button>
            ) : null}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {task.dueDate
          ? formatDate(task.dueDate, { month: "short", day: "numeric" })
          : "—"}
      </td>
    </tr>
  )
}

function KanbanCard({
  task,
  onClick,
  style,
}: {
  task: Task
  onClick: () => void
  style?: CSSProperties
}) {
  const assignee = task.assigneeId ? getUser(task.assigneeId) : null
  return (
    <div
      onClick={onClick}
      style={style}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-gray-900 leading-snug">{task.title}</p>
        <PriorityBadge priority={task.priority} />
      </div>
      <div className="flex items-center justify-between">
        {assignee ? <Avatar initials={assignee.avatar} src={assignee.profileImageData ?? undefined} size="sm" /> : <span />}
        {task.dueDate && (
          <span className="text-xs text-gray-400">
            {formatDate(task.dueDate, { month: "short", day: "numeric" })}
          </span>
        )}
      </div>
    </div>
  )
}

const COLUMNS: { id: Task["status"]; label: string; color: string }[] = [
  { id: "todo", label: "To Do", color: "#6b7280" },
  { id: "in-progress", label: "In Progress", color: "#5b5fef" },
  { id: "in-review", label: "In Review", color: "#f59e0b" },
  { id: "done", label: "Done", color: "#10b981" },
]

export default function ProjectDetail({
  projectId,
  navigate,
  onLogout,
}: {
  projectId: string
  navigate: (view: View, opts?: { projectId?: string; taskId?: string }) => void
  onLogout: () => void
}) {
  const cachedProject = getProject(projectId)
  const cachedTasks = getTasksForProject(projectId)
  const [project, setProject] = useState<Project | null>(cachedProject ?? null)
  const [tasks, setTasks] = useState<Task[]>(cachedTasks)
  const [loadingProject, setLoadingProject] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [search, setSearch] = useState("")
  const [priority, setPriority] = useState("all")
  const [view, setView] = useState<"list" | "board">("list")
  const [showModal, setShowModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [savingProject, setSavingProject] = useState(false)
  const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null)
  const [addMemberConfirmOpen, setAddMemberConfirmOpen] = useState(false)
  const [projectForm, setProjectForm] = useState(() => ({
    name: cachedProject?.name ?? "",
    description: cachedProject?.description ?? "",
    color: cachedProject?.color ?? "#5b5fef",
    imageData: cachedProject?.imageData ?? null as string | null,
    archived: cachedProject?.status === "archived",
  }))

  useEffect(() => {
    let active = true

    setLoadingProject(true)
    setLoadError("")
    Promise.all([
      apiJson<{ data: { project: any } }>(`/api/projects/${projectId}`),
      apiJson<{ data: { tasks: any[] } }>(`/api/projects/${projectId}/tasks`),
    ])
      .then(([projectResponse, tasksResponse]) => {
        if (!active) return
        const nextProject = mapApiProject(projectResponse.data.project)
        const nextTasks = (tasksResponse.data.tasks ?? []).map(mapApiTask)
        const completedTaskCount = nextTasks.filter((task) => task.status === "done").length
        const dueDate = nextTasks.map((task) => task.dueDate).filter(Boolean).sort((a, b) => String(a).localeCompare(String(b))).at(-1) ?? nextProject.createdAt
        setProject({
          ...nextProject,
          taskCount: nextTasks.length,
          completedTaskCount,
          dueDate,
        })
        setTasks(nextTasks)
        setProjectForm({
          name: nextProject.name,
          description: nextProject.description,
          color: nextProject.color,
          imageData: nextProject.imageData ?? null,
          archived: nextProject.status === "archived",
        })
      })
      .catch((error) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Could not load the project page.")
          setProject(null)
          setTasks([])
        }
      })
      .finally(() => {
        if (active) setLoadingProject(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

  if (loadingProject) {
    return (
      <AppShell navigate={navigate} onLogout={onLogout} activeView="project">
        <div className="p-8">
          <LoadingSpinner label="Loading project details..." />
        </div>
      </AppShell>
    )
  }

  if (!project) {
    return (
      <AppShell navigate={navigate} onLogout={onLogout} activeView="project">
        <div className="p-8">
          <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
            <p className="text-red-600 font-medium">{loadError || "Project not found."}</p>
            <Button variant="secondary" className="mt-4" onClick={() => navigate("dashboard")}>
              Back to dashboard
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  const filtered = (tasks ?? []).filter((t) => {
    const matchSearch = (t.title ?? "").toLowerCase().includes(search.toLowerCase())
    const matchPriority = priority === "all" || t.priority === priority
    return matchSearch && matchPriority
  })

  const pct = completionPercent(project.completedTaskCount, project.taskCount)
  const members = dedupeMembers(project)
  const canEditProject = ["owner", "admin"].includes(project.currentUserRole ?? "member")
  const canCreateTask = canEditProject
  const canClaimTask = ["owner", "admin", "member"].includes(project.currentUserRole ?? "member")

  const createTask = async (data: {
    title: string
    description: string
    projectId: string
    assigneeId: string
    status: string
    priority: string
    dueDate: string
    notes: string
  }) => {
    setCreating(true)
    setLoadError("")
    try {
      await apiJson(`/api/projects/${project.id}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          notes: data.notes,
          status: data.status.replace("-", "_"),
          priority: data.priority,
          assignee: data.assigneeId || null,
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        }),
      })
      await loadTaskFlowData()
      const taskResponse = await apiJson<{ data: { tasks: any[] } }>(`/api/projects/${project.id}/tasks`)
      setTasks((taskResponse.data.tasks ?? []).map(mapApiTask))
      setShowModal(false)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not create the task.")
    } finally {
      setCreating(false)
    }
  }

  const claimTask = async (taskId: string) => {
    setClaimingTaskId(taskId)
    setLoadError("")
    try {
      await apiJson(`/api/tasks/${taskId}/claim`, { method: "POST" })
      await loadTaskFlowData()
      const taskResponse = await apiJson<{ data: { tasks: any[] } }>(`/api/projects/${project.id}/tasks`)
      setTasks((taskResponse.data.tasks ?? []).map(mapApiTask))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not claim the task.")
    } finally {
      setClaimingTaskId(null)
    }
  }

  return (
    <AppShell navigate={navigate} onLogout={onLogout} activeView="project">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {loadError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>}
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
          <button
            onClick={() => navigate("dashboard")}
            className="hover:text-gray-600 transition-colors cursor-pointer"
          >
            Projects
          </button>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-medium">{project.name || "Untitled project"}</span>
        </div>

        {/* Project header */}
        <div className="flex flex-col lg:flex-row lg:items-start gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <ProjectAvatar name={project.name} color={project.color} imageData={project.imageData ?? null} />
              <div>
                <h1 className="text-xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {project.name || "Untitled project"}
                </h1>
                <StatusBadge status={project.status} />
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mb-4 max-w-2xl">
              {project.description || "No description yet."}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 lg:shrink-0">
            {[
              { label: "Total tasks", value: project.taskCount },
              { label: "Completed", value: project.completedTaskCount },
              { label: "Members", value: project.memberIds.length },
              { label: "Progress", value: `${pct}%` },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm text-center">
                <div className="text-xl font-bold text-gray-900 mb-0.5" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {s.value}
                </div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <Card className="p-5 mb-6" style={projectSurfaceStyle(project.color)}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Project progress</span>
            <span className="text-sm font-bold text-gray-900">{pct}%</span>
          </div>
          <Progress value={pct} color={project.color} />
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{project.completedTaskCount} tasks done</span>
            <span>Due {formatDate(project.dueDate, { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
        </Card>

        {/* Members */}
        <Card className="p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Team members</h3>
            <div className="flex items-center gap-2">
              {canEditProject && (
                <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
                  Project settings
                </Button>
              )}
              {canEditProject ? (
                <Button variant="ghost" size="sm" onClick={() => setAddMemberConfirmOpen(true)}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add member
                </Button>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {members.map((member) => member.user && (
              <div key={member.user.id} className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2">
                <Avatar initials={member.user.avatar} src={member.user.profileImageData ?? undefined} size="sm" />
                <div>
                  <div className="text-xs font-medium text-gray-900">{member.user.name}</div>
                  <div className="text-xs text-gray-400 capitalize">{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Tasks */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <h2 className="text-base font-semibold text-gray-900 mr-auto">
              Tasks
              <span className="ml-2 text-sm font-normal text-gray-400">({tasks.length})</span>
            </h2>
            <SearchBar value={search} onChange={setSearch} placeholder="Search tasks..." />
            <Select
              value={priority}
              onChange={setPriority}
              options={[
                { label: "All priorities", value: "all" },
                { label: "Urgent", value: "urgent" },
                { label: "High", value: "high" },
                { label: "Medium", value: "medium" },
                { label: "Low", value: "low" },
              ]}
            />
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              {(["list", "board"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-2 text-xs font-medium transition-colors cursor-pointer capitalize ${
                    view === v ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowModal(true)} disabled={!canCreateTask}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add task
            </Button>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="No tasks yet"
              description="Add the first task to get this project moving."
              action={canCreateTask ? <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>Add task</Button> : undefined}
            />
          ) : view === "list" ? (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Task", "Status", "Priority", "Assignee", "Due date"].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        onClaim={canClaimTask && !task.assigneeId ? () => claimTask(task.id) : undefined}
                        claiming={claimingTaskId === task.id}
                        onClick={() => navigate("task", { projectId: project.id, taskId: task.id })}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {COLUMNS.map((col) => {
                const colTasks = filtered.filter((t) => t.status === col.id)
                return (
                  <div key={col.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{col.label}</span>
                      <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                    </div>
                    <div className="space-y-2.5 bg-gray-50 rounded-xl p-2.5 min-h-32">
                      {colTasks.map((task) => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          style={projectSurfaceStyle(project.color)}
                          onClick={() => navigate("task", { projectId: project.id, taskId: task.id })}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add task">
        {canCreateTask ? (
          <TaskForm
            initial={{ projectId: project.id }}
            onSave={createTask}
            onCancel={() => setShowModal(false)}
          />
        ) : (
          <div className="text-sm text-gray-500">Only project admins can create or fully manage project tasks.</div>
        )}
      </Modal>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Project settings" width="max-w-xl">
        <div className="space-y-4">
          <Input label="Project name" value={projectForm.name} onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={4}
              value={projectForm.description}
              onChange={(e) => setProjectForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Project color"
              value={projectForm.color}
              onChange={(e) => setProjectForm((p) => ({ ...p, color: e.target.value }))}
              placeholder="#5b5fef"
            />
            <Input
              label="Image data URL"
              value={projectForm.imageData ?? ""}
              onChange={(e) => setProjectForm((p) => ({ ...p, imageData: e.target.value || null }))}
              placeholder="Paste an image data URL or use the upload field"
            />
          </div>
          <Input
            label="Upload image"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const dataUrl = await readFileAsDataUrl(file)
              setProjectForm((p) => ({ ...p, imageData: dataUrl }))
              e.currentTarget.value = ""
            }}
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={projectForm.archived}
              onChange={(e) => setProjectForm((p) => ({ ...p, archived: e.target.checked }))}
              className="rounded border-gray-300"
            />
            Archived
          </label>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={savingProject}
              onClick={async () => {
                setSavingProject(true)
                try {
                  const response = await apiJson<{ data: { project: any } }>(`/api/projects/${project.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                      name: projectForm.name,
                      description: projectForm.description,
                      color: projectForm.color,
                      imageData: projectForm.imageData,
                      archived: projectForm.archived,
                    }),
                  })
                  const nextProject = mapApiProject(response.data.project)
                  setProject((currentProject) =>
                    currentProject
                      ? {
                          ...currentProject,
                          ...nextProject,
                          taskCount: currentProject.taskCount,
                          completedTaskCount: currentProject.completedTaskCount,
                          dueDate: currentProject.dueDate,
                        }
                      : currentProject,
                  )
                  await loadTaskFlowData()
                  setSettingsOpen(false)
                  setLoadError("")
                } catch (error) {
                  setLoadError(error instanceof Error ? error.message : "Could not update project settings.")
                } finally {
                  setSavingProject(false)
                }
              }}
            >
              {savingProject ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={addMemberConfirmOpen}
        title="Open team management?"
        description="You’re about to leave this project and open the team screen to add or manage members."
        confirmLabel="Open team"
        onCancel={() => setAddMemberConfirmOpen(false)}
        onConfirm={() => {
          setAddMemberConfirmOpen(false)
          navigate("team")
        }}
      />
    </AppShell>
  )
}
