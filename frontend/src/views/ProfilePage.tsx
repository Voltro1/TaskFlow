import { useMemo, useRef, useState } from "react"
import { type View } from "../App"
import AppShell from "../components/AppShell"
import { Avatar, Button, Card, Input, LoadingSpinner } from "../components/ui"
import { CURRENT_USER, isAdminUser, isPlatformAdminEmail, loadTaskFlowData } from "../data"
import { apiJson } from "../lib/api"

const MAX_IMAGE_SIZE = 1_000_000
const SUPPORTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"]

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Unable to read file"))
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.readAsDataURL(file)
  })
}

export default function ProfilePage({
  navigate,
  onLogout,
}: {
  navigate: (view: View, opts?: { projectId?: string; taskId?: string }) => void
  onLogout: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const current = CURRENT_USER
  const showAdmin = isAdminUser(current)
  const showManager = isPlatformAdminEmail(current?.email)
  const [name, setName] = useState(current?.name ?? "")
  const [username, setUsername] = useState(current?.username ?? "")
  const [email, setEmail] = useState(current?.email ?? "")
  const [profileImageData, setProfileImageData] = useState<string | null>(current?.profileImageData ?? null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [passwordCurrent, setPasswordCurrent] = useState("")
  const [passwordNext, setPasswordNext] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [uploadError, setUploadError] = useState("")

  const initials = useMemo(
    () =>
      (name || current?.name || "Account")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join(""),
    [name, current?.name]
  )

  if (!current) {
    return (
      <AppShell navigate={navigate} onLogout={onLogout} activeView="profile">
        <div className="p-8">
          <LoadingSpinner label="Loading profile..." />
        </div>
      </AppShell>
    )
  }

  const handlePickImage = async (file?: File | null) => {
    setUploadError("")
    if (!file) return
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setUploadError("Please choose a PNG, JPG, WebP, or GIF file.")
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setUploadError("Images must be 1 MB or smaller.")
      return
    }
    const dataUrl = await readFileAsDataUrl(file)
    setProfileImageData(dataUrl)
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    setError("")
    setSuccess("")
    try {
      await apiJson("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          username,
          email,
          profileImageData,
        }),
      })
      await loadTaskFlowData()
      setSuccess("Profile updated successfully.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async () => {
    if (!passwordCurrent || !passwordNext) {
      setError("Enter your current and new password.")
      return
    }
    if (passwordNext !== passwordConfirm) {
      setError("New password confirmation does not match.")
      return
    }
    setChangingPassword(true)
    setError("")
    setSuccess("")
    try {
      await apiJson("/api/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword: passwordCurrent,
          newPassword: passwordNext,
        }),
      })
      setPasswordCurrent("")
      setPasswordNext("")
      setPasswordConfirm("")
      setSuccess("Password updated successfully.")
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update password.")
    } finally {
      setChangingPassword(false)
    }
  }

  return (
    <AppShell navigate={navigate} onLogout={onLogout} activeView="profile">
      <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: "Outfit, sans-serif" }}>
            Profile
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your account details, profile picture, and sign-in settings.</p>
        </div>

        {(error || success || uploadError) && (
          <Card className="p-4 border">
            <div className="space-y-1 text-sm">
              {error && <p className="text-red-600">{error}</p>}
              {success && <p className="text-emerald-600">{success}</p>}
              {uploadError && <p className="text-amber-600">{uploadError}</p>}
            </div>
          </Card>
        )}

        <Card className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Avatar initials={initials} src={profileImageData ?? undefined} size="lg" />
            <div className="space-y-2">
              <div>
                <div className="text-sm font-semibold text-gray-900">{current.name}</div>
                <div className="text-xs text-gray-500">{current.email}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-700">
                  <span className={showManager ? "text-amber-800" : "text-gray-700"}>
                    {showManager ? "manager" : showAdmin ? "admin" : current.role}
                  </span>
                </span>
                {showAdmin && (
                  <Button variant="primary" size="sm" onClick={() => navigate("admin")}>
                    Open Admin CMS
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Change photo
                </Button>
                {profileImageData && (
                  <Button variant="ghost" size="sm" onClick={() => setProfileImageData(null)}>
                    Remove photo
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={SUPPORTED_TYPES.join(",")}
                className="hidden"
                onChange={async (event) => {
                  try {
                    await handlePickImage(event.target.files?.[0] ?? null)
                  } finally {
                    event.currentTarget.value = ""
                  }
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
            <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div className="flex items-end">
              <Button variant="primary" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Password</h2>
            <p className="text-sm text-gray-500">Update your sign-in password.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Current password" type="password" value={passwordCurrent} onChange={(e) => setPasswordCurrent(e.target.value)} />
            <Input label="New password" type="password" value={passwordNext} onChange={(e) => setPasswordNext(e.target.value)} />
            <Input label="Confirm new password" type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={savePassword} disabled={changingPassword}>
              {changingPassword ? "Updating…" : "Update password"}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
