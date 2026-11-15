import type { Register } from 'claude-code';
import { aimedAtStore, failClosed, keep, listsStore, shellOutput, withheld } from './scrub.ts';

export const register: Register = (on) => {
  on('tool.call', { tool: 'Glob' }, async (_, e, next) => {
    const ran = await next(e);

    if (aimedAtStore([e.path, e.pattern]) || ran.deny !== undefined || ran.isError === true) {
      return ran;
    }

    const filenames = ran.result.filenames.filter(keep);

    return filenames.length === ran.result.filenames.length
      ? ran
      : { result: { ...ran.result, filenames, numFiles: filenames.length } };
  }).catch((_, e, next) => (next.called ? failClosed : next(e)));

  on('tool.call', { tool: 'Grep' }, async (_, e, next) => {
    const ran = await next(e);

    if (aimedAtStore([e.path, e.glob]) || ran.deny !== undefined || ran.isError === true) {
      return ran;
    }

    const filenames = ran.result.filenames.filter(keep);
    const content = ran.result.content?.split('\n').filter(keep).join('\n');

    return filenames.length === ran.result.filenames.length && content === ran.result.content
      ? ran
      : { result: { ...ran.result, filenames, numFiles: filenames.length, content } };
  }).catch((_, e, next) => (next.called ? failClosed : next(e)));

  on('tool.call', { tool: ['Bash', 'PowerShell'] }, async (_, e, next) => {
    const ran = await next(e);

    return aimedAtStore([e.command]) || !listsStore(shellOutput(ran.text, ran.result)) ? ran : { deny: withheld };
  }).catch((_, e, next) => (next.called ? failClosed : next(e)));
};
