import type { ThemeConfig } from '@template-monorepo-ts/shared'
import { updatePreset } from '@primeuix/themes'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { apiClient } from '~/lib/api'

const DARK_MODE_KEY = 'theme-dark-mode'

/**
 * Builds a PrimeVue palette token map from a color name.
 * E.g. 'indigo' → { 50: '{indigo.50}', 100: '{indigo.100}', … }
 */
function paletteTokens(color: string): Record<string, string> {
  return Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map(shade => [
      String(shade),
      `{${color}.${shade}}`,
    ]),
  )
}

/**
 * Returns the user's dark mode preference from localStorage,
 * falling back to system preference.
 */
function getUserDarkPreference(): boolean {
  const stored = localStorage.getItem(DARK_MODE_KEY)
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Applies the given ThemeConfig to the running PrimeVue instance.
 * Dark mode class is handled separately by the user's local preference.
 *
 * Only two things need updating:
 *   1. semantic.primary — the accent palette (e.g. emerald, blue).
 *   2. colorScheme.*.surface — the neutral palette.
 *
 * Highlight and primary.color / hoverColor / etc. use {primary.N} references
 * in the preset, so they auto-resolve when the primary palette changes.
 */
function applyThemeToDOM(theme: ThemeConfig) {
  // If admin provided a full preset override, apply it directly.
  if (theme.preset && Object.keys(theme.preset).length > 0) {
    updatePreset(theme.preset as Parameters<typeof updatePreset>[0])
    return
  }

  const s = theme.surfaceColor

  updatePreset({
    semantic: {
      primary: paletteTokens(theme.primaryColor),
      colorScheme: {
        light: {
          surface: {
            0: '#ffffff',
            ...paletteTokens(s),
          },
        },
        dark: {
          surface: {
            0: '#fafafa',
            ...paletteTokens(s),
          },
        },
      },
    },
  })
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
   * Applies the user's local dark-mode preference to the DOM.
   */
  function applyDarkMode() {
    const dark = getUserDarkPreference()
    document.documentElement.classList.toggle('dark', dark)
    isDark.value = dark
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
