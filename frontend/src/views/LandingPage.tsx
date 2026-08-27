import { type View } from "../App"
import { Button } from "../components/ui"
import { BoltIcon, CheckCircleIcon, ProjectIcon, ShieldLockIcon } from "../components/icons"

const FEATURES = [
  {
    icon: <ProjectIcon className="w-7 h-7" />,
    title: "Projects that stay organized",
    desc: "Keep ownership, membership, and progress in one place so every team knows what is happening.",
  },
  {
    icon: <CheckCircleIcon className="w-7 h-7" />,
    title: "Tasks that are easy to track",
    desc: "See status, priority, due dates, and assignees without digging through hidden menus.",
  },
  {
    icon: <ShieldLockIcon className="w-7 h-7" />,
    title: "Roles that stay clear",
    desc: "Keep project owners in control while members focus on the work assigned to them.",
  },
  {
    icon: <BoltIcon className="w-7 h-7" />,
    title: "Work that keeps moving",
    desc: "Let teams claim open tasks, track progress, and keep deadlines visible in one place.",
  },
]

export default function LandingPage({ navigate }: { navigate: (view: View) => void }) {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "Inter, sans-serif" }}>
      <nav className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <button className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("landing")}>
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg" style={{ fontFamily: "Outfit, sans-serif" }}>
              TaskFlow
            </span>
          </button>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("login")}>
              Sign in
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate("signup")}>
              Sign up
            </Button>
          </div>
        </div>
      </nav>

      <section className="relative overflow-hidden px-4 pt-24 pb-20">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(91,95,239,0.12) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-8 border border-indigo-100">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Live task management for real teams
          </div>

          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.05] tracking-tight mb-6"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Plan work.
            <br />
            <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #5b5fef 0%, #8b5cf6 100%)" }}>
              Ship together.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            TaskFlow helps teams organize projects, assign ownership, claim open work, and keep delivery moving from kickoff to completion.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="primary" size="lg" onClick={() => navigate("signup")} className="w-full sm:w-auto">
              Sign up
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-3xl border border-gray-100 bg-gray-50 overflow-hidden shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
              <div className="bg-white p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Example workspace</p>
                <div className="space-y-3">
                  {[
                    { label: "Projects", value: "6 active" },
                    { label: "Open tasks", value: "18" },
                    { label: "Team members", value: "12" },
                    { label: "Due this week", value: "4" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-3">
                      <span className="text-sm text-gray-500">{item.label}</span>
                      <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900">Workspace snapshot</h3>
                  <span className="text-xs text-gray-400">Sample project setup</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {[
                    { name: "Website Redesign", status: "In progress", color: "#5b5fef" },
                    { name: "Mobile App v2", status: "Review", color: "#8b5cf6" },
                    { name: "API Migration", status: "Planning", color: "#10b981" },
                  ].map((project) => (
                    <div key={project.name} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: project.color }}>
                          {project.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-500">{project.status}</span>
                      </div>
                      <div className="text-sm font-semibold text-gray-900 mb-1">{project.name}</div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: "62%", backgroundColor: project.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">Priority tasks</h4>
                    <span className="text-xs text-gray-400">Example priorities</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      "Finalize dashboard filters",
                      "Review assignment flow",
                      "QA auth redirects",
                    ].map((task, index) => (
                      <div key={task} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
                        <span className="text-sm text-gray-700">{task}</span>
                        <span className="text-xs font-medium text-indigo-600">
                          {["High", "Medium", "Urgent"][index]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
              Built for teams doing real project work
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Keep projects visible, tasks actionable, and responsibilities clear across the whole team.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "Outfit, sans-serif" }}>
            Ready to organize your next project
          </h2>
          <p className="text-gray-500 text-lg mb-8">
            Sign in to access your projects, tasks, and admin tools backed by MySQL.
          </p>
          <Button variant="primary" size="lg" onClick={() => navigate("login")} className="mx-auto">
            Sign in now
          </Button>
        </div>
      </section>
    </div>
  )
}
