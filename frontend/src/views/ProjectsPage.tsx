import { useState } from "react"
import { type View } from "../App"
import AppShell from "../components/AppShell"
import {
  Card,
  SearchBar,
  Select,
  Button,
  Progress,
  AvatarGroup,
  ProjectAvatar,
  StatusBadge,
  Modal,
  Input,
  EmptyState,
} from "../components/ui"
import { PROJECTS, getUser, loadTaskFlowData, type Project } from "../data"
import { apiJson } from "../lib/api"
import { completionPercent } from "../lib/metrics"
import { projectSurfaceStyle } from "../lib/color"

function ProjectCard({
  project,
  onClick,
}: {
  project: Project
  onClick: () => void
}) {
  const pct = completionPercent(project.completedTaskCount, project.taskCount)
  const members = project.memberIds.map((id) => getUser(id)?.avatar ?? "?")

  return (
    <Card hover onClick={onClick} className="p-5" style={projectSurfaceStyle(project.color)}>
      <div className="flex items-start justify-between mb-4">
        <ProjectAvatar name={project.name} color={project.color} imageData={project.imageData ?? null} />
        <StatusBadge status={project.status} />
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{project.name}</h3>
      <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">{project.description}</p>

      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{project.completedTaskCount}/{project.taskCount} tasks</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <Progress value={pct} color={project.color} />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <AvatarGroup initials={members} />
        <div className="text-xs text-gray-400">
          Due {new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </div>
    </Card>
  )
}

export default function ProjectsPage({
  navigate,
  onLogout,
}: {
  navigate: (view: View, opts?: { projectId?: string }) => void
  onLogout: () => void
}) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [showModal, setShowModal] = useState(false)
  const [newProject, setNewProject] = useState({ name: "", description: "", color: "#5b5fef", imageData: "" })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  const filtered = PROJECTS.filter((project) => {
    const matchSearch =
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.description.toLowerCase().includes(search.toLowerCase())
    const matchStatus = status === "all" || project.status === status
    return matchSearch && matchStatus
  })

  const activeCount = PROJECTS.filter((project) => project.status === "active").length
  const completedCount = PROJECTS.filter((project) => project.status === "completed").length
  const totalTasks = PROJECTS.reduce((sum, project) => sum + project.taskCount, 0)

  const createProject = async () => {
    if (!newProject.name.trim()) {
      setError("Project name is required.")
      return
    }
    setCreating(true)
    setError("")
    try {
      await apiJson("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newProject.name,
          description: newProject.description,
          color: newProject.color,
          imageData: newProject.imageData || null,
        }),
      })
      await loadTaskFlowData()
      setNewProject({ name: "", description: "", color: "#5b5fef", imageData: "" })
      setShowModal(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create the project.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <AppShell navigate={navigate} onLogout={onLogout} activeView="projects">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Projects
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Everything in one place: status, progress, and ownership.</p>
          </div>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create project
          </Button>
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="text-2xl font-bold text-gray-900">{PROJECTS.length}</div>
            <div className="text-xs text-gray-400">Total projects</div>
          </Card>
          <Card className="p-5">
            <div className="text-2xl font-bold text-gray-900">{activeCount}</div>
            <div className="text-xs text-gray-400">Active</div>
          </Card>
          <Card className="p-5">
            <div className="text-2xl font-bold text-gray-900">{completedCount}</div>
            <div className="text-xs text-gray-400">Completed</div>
          </Card>
          <Card className="p-5">
            <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
            <div className="text-xs text-gray-400">Total tasks</div>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <SearchBar value={search} onChange={setSearch} placeholder="Search projects..." />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              { label: "All statuses", value: "all" },
              { label: "Active", value: "active" },
              { label: "On Hold", value: "on-hold" },
              { label: "Completed", value: "completed" },
              { label: "Archived", value: "archived" },
            ]}
          />
          <div className="text-sm text-gray-400 ml-auto">
            {filtered.length} of {PROJECTS.length} projects
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No projects found"
            description="Try a different search term or status filter."
            action={<Button variant="secondary" onClick={() => { setSearch(""); setStatus("all") }}>Clear filters</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => navigate("project", { projectId: project.id })}
              />
            ))}
          </div>
        )}
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create new project">
        <div className="space-y-4">
          <Input
            label="Project name"
            placeholder="e.g. Website Redesign"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              rows={3}
              placeholder="What will this project help your team deliver?"
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
            />
          </div>
          <Input
            label="Project color"
            placeholder="#5b5fef"
            value={newProject.color}
            onChange={(e) => setNewProject({ ...newProject, color: e.target.value })}
          />
          <Input
            label="Project image data URL"
            placeholder="Paste an image data URL or add one later"
            value={newProject.imageData}
            onChange={(e) => setNewProject({ ...newProject, imageData: e.target.value })}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1 justify-center">
              Cancel
            </Button>
            <Button variant="primary" onClick={createProject} disabled={creating} className="flex-1 justify-center">
              {creating ? "Creating…" : "Create project"}
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  )
}
