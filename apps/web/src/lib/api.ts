import { getApiClient } from '@template-monorepo-ts/shared'
import { config } from '~/lib/config'

export const apiClient = getApiClient(config.apiUrl || window.location.origin)
