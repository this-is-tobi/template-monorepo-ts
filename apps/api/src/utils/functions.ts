/**
 * Gets the current Node environment
 *
 * @returns The current Node environment: 'development', 'test', or 'production'
 */
export const getNodeEnv: () => 'development' | 'test' | 'production' = () => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    return process.env.NODE_ENV
  }
  return 'production'
}
