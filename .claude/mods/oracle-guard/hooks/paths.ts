// Windows path arithmetic without node:path, which a hooks module cannot import.

const driveRoot = /^[A-Za-z]:[\\/]/;
const separatorRoot = /^[\\/]/;

export function pathSegments(path: string): readonly string[] {
  const rooted = driveRoot.test(path) || separatorRoot.test(path);
  // A drive root keeps its drive segment, which no parent segment removes.
  const floor = driveRoot.test(path) ? 1 : 0;

  return path
    .split(/[\\/]/)
    .filter((part) => part !== '' && part !== '.')
    .reduce<readonly string[]>((kept, part) => {
      if (part !== '..') {
        return [...kept, part];
      }

      if (kept.length > floor && kept.at(-1) !== '..') {
        return kept.slice(0, -1);
      }

      return rooted ? kept : [...kept, part];
    }, []);
}

function joined(base: string, path: string): string {
  if (driveRoot.test(path)) {
    return path;
  }

  if (separatorRoot.test(path)) {
    return `${/^[A-Za-z]:/.exec(base)?.[0] ?? ''}${path}`;
  }

  return `${base}\\${path}`;
}

// As node:path's win32 resolve with an absolute base; a drive-relative path (`D:x`) counts as relative.
export function resolvePath(base: string, path: string): string {
  const resolved = pathSegments(joined(base, path)).join('\\');

  return /^[A-Za-z]:$/.test(resolved) ? `${resolved}\\` : resolved;
}
