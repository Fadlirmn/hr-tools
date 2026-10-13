/** Ekstrak message dari error bertipe unknown (hasil catch block). */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
