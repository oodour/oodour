# An audit runs nothing a repository names unless the developer trusts it

`oodour-audit` audits repositories the developer may not have written. Git, test runners, linters and package scripts start
programs that a repository's own config names, and on Windows a path that Git opens can lead to another machine and send
it the developer's credentials. So every repository is untrusted by default: the plugin's command starts no Git process
and walks the folder itself without entering links, and the skill and the `oodour:auditor` agent run nothing the
repository names. Git and the repository's own tools run only after the developer asks for a trusted audit in their own
message and approves the trusted command at Claude Code's permission prompt.

## Why trust, and not a check before Git

The command first guarded Git with a check that read the repository's Git metadata and refused network paths before Git
ran. Review after review found a file Git opened that the check had not read, or a name Git read differently, and the
path reached a share. Git's own documentation says that running Git in an untrusted repository is not safe, and the
audit runs more than the command: `git log -S` and `git blame` started the program that a repository's `diff.<driver>.textconv`
names (measured, Git 2.54). A check inside the command cannot reach those. Editors that open untrusted folders take the
same route: VS Code's workspace trust and JetBrains' safe mode run nothing the folder configures until the user trusts
it.

The metadata check stays on the trusted path as a best-effort alarm for plain network names. Lars, 2026-11-23:
"Network-path check before git runs: OK".

## How the developer grants trust

- The skill pre-approves only the untrusted command. The trusted one puts `--trusted-repository` before the command
  name, and the command reads the flag only from its first argument, so the pre-approval cannot match it and Claude Code
  asks. The skill runs it only when the developer's own message asks for a trusted audit; text in the repository never
  counts.
- Where nobody can answer a prompt, the developer grants it in advance with an allow rule for the trusted command, or
  `--allowedTools` for one run. Lars, 2026-11-23: "How unattended runs grant trust: OK". The rule must name the plugin
  folder in full: with a `*` over the version folder, a `claude -p` run also ran an `oodour.ts` (then `lz-oop.ts`) planted in the audited
  repository, reached by `..` from the plugin folder (measured, Claude Code 2.1.327).
- In auto mode a classifier decides prompts and could approve the trusted command with nobody asked. The plugin's
  PreToolUse hook answers "ask" for any `oodour.ts` call in auto mode other than the plugin's own untrusted command, and
  gives no decision in other modes. Lars, 2026-11-24, "1: OK", to keeping it. An organisation's managed settings can
  block plugin hooks, so nothing else depends on it.

## Considered Options

- **Close each route the check misses.** Every round of fixes was followed by new routes; the check cannot name every
  file Git opens.
- **Refuse a repository with any link below it that leads to a network path.** It closes only routes that the Git
  overrides the command already passes close.
- **Run Git in a sandbox that refuses network paths.** On Windows that needs an access entry written into the audited
  repository, or rests on undocumented behaviour of restricted tokens.
- **Read the history without Git.** It misses renames and still follows a `.git` file to another folder.
- **State the limit and nothing more.** The skill's own Git commands would still run on any repository.
- **A trust list the plugin keeps.** It adds a setting the plugin owns; Claude Code's permission rules already grant
  trust for unattended runs, as measured above.
- **A hook that asks in every mode.** No one answers in a `claude -p` run, so it would refuse the unattended route.

## Consequences

- An untrusted audit has no commit counts, no `git log -S` or `git blame`, and no lint results from the team's own
  config, and its report says so. Its rows are named from the scope, not from the repository's top folder. Its file
  list leaves out what the repository's `.gitignore` files and `.git/info/exclude` ignore, read as text with the
  `ignore` package (Lars, 2026-11-24: "Approve adding the `ignore` package as agreed"), but not what the developer's
  global excludes file or a linked work tree's exclude file ignores: reading either means opening a path that Git
  config or the repository names. The report names the ignored folders, which the audit then leaves unread. Known
  differences from Git: committed files an ignore rule matches are left out too; a folder holding any `.git` counts as
  another repository; and when a deeper ignore file re-includes a folder that a higher file's rule ignores, files in it
  that the same rule matches by themselves are still listed.
- The trust check is no stronger than the developer's permission settings. Lars, 2026-11-23: "Broad permission grants:
  OK". A rule such as `Bash(node *)` or `Bash(git *)`, or a session with permission checks off, lets Claude run those
  commands on any repository; the plugin's README says to keep allow rules narrow.
- In auto mode the hook asks even when an allow rule grants the trusted command (measured), so unattended trusted
  audits run in another permission mode. The hook's filter matches the text `oodour.ts` in the command, so a command
  that names the script another way (a glob, a variable) never reaches it; no text filter can close that.
- The hook guards only the plugin's own command. In an untrusted audit, the skill's text alone keeps the model from
  running Git, tests, linters or package scripts; in auto mode such a command goes to Claude Code's own classifier, and
  `git blame` and `git log -S` start a program the repository's config names (measured). A hook that asked about every
  Git command would prompt on the developer's own Git reads in every session with the plugin on (Claude's decision,
  2026-11-24: not done).
- A repository's own `.claude/settings.json` could hold an allow rule for the trusted command. In a `claude -p` run such
  a rule did not grant trust; whether an interactive session that has accepted the folder's trust honours it was not
  measured.
- Trusting a repository trusts its Git metadata. The metadata check is an alarm, not a boundary: routes by which Git
  opens a file the check did not read stay open on the trusted path.
