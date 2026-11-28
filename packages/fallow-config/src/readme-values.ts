/** Each key the config sets, as a dotted path, with its value as JSON text; `$schema` only serves editors. */
export function presetValues(
  config: Readonly<Record<string, unknown>>,
): readonly (readonly [string, string])[] {
  return Object.entries(config)
    .filter(([key]) => key !== '$schema')
    .flatMap(([key, value]) =>
      isRecord(value)
        ? presetValues(value).map(
            ([path, json]) => [`${key}.${path}`, json] as const,
          )
        : [[key, JSON.stringify(value)] as const],
    );
}

/** The key and value cells of each row between the README's `<marker>:start` and `<marker>:end` comments. */
export function readmeValues(
  markdown: string,
  marker = 'preset-values',
): readonly (readonly [string, string])[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.indexOf(`<!-- ${marker}:start -->`);
  const end = lines.indexOf(`<!-- ${marker}:end -->`);

  if (start === -1 || end === -1) {
    throw new Error(
      `The README has no <!-- ${marker}:start --> and <!-- ${marker}:end --> markers.`,
    );
  }

  const table = lines.slice(start + 1, end);

  return table.flatMap((line) => {
    const [, key, value] = /^\| `([^`]+)` \| `([^`]+)` \|/.exec(line) ?? [];

    return key === undefined || value === undefined
      ? []
      : [[key, value] as const];
  });
}

export function isRecord(
  value: unknown,
): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
