import type { APIRequestContext } from '@playwright/test'
import { env } from '~/tests/env.js'

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

export const API_BASE = `http://${env.apiHost}:${env.apiPort}/api/v1`
export const BASE_URL = `http://${env.apiHost}:${env.apiPort}`

export function apiUrl(path: string) {
  return `${API_BASE}${path}`
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export async function signUp(
  request: APIRequestContext,
  data: { name: string, email: string, password: string },
) {
  return request.post(apiUrl('/auth/sign-up/email'), { data })
}

export async function signIn(
  request: APIRequestContext,
  email: string,
  password: string,
) {
  const res = await request.post(apiUrl('/auth/sign-in/email'), {
    data: { email, password },
  })
  return res
}

export async function signOut(request: APIRequestContext) {
  return request.post(apiUrl('/auth/sign-out'))
}

export async function getSession(request: APIRequestContext) {
  return request.get(apiUrl('/auth/get-session'))
}

// ---------------------------------------------------------------------------
// Organization helpers (BetterAuth routes)
// ---------------------------------------------------------------------------

export async function createOrganization(
  request: APIRequestContext,
  data: { name: string, slug: string },
) {
  return request.post(apiUrl('/auth/organization/create'), { data })
}

export async function listOrganizations(request: APIRequestContext) {
  return request.get(apiUrl('/auth/organization/list'))
}

export async function setActiveOrganization(
  request: APIRequestContext,
  organizationId: string,
) {
  return request.post(apiUrl('/auth/organization/set-active'), {
    data: { organizationId },
  })
}

export async function getFullOrganization(
  request: APIRequestContext,
  organizationId: string,
) {
  return request.get(apiUrl(`/auth/organization/get-full-organization?organizationId=${organizationId}`))
}

export async function inviteMember(
  request: APIRequestContext,
  data: { organizationId: string, email: string, role: string },
) {
  return request.post(apiUrl('/auth/organization/invite-member'), { data })
}

export async function removeMember(
  request: APIRequestContext,
  data: { organizationId: string, memberIdOrEmail: string },
) {
  return request.post(apiUrl('/auth/organization/remove-member'), { data })
}

export async function updateMemberRole(
  request: APIRequestContext,
  data: { organizationId: string, memberId: string, role: string },
) {
  return request.post(apiUrl('/auth/organization/update-member-role'), { data })
}

// ---------------------------------------------------------------------------
// Project helpers
// ---------------------------------------------------------------------------

export async function createProject(
  request: APIRequestContext,
  data: { name: string, description?: string, organizationId?: string },
) {
  return request.post(apiUrl('/projects'), { data })
}

export async function getProjects(request: APIRequestContext, query?: Record<string, string>) {
  const qs = query ? `?${new URLSearchParams(query)}` : ''
  return request.get(apiUrl(`/projects${qs}`))
}

export async function getProject(request: APIRequestContext, id: string) {
  return request.get(apiUrl(`/projects/${id}`))
}

export async function updateProject(
  request: APIRequestContext,
  id: string,
  data: { name?: string, description?: string },
) {
  return request.put(apiUrl(`/projects/${id}`), { data })
}

export async function deleteProject(request: APIRequestContext, id: string) {
  return request.delete(apiUrl(`/projects/${id}`))
}

export async function getProjectMembers(request: APIRequestContext, id: string) {
  return request.get(apiUrl(`/projects/${id}/members`))
}

export async function addProjectMember(
  request: APIRequestContext,
  id: string,
  data: { email: string, role?: string },
) {
  return request.post(apiUrl(`/projects/${id}/members`), { data })
}

export async function updateProjectMember(
  request: APIRequestContext,
  id: string,
  memberId: string,
  data: { role: string },
) {
  return request.put(apiUrl(`/projects/${id}/members/${memberId}`), { data })
}

export async function removeProjectMember(
  request: APIRequestContext,
  id: string,
  memberId: string,
) {
  return request.delete(apiUrl(`/projects/${id}/members/${memberId}`))
}

// ---------------------------------------------------------------------------
// API key helpers (BetterAuth routes)
// ---------------------------------------------------------------------------

export async function createApiKey(
  request: APIRequestContext,
  data: { name: string, expiresIn?: number, permissions?: Record<string, string[]>, metadata?: Record<string, unknown> },
) {
  return request.post(apiUrl('/auth/api-key/create'), { data })
}

export async function listApiKeys(request: APIRequestContext) {
  return request.get(apiUrl('/auth/api-key/list'))
}

export async function deleteApiKey(request: APIRequestContext, keyId: string) {
  return request.post(apiUrl('/auth/api-key/delete'), { data: { keyId } })
}

// ---------------------------------------------------------------------------
// Audit helpers
// ---------------------------------------------------------------------------

export async function getAuditLogs(request: APIRequestContext, query?: Record<string, string>) {
  const qs = query ? `?${new URLSearchParams(query)}` : ''
  return request.get(apiUrl(`/audit${qs}`))
}

// ---------------------------------------------------------------------------
// Config & Theme helpers
// ---------------------------------------------------------------------------

export async function getConfig(request: APIRequestContext) {
  return request.get(apiUrl('/config'))
}

export async function updateConfig(request: APIRequestContext, data: Record<string, unknown>) {
  return request.put(apiUrl('/config'), { data })
}

export async function getTheme(request: APIRequestContext) {
  return request.get(apiUrl('/theme'))
}

export async function updateTheme(request: APIRequestContext, data: Record<string, unknown>) {
  return request.put(apiUrl('/theme'), { data })
}

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------

export async function getAdminOrganizations(request: APIRequestContext, query?: Record<string, string>) {
  const qs = query ? `?${new URLSearchParams(query)}` : ''
  return request.get(apiUrl(`/admin/organizations${qs}`))
}

export async function getAdminOrganizationById(request: APIRequestContext, id: string) {
  return request.get(apiUrl(`/admin/organizations/${id}`))
}

export async function getAdminApiKeys(request: APIRequestContext, query?: Record<string, string>) {
  const qs = query ? `?${new URLSearchParams(query)}` : ''
  return request.get(apiUrl(`/admin/api-keys${qs}`))
}

export async function getAdminApiKeyById(request: APIRequestContext, id: string) {
  return request.get(apiUrl(`/admin/api-keys/${id}`))
}

export async function getAdminUserById(request: APIRequestContext, id: string) {
  return request.get(apiUrl(`/admin/users/${id}`))
}

export async function getOrgAuditLogs(
  request: APIRequestContext,
  organizationId: string,
  query?: Record<string, string>,
) {
  const qs = query ? `?${new URLSearchParams(query)}` : ''
  return request.get(apiUrl(`/organizations/${organizationId}/audit${qs}`))
}
