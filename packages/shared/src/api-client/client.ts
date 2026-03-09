import type {
  RouteBody,
  RouteDefinition,
  RouteParams,
  RouteQuery,
  RouteSuccessResponse,
} from './types.js'
import { authRoutes, projectRoutes, systemRoutes } from '../routes/index.js'
import { removeTrailingSlash } from '../utils/functions.js'

/**
 * Error class for API request failures
 */
export class ApiError extends Error {
  status: number
  statusText: string
  data: unknown

  constructor(status: number, statusText: string, data: unknown = null) {
    super(`API Error: ${status} ${statusText}`)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
    this.data = data
  }
}

/**
 * All available API routes organized by resource
 */
export const apiRoutes = {
  auth: authRoutes,
  projects: projectRoutes,
  system: systemRoutes,
} as const

/**
 * Type-safe API client configuration
 */
export interface ApiClientConfig {
  baseUrl: string
  baseHeaders?: Record<string, string>
}

/**
 * Configuration for creating an authenticated API client.
 * Shared by CLI, MCP, and any other consumer that needs
 * bearer-token or API-key authentication.
 */
export interface AuthenticatedClientConfig {
  serverUrl: string
  token?: string
  apiKey?: string
}

/**
 * HTTP client response type
 */
export interface ApiResponse<T> {
  data: T
  status: number
  statusText: string
}

/**
 * Generic API client request options
 */
export interface RequestOptions<T extends RouteDefinition> {
  params?: RouteParams<T>
  query?: RouteQuery<T>
  body?: RouteBody<T>
  headers?: Record<string, string>
}

/**
 * Type-safe API client class
 */
export class ApiClient {
  private baseUrl: string
  private baseHeaders: Record<string, string>

  constructor(config: ApiClientConfig) {
    this.baseUrl = removeTrailingSlash(config.baseUrl)
    this.baseHeaders = config.baseHeaders || {}
  }

  /**
   * Make a type-safe request to an API endpoint
   */
  async request<T extends RouteDefinition>(
    route: T,
    options: RequestOptions<T> = {},
  ): Promise<ApiResponse<RouteSuccessResponse<T>>> {
    let url = `${this.baseUrl}${route.path}`

    // Replace path parameters
    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        url = url.replace(`:${key}`, encodeURIComponent(String(value)))
      }
    }

    // Add query parameters
    if (options.query) {
      const queryString = new URLSearchParams()
      for (const [key, value] of Object.entries(options.query)) {
        if (value !== undefined && value !== null) {
          queryString.append(key, String(value))
        }
      }
      if (queryString.toString()) {
        url += `?${queryString.toString()}`
      }
    }

    // Prepare request options
    const requestInit: RequestInit = {
      method: route.method,
      headers: {
        ...this.baseHeaders,
        ...options.headers,
        ...(route.method !== 'GET' && route.method !== 'DELETE' && options.body
          ? { 'Content-Type': 'application/json' }
          : {}),
      },
    }

    // Add body for non-GET requests
    if (route.method !== 'GET' && route.method !== 'DELETE' && options.body) {
      requestInit.body = JSON.stringify(options.body)
    }

    // Make the request
    const response = await fetch(url, requestInit)

    if (!response.ok) {
      const errorData = await response.json().catch(() => null)
      throw new ApiError(response.status, response.statusText, errorData)
    }

    const data = response.status === 204
      ? undefined as unknown as RouteSuccessResponse<T>
      : await response.json() as RouteSuccessResponse<T>

    return {
      data,
      status: response.status,
      statusText: response.statusText,
    }
  }

  /**
   * Convenience methods for each resource
   */
  auth = {
    signIn: (body: RouteBody<typeof authRoutes.signIn>) => this.request(authRoutes.signIn, { body }),
    getSession: () => this.request(authRoutes.getSession, {}),
  }

  projects = {
    create: (body: RouteBody<typeof projectRoutes.createProject>) => this.request(projectRoutes.createProject, { body }),
    getAll: () => this.request(projectRoutes.getProjects, {}),
    getById: (id: string) => this.request(projectRoutes.getProjectById, { params: { id } }),
    update: (id: string, body: RouteBody<typeof projectRoutes.updateProject>) => this.request(projectRoutes.updateProject, { params: { id }, body }),
    delete: (id: string) => this.request(projectRoutes.deleteProject, { params: { id } }),
  }

  system = {
    getVersion: () => this.request(systemRoutes.getVersion, {}),
    getHealth: () => this.request(systemRoutes.getHealth, {}),
    getReady: () => this.request(systemRoutes.getReady, {}),
    getLive: () => this.request(systemRoutes.getLive, {}),
  }
}

/**
 * Creates an initialized API client for making requests
 *
 * @param baseUrl - The base URL for all API requests
 * @param baseHeaders - Default headers to include with all requests
 * @returns An initialized API client
 */
export function getApiClient(baseUrl: string, baseHeaders: Record<string, string> = {}): ApiClient {
  return new ApiClient({ baseUrl, baseHeaders })
}

/**
 * Create an API client with bearer-token or API-key authentication.
 *
 * When both `token` and `apiKey` are provided, the bearer token takes priority.
 *
 * @param config - Server URL and optional credentials
 * @returns An authenticated API client
 */
export function createAuthenticatedClient(config: AuthenticatedClientConfig): ApiClient {
  const headers: Record<string, string> = {}

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`
  } else if (config.apiKey) {
    headers['x-api-key'] = config.apiKey
  }

  return new ApiClient({
    baseUrl: config.serverUrl,
    baseHeaders: headers,
  })
}

/**
 * Format any error into a human-readable message.
 *
 * Handles `ApiError` instances (with status, statusText and optional data),
 * standard `Error` objects, and unknown throwables.
 */
export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    const detail = error.data ? ` — ${JSON.stringify(error.data)}` : ''
    return `API Error ${error.status} ${error.statusText}${detail}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
