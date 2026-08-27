import { useState } from "react"
import { type View } from "../App"
import AppShell from "../components/AppShell"
import {
  Card,
  StatCard,
  Button,
  SearchBar,
  Select,
  Progress,
  AvatarGroup,
  ProjectAvatar,
  StatusBadge,
  EmptyState,
} from "../components/ui"
import { CURRENT_USER, PROJECTS, getUser, isAdminUser, type Project } from "../data"
import { completionPercent } from "../lib/metrics"
import { CheckCircleIcon, ProjectIcon, TrophyIcon } from "../components/icons"
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
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <ProjectAvatar name={project.name} color={project.color} imageData={project.imageData ?? null} />
        <StatusBadge status={project.status} />
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{project.name}</h3>
      <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-2">{project.description}</p>
      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>{project.completedTaskCount}/{project.taskCount} tasks</span>
          <span className="font-medium">{pct}%</span>
        </div>
        <Progress value={pct} color={project.color} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
        <AvatarGroup initials={members} />
        <div className="text-xs text-gray-400">
          Due {new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </div>
    </Card>
  )
}

export default function Dashboard({
  navigate,
  onLogout,
}: {
  navigate: (view: View, opts?: { projectId?: string }) => void
  onLogout: () => void
  isAdmin: boolean
}) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const showAdmin = isAdminUser(CURRENT_USER)

  const filtered = PROJECTS.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "all" || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const activeCount = PROJECTS.filter((p) => p.status === "active").length
  const completedCount = PROJECTS.filter((p) => p.status === "completed").length
  const totalTasks = PROJECTS.reduce((s, p) => s + p.taskCount, 0)
  const completedTasks = PROJECTS.reduce((s, p) => s + p.completedTaskCount, 0)
  const completionRate = completionPercent(completedTasks, totalTasks)

  return (
    <AppShell navigate={navigate} onLogout={onLogout} activeView="dashboard">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
              Good morning, {CURRENT_USER?.name.split(" ")[0] ?? "there"}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Here's what's happening across your workspace.</p>
          </div>
          {showAdmin && (
            <Button variant="primary" onClick={() => navigate("admin")}>
              Open Admin CMS
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Active projects"
            value={activeCount}
            change="+2 this month"
            icon={<ProjectIcon className="w-5 h-5" />}
            color="indigo"
          />
          <StatCard
            label="Total tasks"
            value={totalTasks}
            change="+14 this week"
            icon={<CheckCircleIcon className="w-5 h-5" />}
            color="purple"
          />
          <StatCard
            label="Completed tasks"
            value={completedTasks}
            change={`${completionRate}% rate`}
            icon={<CheckCircleIcon className="w-5 h-5" />}
            color="green"
          />
          <StatCard
            label="Projects done"
            value={completedCount}
            icon={<TrophyIcon className="w-5 h-5" />}
            color="amber"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search projects..."
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
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

        {/* Project grid */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            }
            title="No projects found"
            description="Try adjusting your search or filter to find what you're looking for."
            action={<Button variant="secondary" onClick={() => { setSearch(""); setStatusFilter("all") }}>Clear filters</Button>}
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
    </AppShell>
  )
}
