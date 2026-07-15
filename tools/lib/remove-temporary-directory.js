import { rm } from 'node:fs/promises'

const REMOVE_OPTIONS = Object.freeze({
  force: true,
  maxRetries: 10,
  recursive: true,
  retryDelay: 100,
})

export function removeTemporaryDirectory(path, { remove = rm } = {}) {
  return remove(path, { ...REMOVE_OPTIONS })
}
