import { useMemo } from "react"
import { type View } from "../App"
import AppShell from "../components/AppShell"
import { Avatar, Button, Card, EmptyState } from "../components/ui"
import { PROJECTS, getUser } from "../data"
import { projectSurfaceStyle } from "../lib/color"

export default function TeamPage({
  navigate,
  onLogout,
}: {
  navigate: (view: View, opts?: { projectId?: string; taskId?: string }) => void
  onLogout: () => void
}) {
  const teams = useMemo(
    () =>
      PROJECTS.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        color: project.color,
        members: (project.members ?? [])
          .map((member) => ({
            user: getUser(member.userId),
            role: member.role,
          }))
          .filter((member): member is { user: NonNullable<ReturnType<typeof getUser>>; role: "owner" | "admin" | "member" } => Boolean(member.user)),
      })),
    [],
  )

  return (
    <AppShell navigate={navigate} onLogout={onLogout} activeView="team">
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            Team
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">See the members for every project team in one place.</p>
        </div>

        {teams.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197" />
              </svg>
            }
            title="No teams found"
            description="Create a project first to start building teams."
            action={<Button variant="secondary" onClick={() => navigate("projects")}>Open projects</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {teams.map((team) => {
              return (
                <Card key={team.id} className="p-5" style={projectSurfaceStyle(team.color)}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{team.name}</h2>
                      <p className="text-sm text-gray-500 mt-1">{team.description || "No team description yet."}</p>
                    </div>
                    <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-gray-600">
                      {team.members.length} members
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="rounded-xl bg-white/80 px-3 py-2">
                      <div className="text-xs text-gray-400">Admins</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {team.members.filter((member) => member.role === "owner" || member.role === "admin").length}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/80 px-3 py-2">
                      <div className="text-xs text-gray-400">Members</div>
                      <div className="text-lg font-semibold text-gray-900">{team.members.length}</div>
                    </div>
                    <div className="rounded-xl bg-white/80 px-3 py-2">
                      <div className="text-xs text-gray-400">Open project</div>
                      <button
                        onClick={() => navigate("project", { projectId: team.id })}
                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                      >
                        View
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {team.members.map((member) => (
                      <div key={member.user.id} className="flex items-center justify-between rounded-xl border border-white/70 bg-white/85 px-3 py-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            initials={member.user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("")}
                            src={member.user.profileImageData ?? undefined}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">{member.user.name}</div>
                            <div className="text-xs text-gray-400 truncate">{member.user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs capitalize text-gray-500">{member.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
