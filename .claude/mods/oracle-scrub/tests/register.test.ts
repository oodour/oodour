import { expect, test } from 'claude-code/testing'

const glob = (filenames: string[]) => ({
  result: { durationMs: 1, numFiles: filenames.length, filenames, truncated: false },
})

test('a root Glob loses the store paths and keeps the rest', async ($, on) => {
  on('tool.call', () => glob(['AGENTS.md', '.oracle\\metz-talks\\index.md', 'D:/repo/.oracle/a.md']))

  const ran = await $.tool.call({ tool: 'Glob', pattern: '**/*.md' })

  expect(ran.result).toEqual({ durationMs: 1, numFiles: 1, filenames: ['AGENTS.md'], truncated: false })
})

test('a Glob aimed at the store is passed through whole', async ($, on) => {
  on('tool.call', () => glob(['.oracle/metz-talks/index.md']))

  const ran = await $.tool.call({ tool: 'Glob', pattern: '*.md', path: '.oracle/metz-talks' })

  expect(ran.result).toEqual(glob(['.oracle/metz-talks/index.md']).result)
})

test('shell output that lists the store is withheld', async ($, on) => {
  on('tool.call', () => ({ result: { stdout: './AGENTS.md\n./.oracle/metz-talks/x.md', stderr: '', interrupted: false } }))

  const ran = await $.tool.call({ tool: 'Bash', command: 'find . -name "*.md"' })

  expect(ran.result?.stdout).toBeUndefined()
  expect(ran.deny ?? ran.text).toMatch(/withheld/)
})

test('shell output that only names the folder passes', async ($, on) => {
  on('tool.call', () => ({ result: { stdout: '.gitignore\n.oracle\nAGENTS.md', stderr: '', interrupted: false } }))

  const ran = await $.tool.call({ tool: 'Bash', command: 'ls -a' })

  expect(ran.isError).toBeUndefined()
})
