import type { Register } from 'claude-code'

// Same pattern as .claude/hooks/oracle-guard.mjs; tools/oracle-hooks.test.mjs guards the copy.
const storePath = /(^|[\\/"'\s=:])\.oracle([\\/"'\s]|$)/i
const storeLine = /(^|[\\/\s"'])\.oracle[\\/:]/i

const withheld =
  'oracle-scrub: this output reached the sealed store (.oracle/) and was withheld. Scope the command to the directory you mean instead of the repository root (AGENTS.md, "Oracle firewall").'

const keep = (line: string) => !storeLine.test(line)

const field = (result: unknown, key: 'stdout' | 'stderr') =>
  typeof result === 'object' && result !== null ? String(Object.entries(result).find(([k]) => k === key)?.[1] ?? '') : ''

const shellOutput = (text: string | undefined, result: unknown) =>
  [text, field(result, 'stdout'), field(result, 'stderr')].join('\n')

const failClosed = { deny: 'oracle-scrub: its scrub failed, so the output was withheld.' }

// A call aimed at the store is the guard's to allow or deny; an oracle agent's own reads stay whole.
const aimedAtStore = (values: unknown[]) => values.some(v => typeof v === 'string' && storePath.test(v))

export const register: Register = on => {
  on('tool.call', { tool: 'Glob' }, async ($, e, next) => {
    const ran = await next(e)

    if (aimedAtStore([e.path, e.pattern]) || ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    const filenames = ran.result.filenames.filter(keep)

    return filenames.length === ran.result.filenames.length
      ? ran
      : { result: { ...ran.result, filenames, numFiles: filenames.length } }
  }).catch(($, e, next) => (next.called ? failClosed : next(e)))

  on('tool.call', { tool: 'Grep' }, async ($, e, next) => {
    const ran = await next(e)

    if (aimedAtStore([e.path, e.glob]) || ran.deny !== undefined || ran.isError === true) {
      return ran
    }

    const filenames = ran.result.filenames.filter(keep)
    const content = ran.result.content?.split('\n').filter(keep).join('\n')

    return filenames.length === ran.result.filenames.length && content === ran.result.content
      ? ran
      : { result: { ...ran.result, filenames, numFiles: filenames.length, content } }
  }).catch(($, e, next) => (next.called ? failClosed : next(e)))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)

    return aimedAtStore([e.command]) || !storeLine.test(shellOutput(ran.text, ran.result)) ? ran : { deny: withheld }
  }).catch(($, e, next) => (next.called ? failClosed : next(e)))

  on('tool.call', { tool: 'PowerShell' }, async ($, e, next) => {
    const ran = await next(e)

    return aimedAtStore([e.command]) || !storeLine.test(shellOutput(ran.text, ran.result)) ? ran : { deny: withheld }
  }).catch(($, e, next) => (next.called ? failClosed : next(e)))
}
