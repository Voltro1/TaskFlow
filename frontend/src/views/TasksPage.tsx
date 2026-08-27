import { useState } from "react"
import { type View } from "../App"
import AppShell from "../components/AppShell"
import { Card, Button, StatusBadge, PriorityBadge, Avatar, SearchBar, Select, Modal, Input, EmptyState } from "../components/ui"
import { CURRENT_USER, PROJECTS, TASKS, getProject, getUser, loadTaskFlowData } from "../data"
import { TaskForm } from "../components/forms"
import { apiJson } from "../lib/api"
import { projectSurfaceStyle } from "../lib/color"

export default function TasksPage({
  navigate,
  onLogout,
}: {
  navigate: (view: View, opts?: { projectId?: string; taskId?: string }) => void
  onLogout: () => void
}) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [projectFilter, setProjectFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<(typeof TASKS)[number] | null>(null)
  const [deleting, setDeleting] = useState<(typeof TASKS)[number] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [rows, setRows] = useState(TASKS)
  const [error, setError] = useState("")

  const visible = rows.filter((task) => {
    const matchSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.description.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || task.status === statusFilter
    const matchProject = projectFilter === "all" || task.projectId === projectFilter
    const matchPriority = priorityFilter === "all" || task.priority === priorityFilter
    return matchSearch && matchStatus && matchProject && matchPriority
  })

  const saveTask = async (data: {
    title: string
    description: string
    projectId: string
    assigneeId: string
    status: string
    priority: string
    dueDate: string
    notes: string
  }) => {
    setRefreshing(true)
    setError("")
    try {
      if (editing) {
        await apiJson(`/api/tasks/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            status: data.status.replace("-", "_"),
            priority: data.priority,
            assignee: data.assigneeId || null,
            dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
            notes: data.notes,
          }),
        })
      } else {
        await apiJson(`/api/projects/${data.projectId}/tasks`, {
          method: "POST",
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            status: data.status.replace("-", "_"),
            priority: data.priority,
            assignee: data.assigneeId || null,
            dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
            notes: data.notes,
          }),
        })
      }
      await loadTaskFlowData()
      setRows([...TASKS])
      setCreateOpen(false)
      setEditing(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the task.")
    } finally {
      setRefreshing(false)
    }
  }

  const removeTask = async () => {
    if (!deleting) return
    setRefreshing(true)
    setError("")
    try {
      await apiJson(`/api/tasks/${deleting.id}`, { method: "DELETE" })
      await loadTaskFlowData()
      setRows([...TASKS])
      setDeleting(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the task.")
    } finally {
      setRefreshing(false)
    }
  }

  const canManageProjectTasks = PROJECTS.some((project) => ["owner", "admin"].includes(project.currentUserRole ?? "member"))

  return (
    <AppShell navigate={navigate} onLogout={onLogout} activeView="tasks">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Tasks
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Review project work, status, and task urgency across your teams.</p>
          </div>
          <Button variant="primary" onClick={() => { setEditing(null); setCreateOpen(true) }} disabled={!canManageProjectTasks}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New task
          </Button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <SearchBar value={search} onChange={setSearch} placeholder="Search tasks..." />
          <Select value={statusFilter} onChange={setStatusFilter} options={[
            { label: "All statuses", value: "all" },
            { label: "To Do", value: "todo" },
            { label: "In Progress", value: "in-progress" },
            { label: "In Review", value: "in-review" },
            { label: "Done", value: "done" },
          ]} />
          <Select value={projectFilter} onChange={setProjectFilter} options={[
            { label: "All projects", value: "all" },
            ...PROJECTS.map((project) => ({ label: project.name, value: project.id })),
          ]} />
          <Select value={priorityFilter} onChange={setPriorityFilter} options={[
            { label: "All priorities", value: "all" },
            { label: "Low", value: "low" },
            { label: "Medium", value: "medium" },
            { label: "High", value: "high" },
            { label: "Urgent", value: "urgent" },
          ]} />
          <span className="text-xs text-gray-400 ml-auto">{visible.length} tasks</span>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="No tasks found"
            description="Try a different filter or create a new task."
            action={<Button variant="secondary" onClick={() => { setSearch(""); setStatusFilter("all"); setProjectFilter("all"); setPriorityFilter("all") }}>Clear filters</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visible.map((task) => {
              const project = getProject(task.projectId)
              const assignee = task.assigneeId ? getUser(task.assigneeId) : null
              return (
                <Card key={task.id} hover onClick={() => navigate("task", { projectId: task.projectId, taskId: task.id })} className="p-4" style={projectSurfaceStyle(project?.color)}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <button onClick={() => navigate("task", { projectId: task.projectId, taskId: task.id })} className="text-left">
                        <h3 className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors">{task.title}</h3>
                      </button>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    {assignee ? <Avatar initials={assignee.avatar} src={assignee.profileImageData ?? undefined} size="sm" /> : <span className="text-xs text-gray-400">Free for anyone</span>}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" disabled={!canManageProjectTasks} onClick={(e) => { e.stopPropagation(); setEditing(task); setCreateOpen(true) }}>Edit</Button>
                      <Button variant="ghost" size="sm" disabled={!canManageProjectTasks} onClick={(e) => { e.stopPropagation(); setDeleting(task) }}>Delete</Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setEditing(null) }} title={editing ? "Edit task" : "New task"} width="max-w-xl">
        <TaskForm
          initial={editing ? {
            title: editing.title,
            description: editing.description,
            projectId: editing.projectId,
            assigneeId: editing.assigneeId ?? "",
            status: editing.status,
            priority: editing.priority,
            dueDate: editing.dueDate ?? "",
            notes: editing.notes ?? "No extra details",
          } : undefined}
          onSave={saveTask}
          onCancel={() => { setCreateOpen(false); setEditing(null) }}
        />
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete task?">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">"{deleting?.title}" will be permanently removed.</p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="primary" onClick={removeTask} disabled={refreshing}>
              {refreshing ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
