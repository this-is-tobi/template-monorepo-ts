import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useThemeStore } from './theme'

const { mockUpdatePreset } = vi.hoisted(() => ({
  mockUpdatePreset: vi.fn(),
}))

vi.mock('@primeuix/themes', () => ({
  updatePreset: mockUpdatePreset,
}))

const { mockThemeGet, mockThemeUpdate } = vi.hoisted(() => ({
  mockThemeGet: vi.fn(),
  mockThemeUpdate: vi.fn(),
}))

vi.mock('~/lib/api', () => ({
  apiClient: {
    theme: {
      get: (...args: unknown[]) => mockThemeGet(...args),
      update: (...args: unknown[]) => mockThemeUpdate(...args),
    },
  },
}))

describe('useThemeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    document.documentElement.classList.remove('dark')
    localStorage.clear()
  })

  describe('initial state', () => {
    it('should have default theme values', () => {
      const store = useThemeStore()
      expect(store.theme).toStrictEqual({
        primaryColor: 'zinc',
        surfaceColor: 'zinc',
      })
      expect(store.loaded).toBe(false)
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchTheme', () => {
    it('should fetch theme from API and apply it', async () => {
      const themeData = {
        primaryColor: 'indigo' as const,
        surfaceColor: 'slate' as const,
      }
      mockThemeGet.mockResolvedValueOnce({ data: { data: themeData } })

      const store = useThemeStore()
      await store.fetchTheme()

      expect(mockThemeGet).toHaveBeenCalledTimes(1)
      expect(store.theme).toStrictEqual(themeData)
      expect(store.loaded).toBe(true)
      expect(mockUpdatePreset).toHaveBeenCalled()
    })

    it('should fall back to defaults on API error', async () => {
      mockThemeGet.mockRejectedValueOnce(new Error('network error'))

      const store = useThemeStore()
      await store.fetchTheme()

      expect(store.loaded).toBe(true)
      expect(store.theme.primaryColor).toBe('zinc')
      expect(mockUpdatePreset).toHaveBeenCalled()
    })
  })

  describe('updateTheme', () => {
    it('should update theme via API and apply it', async () => {
      const newTheme = {
        primaryColor: 'blue' as const,
        surfaceColor: 'gray' as const,
      }
      mockThemeUpdate.mockResolvedValueOnce({ data: { data: newTheme } })

      const store = useThemeStore()
      await store.updateTheme(newTheme)

      expect(mockThemeUpdate).toHaveBeenCalledWith(newTheme)
      expect(store.theme).toStrictEqual(newTheme)
    })

    it('should throw on API error', async () => {
      mockThemeUpdate.mockRejectedValueOnce(new Error('forbidden'))

      const store = useThemeStore()
      await expect(store.updateTheme({
        primaryColor: 'blue',
        surfaceColor: 'gray',
      })).rejects.toThrow('forbidden')

      expect(store.error).toBe('forbidden')
    })
  })

  describe('toggleDarkMode', () => {
    it('should toggle dark class and persist to localStorage', () => {
      const store = useThemeStore()

      store.toggleDarkMode()
      expect(document.documentElement.classList.contains('dark')).toBe(true)
      expect(localStorage.getItem('theme-dark-mode')).toBe('dark')

      store.toggleDarkMode()
      expect(document.documentElement.classList.contains('dark')).toBe(false)
      expect(localStorage.getItem('theme-dark-mode')).toBe('light')
    })
  })

  describe('applyDarkMode', () => {
    it('should apply dark mode from localStorage', () => {
      localStorage.setItem('theme-dark-mode', 'dark')
      const store = useThemeStore()

      store.applyDarkMode()
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should default to light when no preference stored and no system dark mode', () => {
      const store = useThemeStore()

      store.applyDarkMode()
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })
  })

  describe('previewTheme', () => {
    it('should apply theme to DOM without persisting', () => {
      const store = useThemeStore()
      store.previewTheme({
        primaryColor: 'rose',
        surfaceColor: 'stone',
      })

      expect(mockUpdatePreset).toHaveBeenCalled()
      // The store's theme should NOT have changed
      expect(store.theme.primaryColor).toBe('zinc')
    })
  })
})
