import type {
  RouteBody,
  RouteDefinition,
  RouteParams,
  RouteQuery,
  RouteSuccessResponse,
} from './types.js'
import { systemRoutes, userRoutes } from '../routes/index.js'
import { removeTrailingSlash } from '../utils/functions.js'

/**
 * All available API routes organized by resource
 */
export const apiRoutes = {
  users: userRoutes,
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
    const data = await response.json() as RouteSuccessResponse<T>

    return {
      data,
      status: response.status,
      statusText: response.statusText,
    }
  }

  /**
   * Convenience methods for each resource
   */
  users = {
    create: (body: RouteBody<typeof userRoutes.createUser>) => this.request(userRoutes.createUser, { body }),
    getAll: () => this.request(userRoutes.getUsers, {}),
    getById: (id: string) => this.request(userRoutes.getUserById, { params: { id } }),
    update: (id: string, body: RouteBody<typeof userRoutes.updateUser>) => this.request(userRoutes.updateUser, { params: { id }, body }),
    delete: (id: string) => this.request(userRoutes.deleteUser, { params: { id } }),
  }

  system = {
    getVersion: () => this.request(systemRoutes.getVersion, {}),
    getHealth: () => this.request(systemRoutes.getHealth, {}),
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
