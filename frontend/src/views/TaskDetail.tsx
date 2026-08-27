import { useEffect, useMemo, useState } from "react"
import { type View } from "../App"
import AppShell from "../components/AppShell"
import { Card, Button, StatusBadge, PriorityBadge, Avatar, Modal, Input, Select } from "../components/ui"
import { CURRENT_USER, getTask, getProject, getUser, loadTaskFlowData, mapApiProject, mapApiTask, type Project, type Task } from "../data"
import { apiJson } from "../lib/api"
import { projectSurfaceStyle } from "../lib/color"

export default function TaskDetail({
  taskId,
  projectId,
  navigate,
  onLogout,
}: {
  taskId: string
  projectId: string
  navigate: (view: View, opts?: { projectId?: string; taskId?: string }) => void
  onLogout: () => void
}) {
  const [task, setTask] = useState<Task | null>(getTask(taskId) ?? null)
  const [project, setProject] = useState<Project | null>(getProject(projectId) ?? null)
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [actionError, setActionError] = useState("")

  const [form, setForm] = useState(() => ({
    title: getTask(taskId)?.title ?? "",
    description: getTask(taskId)?.description ?? "",
    notes: getTask(taskId)?.notes ?? "No extra details",
    status: getTask(taskId)?.status ?? "todo",
    priority: getTask(taskId)?.priority ?? "medium",
    assigneeId: getTask(taskId)?.assigneeId ?? "",
    dueDate: getTask(taskId)?.dueDate ? getTask(taskId)!.dueDate!.slice(0, 10) : "",
  }))

  useEffect(() => {
    let active = true
    setLoading(true)
    setLoadError("")
    Promise.all([
      apiJson<{ data: { task: any } }>(`/api/tasks/${taskId}`),
      apiJson<{ data: { project: any } }>(`/api/projects/${projectId}`),
    ])
      .then(([taskResponse, projectResponse]) => {
        if (!active) return
        const nextTask = mapApiTask(taskResponse.data.task)
        const nextProject = mapApiProject(projectResponse.data.project)
        setTask(nextTask)
        setProject(nextProject)
        setForm({
          title: nextTask.title,
          description: nextTask.description,
          notes: nextTask.notes ?? "No extra details",
          status: nextTask.status,
          priority: nextTask.priority,
          assigneeId: nextTask.assigneeId ?? "",
          dueDate: nextTask.dueDate ? nextTask.dueDate.slice(0, 10) : "",
        })
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Could not load task details.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId, taskId])

  const assignee = task?.assigneeId ? getUser(task.assigneeId) : null
  const canAdministrateTask = ["owner", "admin"].includes(project?.currentUserRole ?? "member")
  const canEditAssignedStatus = Boolean(task && project?.currentUserRole === "member" && task.assigneeId === CURRENT_USER?.id)
  const canOpenEdit = canAdministrateTask || canEditAssignedStatus
  const canClaimTask = Boolean(task && !assignee && ["owner", "admin", "member"].includes(project?.currentUserRole ?? "member"))
  const assigneeOptions = [
    { label: "Free for anyone", value: "" },
    ...(project?.memberIds ?? [])
      .map((id) => getUser(id))
      .filter((member): member is NonNullable<typeof member> => Boolean(member))
      .map((member) => ({ label: member.name, value: member.id })),
  ]

  const createdOn = useMemo(() => {
    if (!task) return ""
    return new Date(task.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }, [task])

  if (loading) {
    return (
      <AppShell navigate={navigate} onLogout={onLogout} activeView="project">
        <div className="p-8 text-center">
          <p className="text-gray-500">Loading task details...</p>
        </div>
      </AppShell>
    )
  }

  if (!task || !project) {
    return (
      <AppShell navigate={navigate} onLogout={onLogout} activeView="project">
        <div className="p-8 text-center">
          <p className="text-red-600">{loadError || "Task not found."}</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate("project", { projectId })}>
            Back to project
          </Button>
        </div>
      </AppShell>
    )
  }

  const dueOn = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "No due date"

  const saveChanges = async () => {
    setSaving(true)
    setActionError("")
    try {
      const body = canAdministrateTask
        ? {
            title: form.title,
            description: form.description,
            notes: form.notes,
            status: form.status.replace("-", "_"),
            priority: form.priority,
            assignee: form.assigneeId || null,
            dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          }
        : {
            status: form.status.replace("-", "_"),
          }
      await apiJson(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })

      await loadTaskFlowData()
      const taskResponse = await apiJson<{ data: { task: any } }>(`/api/tasks/${task.id}`)
      setTask(mapApiTask(taskResponse.data.task))
      setEditOpen(false)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not save task changes.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell navigate={navigate} onLogout={onLogout} activeView="project">
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        {actionError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-6 flex-wrap">
          <button onClick={() => navigate("dashboard")} className="hover:text-gray-600 cursor-pointer transition-colors">
            Projects
          </button>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <button onClick={() => navigate("project", { projectId })} className="hover:text-gray-600 cursor-pointer transition-colors">
            {project.name}
          </button>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-medium truncate max-w-xs">{task.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Card className="p-6" style={projectSurfaceStyle(project.color)}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-xl font-bold text-gray-900 leading-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {task.title}
                </h1>
                <div className="flex items-center gap-2">
                  {canClaimTask ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={claiming}
                      onClick={async () => {
                        setClaiming(true)
                        setActionError("")
                        try {
                          await apiJson(`/api/tasks/${task.id}/claim`, { method: "POST" })
                          await loadTaskFlowData()
                          const taskResponse = await apiJson<{ data: { task: any } }>(`/api/tasks/${task.id}`)
                          setTask(mapApiTask(taskResponse.data.task))
                        } catch (error) {
                          setActionError(error instanceof Error ? error.message : "Could not claim the task.")
                        } finally {
                          setClaiming(false)
                        }
                      }}
                    >
                      {claiming ? "Claiming…" : "Claim"}
                    </Button>
                  ) : null}
                  {canOpenEdit ? (
                    <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-5">
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
            </Card>

            <Card className="p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Task notes</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{task.notes || "No extra details"}</p>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Details</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Status</div>
                  <div className="text-sm text-gray-700 capitalize">{task.status.replace("-", " ")}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Priority</div>
                  <div className="text-sm text-gray-700 capitalize">{task.priority}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Project</div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: project.color }} />
                    <span className="text-sm text-gray-700">{project.name}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Assignee</div>
                  {assignee ? (
                    <div className="flex items-center gap-2">
                      <Avatar initials={assignee.avatar} src={assignee.profileImageData ?? undefined} size="sm" />
                      <span className="text-sm text-gray-700">{assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Free for anyone</span>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Due date</div>
                  <span className="text-sm text-gray-700">{dueOn}</span>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Created</div>
                  <span className="text-sm text-gray-700">{createdOn}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Modal open={editOpen && canOpenEdit} onClose={() => setEditOpen(false)} title={canAdministrateTask ? "Edit task" : "Update task status"}>
        <div className="space-y-4">
          {canAdministrateTask ? (
            <>
              <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Task notes</label>
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
              Members can only update the status of tasks assigned to them.
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Status</label>
              <Select
                value={form.status}
                onChange={(value) => setForm((p) => ({ ...p, status: value }))}
                options={[
                  { label: "To Do", value: "todo" },
                  { label: "In Progress", value: "in-progress" },
                  { label: "In Review", value: "in-review" },
                  { label: "Done", value: "done" },
                ]}
              />
            </div>
            {canAdministrateTask ? (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <Select
                  value={form.priority}
                  onChange={(value) => setForm((p) => ({ ...p, priority: value }))}
                  options={[
                    { label: "Low", value: "low" },
                    { label: "Medium", value: "medium" },
                    { label: "High", value: "high" },
                    { label: "Urgent", value: "urgent" },
                  ]}
                />
              </div>
            ) : null}
          </div>
          {canAdministrateTask ? (
            <>
              <Input
                label="Due date"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Assignee</label>
                <Select
                  value={form.assigneeId}
                  onChange={(value) => setForm((p) => ({ ...p, assigneeId: value }))}
                  options={assigneeOptions}
                />
              </div>
            </>
          ) : null}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveChanges} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
