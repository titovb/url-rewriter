import { HttpError } from '@fastify/sensible'
import { DatabaseError } from 'pg'

export function handleDbDuplicateError(
  error: unknown,
  toThrow: HttpError
): void {
  if (error instanceof DatabaseError) {
    if (error.code === '23505') {
      throw toThrow
    }
  }
}
