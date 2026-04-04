import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authClient } from '~/lib/auth'

/** Minimal user shape exposed by the auth store. */
interface User {
  id: string
  email: string
  name: string
  role?: string | null
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loaded = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role?.split(',').map(r => r.trim()).includes('admin') ?? false)

  async function fetchSession() {
    loading.value = true
    error.value = null
    try {
      const { data } = await authClient.getSession()
      user.value = data?.user ?? null
    } catch {
      user.value = null
    } finally {
      loading.value = false
      loaded.value = true
    }
  }

  async function signIn(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: authError } = await authClient.signIn.email({ email, password })
      if (authError) {
        error.value = authError.message ?? 'Sign in failed'
        return false
      }
      user.value = data?.user ?? null
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Sign in failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function signUp(email: string, password: string, name: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: authError } = await authClient.signUp.email({ email, password, name })
      if (authError) {
        error.value = authError.message ?? 'Sign up failed'
        return false
      }
      user.value = data?.user ?? null
      return true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Sign up failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    try {
      await authClient.signOut()
    } finally {
      user.value = null
    }
  }

  async function ssoSignIn(providerId: string) {
    loading.value = true
    error.value = null
    try {
      await authClient.signIn.oauth2({
        providerId,
        callbackURL: `${window.location.origin}/`,
        errorCallbackURL: `${window.location.origin}/login`,
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'SSO sign in failed'
    } finally {
      loading.value = false
    }
  }

  return { user, loaded, loading, error, isAuthenticated, isAdmin, fetchSession, signIn, signUp, signOut, ssoSignIn }
})
