/**
 * Generate a random ID for local use
 * For database records, prefer gen_random_uuid() on the server
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}
