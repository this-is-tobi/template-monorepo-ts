import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TAILWIND_PALETTES } from '~/lib/palette'
import { useThemeStore } from './theme'

/** Reads a runtime theme variable from the root element's inline style. */
function rootVar(name: string): string {
  return document.documentElement.style.getPropertyValue(name)
}

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
  const localStorageMock = (() => {
    const store: Record<string, string> = {}
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value }),
      removeItem: vi.fn((key: string) => { delete store[key] }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
      get length() { return Object.keys(store).length },
      key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
    }
  })()

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('localStorage', localStorageMock)
    document.documentElement.classList.remove('dark')
    document.documentElement.removeAttribute('style')
    localStorageMock.clear()
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
      // The palette scales are written as CSS variables on <html>.
      expect(rootVar('--primary-500')).toBe(TAILWIND_PALETTES.indigo[500])
      expect(rootVar('--surface-500')).toBe(TAILWIND_PALETTES.slate[500])
    })

    it('should fall back to defaults on API error', async () => {
      mockThemeGet.mockRejectedValueOnce(new Error('network error'))

      const store = useThemeStore()
      await store.fetchTheme()

      expect(store.loaded).toBe(true)
      expect(store.theme.primaryColor).toBe('zinc')
      expect(rootVar('--primary-500')).toBe(TAILWIND_PALETTES.zinc[500])
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
    function mockMatchMedia(systemDark: boolean) {
      const listeners: ((e: { matches: boolean }) => void)[] = []
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: systemDark && query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
        removeEventListener: vi.fn(),
      }))
      return { emitChange: (matches: boolean) => listeners.forEach(cb => cb({ matches })) }
    }

    it('should prefer the stored user choice over the system preference', () => {
      // The explicit in-app toggle must win — otherwise it silently
      // reverts to the system preference on the next load.
      localStorage.setItem('theme-dark-mode', 'light')
      mockMatchMedia(true)
      const store = useThemeStore()

      store.applyDarkMode()
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('should apply the stored dark choice even on a light system', () => {
      localStorage.setItem('theme-dark-mode', 'dark')
      mockMatchMedia(false)
      const store = useThemeStore()

      store.applyDarkMode()
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should follow the system preference when no choice is stored', () => {
      mockMatchMedia(true)
      const store = useThemeStore()

      store.applyDarkMode()
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should default to light when no preference at all', () => {
      mockMatchMedia(false)
      const store = useThemeStore()

      store.applyDarkMode()
      expect(document.documentElement.classList.contains('dark')).toBe(false)
    })

    it('should track live system changes while no choice is stored', () => {
      const media = mockMatchMedia(false)
      const store = useThemeStore()

      store.applyDarkMode()
      expect(document.documentElement.classList.contains('dark')).toBe(false)

      media.emitChange(true)
      expect(document.documentElement.classList.contains('dark')).toBe(true)
    })

    it('should ignore live system changes once a choice is stored', () => {
      const media = mockMatchMedia(false)
      const store = useThemeStore()

      store.applyDarkMode()
      localStorage.setItem('theme-dark-mode', 'light')

      media.emitChange(true)
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

      expect(rootVar('--primary-500')).toBe(TAILWIND_PALETTES.rose[500])
      expect(rootVar('--surface-500')).toBe(TAILWIND_PALETTES.stone[500])
      // The store's theme should NOT have changed
      expect(store.theme.primaryColor).toBe('zinc')
    })
  })

  describe('preset overrides', () => {
    it('should apply raw CSS variable overrides from the preset escape hatch', () => {
      const store = useThemeStore()
      store.previewTheme({
        primaryColor: 'zinc',
        surfaceColor: 'zinc',
        preset: { '--radius': '0.75rem', 'not-a-var': 'ignored' },
      })

      expect(rootVar('--radius')).toBe('0.75rem')
      expect(rootVar('not-a-var')).toBe('')
    })
  })
})
