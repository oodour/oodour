/**
 * Built-in classes whose objects are values and containers, not collaborators: a class may create them for its own
 * state, and code may test for them at a boundary.
 */
export const builtInConstructors: ReadonlySet<string> = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Array',
  'Date',
  'URL',
  'Promise',
  'RegExp',
  'AbortController',
  'FormData',
  'Headers',
  'URLSearchParams',
  'TextEncoder',
  'TextDecoder',
  'Blob',
  'Uint8Array',
]);
