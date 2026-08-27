import type { CSSProperties } from "react"

function normalizeHexColor(value?: string | null) {
  if (!value) return null
  const trimmed = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : null
}

function hexToRgb(value: string) {
  const normalized = normalizeHexColor(value)
  if (!normalized) return null
  const hex = normalized.slice(1)
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

function mixWithWhite(value: string, whiteRatio: number) {
  const rgb = hexToRgb(value)
  if (!rgb) return "#f8fafc"
  const clamped = Math.min(1, Math.max(0, whiteRatio))
  const mix = (channel: number) => Math.round(255 * clamped + channel * (1 - clamped))
  return `rgb(${mix(rgb.r)}, ${mix(rgb.g)}, ${mix(rgb.b)})`
}

export function projectSurfaceStyle(color?: string | null): CSSProperties | undefined {
  const normalized = normalizeHexColor(color)
  if (!normalized) return undefined
  return {
    backgroundColor: "#fff",
    backgroundImage: `linear-gradient(180deg, #ffffff 0%, ${mixWithWhite(normalized, 0.84)} 100%)`,
  }
}

