/**
 * Thrown by Master Connect CRUD/service functions for user-facing validation
 * failures (duplicate SKU, missing required field, etc.) - the message is
 * safe to show directly, unlike an unexpected/internal error.
 */
export class AdminValidationError extends Error {}
