import type { ThemeColorName, ThemeConfig } from '@template-monorepo-ts/shared'
import type { PaletteShade } from '~/lib/palette'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'
import { TAILWIND_PALETTES } from '~/lib/palette'

const DARK_MODE_KEY = 'theme-dark-mode'

const SHADES: PaletteShade[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]

/**
 * Returns the user's dark mode preference.
 * Priority: explicit user choice (localStorage) > system preference > light.
 *
 * The stored choice MUST win over the system preference — otherwise the
 * in-app toggle appears to work but silently reverts on the next load.
 */
function getUserDarkPreference(): boolean {
  const stored = localStorage.getItem(DARK_MODE_KEY)
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Writes one palette scale (`--primary-N` or `--surface-N`) onto `:root`.
 * Every semantic token in assets/index.css derives from these two scales,
 * so components restyle without any per-component work.
 */
function applyScale(prefix: 'primary' | 'surface', color: ThemeColorName) {
  const palette = TAILWIND_PALETTES[color]
  if (!palette) return
  const root = document.documentElement
  for (const shade of SHADES) {
    root.style.setProperty(`--${prefix}-${shade}`, palette[shade])
  }
}

/**
 * Applies the given ThemeConfig to the document.
 * Dark mode class is handled separately by the user's local preference.
 */
function applyThemeToDOM(theme: ThemeConfig) {
  applyScale('primary', theme.primaryColor)
  applyScale('surface', theme.surfaceColor)

  // Advanced escape hatch: `preset` is a raw map of CSS custom properties
  // (e.g. { "--radius": "0.75rem", "--primary": "#ff4785" }) applied on top
  // of the palette-derived tokens.
  if (theme.preset) {
    const root = document.documentElement
    for (const [name, value] of Object.entries(theme.preset)) {
      if (name.startsWith('--') && typeof value === 'string') {
        root.style.setProperty(name, value)
      }
    }
  }
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeConfig>({
    primaryColor: 'zinc',
    surfaceColor: 'zinc',
  })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const loaded = ref(false)
  const isDark = ref(document.documentElement.classList.contains('dark'))

  /**
   * Applies the user's local dark-mode preference to the DOM and starts
   * tracking system changes — as long as the user hasn't made an explicit
   * choice, the app follows the OS light/dark switch live.
   */
  function applyDarkMode() {
    const dark = getUserDarkPreference()
    document.documentElement.classList.toggle('dark', dark)
    isDark.value = dark

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      if (localStorage.getItem(DARK_MODE_KEY) !== null) return
      document.documentElement.classList.toggle('dark', event.matches)
      isDark.value = event.matches
    })
  }

  /**
   * Fetches the platform theme from the API on startup.
   */
  async function fetchTheme() {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.theme.get()
      theme.value = res.data.data
      applyThemeToDOM(theme.value)
      loaded.value = true
    } catch {
      applyThemeToDOM(theme.value)
      loaded.value = true
    } finally {
      loading.value = false
    }
  }

  /**
   * Updates the platform theme (admin-only). Applies immediately.
   */
  async function updateTheme(newTheme: ThemeConfig) {
    loading.value = true
    error.value = null
    try {
      const res = await apiClient.theme.update(newTheme)
      theme.value = res.data.data
      applyThemeToDOM(theme.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update theme'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * Toggles the user's personal dark mode preference (localStorage).
   */
  function toggleDarkMode() {
    const next = !isDark.value
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem(DARK_MODE_KEY, next ? 'dark' : 'light')
    isDark.value = next
  }

  /**
   * Applies a theme locally for preview purposes — does NOT persist.
   */
  function previewTheme(preview: ThemeConfig) {
    applyThemeToDOM(preview)
  }

  return {
    theme,
    loading,
    error,
    loaded,
    isDark,
    fetchTheme,
    updateTheme,
    toggleDarkMode,
    previewTheme,
    applyDarkMode,
  }
})
