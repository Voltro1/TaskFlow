import { useState } from "react"
import { type View } from "../App"
import AppShell from "../components/AppShell"
import { Card, Button, StatusBadge, PriorityBadge, SearchBar, Select, Modal, EmptyState } from "../components/ui"
import { PERSONAL_TASKS, loadTaskFlowData } from "../data"
import { TaskForm } from "../components/forms"
import { apiJson } from "../lib/api"
import { projectSurfaceStyle } from "../lib/color"

export default function PersonalTasksPage({
  navigate,
  onLogout,
}: {
  navigate: (view: View, opts?: { projectId?: string; taskId?: string }) => void
  onLogout: () => void
}) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<(typeof PERSONAL_TASKS)[number] | null>(null)
  const [deleting, setDeleting] = useState<(typeof PERSONAL_TASKS)[number] | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [rows, setRows] = useState(PERSONAL_TASKS)
  const [error, setError] = useState("")

  const visible = rows.filter((task) => {
    const matchSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      task.description.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || task.status === statusFilter
    const matchPriority = priorityFilter === "all" || task.priority === priorityFilter
    return matchSearch && matchStatus && matchPriority
  })

  const saveTask = async (data: {
    title: string
    description: string
    projectId: string
    assigneeId: string
    status: string
    priority: string
    dueDate: string
    color: string
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
            notes: data.notes,
            status: data.status.replace("-", "_"),
            priority: data.priority,
            color: data.color,
            dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
          }),
        })
      } else {
        await apiJson("/api/personal-tasks", {
          method: "POST",
          body: JSON.stringify({
            title: data.title,
            description: data.description,
            notes: data.notes,
            status: data.status.replace("-", "_"),
            priority: data.priority,
            color: data.color,
            dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
          }),
        })
      }
      await loadTaskFlowData()
      setRows([...PERSONAL_TASKS])
      setCreateOpen(false)
      setEditing(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the personal task.")
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
      setRows([...PERSONAL_TASKS])
      setDeleting(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete the personal task.")
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <AppShell navigate={navigate} onLogout={onLogout} activeView="personal">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Personal Tasks
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Your private task list, separate from team projects.</p>
          </div>
          <Button variant="primary" onClick={() => { setEditing(null); setCreateOpen(true) }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New personal task
          </Button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="flex flex-wrap items-center gap-3 mb-6">
          <SearchBar value={search} onChange={setSearch} placeholder="Search personal tasks..." />
          <Select value={statusFilter} onChange={setStatusFilter} options={[
            { label: "All statuses", value: "all" },
            { label: "To Do", value: "todo" },
            { label: "In Progress", value: "in-progress" },
            { label: "In Review", value: "in-review" },
            { label: "Done", value: "done" },
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
            title="No personal tasks found"
            description="Create a private task to keep track of work outside your team projects."
            action={<Button variant="secondary" onClick={() => { setSearch(""); setStatusFilter("all"); setPriorityFilter("all") }}>Clear filters</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {visible.map((task) => {
              return (
                <Card key={task.id} hover onClick={() => { setEditing(task); setCreateOpen(true) }} className="p-4" style={projectSurfaceStyle(task.color ?? "#5b5fef")}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <button onClick={() => { setEditing(task); setCreateOpen(true) }} className="text-left">
                        <h3 className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors">{task.title}</h3>
                      </button>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                    </div>
                  </div>
                  <div className="mb-4" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "No due date"}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setEditing(task); setCreateOpen(true) }}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDeleting(task) }}>Delete</Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setEditing(null) }} title={editing ? "Edit personal task" : "New personal task"} width="max-w-xl">
        <TaskForm
          allowNoProject
          initial={editing ? {
            title: editing.title,
            description: editing.description,
            projectId: "",
            assigneeId: "",
            status: editing.status,
            priority: editing.priority,
            dueDate: editing.dueDate ?? "",
            color: editing.color ?? "#5b5fef",
            notes: editing.notes ?? "No extra details",
          } : undefined}
          onSave={saveTask}
          onCancel={() => { setCreateOpen(false); setEditing(null) }}
        />
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete personal task?">
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
