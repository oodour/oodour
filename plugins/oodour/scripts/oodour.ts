import { enableCompileCache } from 'node:module';

// Node.js keeps the compiled code of the modules imported below in a folder under the system's temporary folder, so the
// next run starts sooner. A static import would be compiled before this line runs. NODE_DISABLE_COMPILE_CACHE=1 turns
// it off.
enableCompileCache();
const { runCommand } = await import('./command.ts');
const { status, stdout, stderr } = runCommand(process.argv.slice(2));

process.stdout.write(stdout);
process.stderr.write(stderr);
process.exitCode = status;
