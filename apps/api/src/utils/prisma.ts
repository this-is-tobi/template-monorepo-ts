// ---------------------------------------------------------------------------
// Prisma utility types
// ---------------------------------------------------------------------------

/**
 * Recursive JSON-compatible value type accepted by Prisma's `Json` fields.
 *
 * Prisma's generated `InputJsonValue` does not accept `null` at the top level
 * (use `NullableJsonNullValueInput` for that), so this type mirrors that
 * constraint and is safe to use wherever a Prisma Json field is written.
 */
export type JsonValue = string | number | boolean | JsonValue[] | { [key: string]: JsonValue }
