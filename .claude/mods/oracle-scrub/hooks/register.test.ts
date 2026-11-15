import { expect, test } from 'claude-code/testing'

const glob = (filenames: string[]) => ({
  result: { durationMs: 1, numFiles: filenames.length, filenames, truncated: false },
})

const shell = (stdout: string) => ({ result: { stdout, stderr: '', interrupted: false } })

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

test('a Grep keeps lines that mention the store and drops lines inside it', async ($, on) => {
  on('tool.call', () => ({
    result: {
      mode: 'content',
      numFiles: 2,
      filenames: ['AGENTS.md', '.oracle/metz-talks/x.md'],
      content: 'AGENTS.md:12:keep out of .oracle/ entirely\n.oracle/metz-talks/x.md:3:source text',
    },
  }))

  const ran = await $.tool.call({ tool: 'Grep', pattern: 'x', output_mode: 'content' })

  expect(ran.result).toEqual({
    mode: 'content',
    numFiles: 1,
    filenames: ['AGENTS.md'],
    content: 'AGENTS.md:12:keep out of .oracle/ entirely',
  })
})

for (const tool of ['Bash', 'PowerShell'] as const) {
  for (const [label, stdout] of [
    ['find', './AGENTS.md\n./.oracle/metz-talks/x.md'],
    ['ls -R', '.:\nAGENTS.md\n\n./.oracle/99-bottles-2e-js:\nindex.md'],
    ['Get-ChildItem', '    Directory: D:\\repo\\.oracle\\metz-talks\n\nMode  Name\n-a--- x.md'],
  ] as const) {
    test(`${tool} output that lists the store is withheld (${label})`, async ($, on) => {
      on('tool.call', () => shell(stdout))

      const ran = await $.tool.call({ tool, command: 'list everything' })

      expect(ran.result).toBeUndefined()
      expect(ran.deny ?? ran.text).toMatch(/withheld/)
    })
  }

  test(`${tool} output that only names the folder, or mentions it in prose, passes`, async ($, on) => {
    on('tool.call', () => shell('.gitignore\n.oracle\nAGENTS.md\nAGENTS.md:12:keep out of .oracle/ entirely'))

    const ran = await $.tool.call({ tool, command: 'ls -a && rg oracle AGENTS.md' })

    expect(ran.isError).toBeUndefined()
    expect(ran.deny).toBeUndefined()
  })
}
