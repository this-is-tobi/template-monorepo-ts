/** Removes `readonly` from all top-level properties of `T`. */
export type Writeable<T> = { -readonly [P in keyof T]: T[P] }

/** Recursively removes `readonly` from all properties of `T`. */
export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> }
