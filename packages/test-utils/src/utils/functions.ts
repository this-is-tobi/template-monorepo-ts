export const repeatFn = (nb: number) => (fn: (optionalParam?: any) => any, optionalParam?: any) => Array.from({ length: nb }).map(() => fn(optionalParam))
