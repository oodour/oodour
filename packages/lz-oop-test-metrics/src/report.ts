import { reportLine, reportsAtLimit, type MeasuredFunction } from './crap.ts';

/** What a run prints, and whether it fails. */
export interface TestMetricsReport {
  readonly lines: readonly string[];
  readonly failed: boolean;
}

/** What the reporters take. */
export interface TestMetricsOptions {
  /** The CRAP score at which a function is reported; Fallow's default. */
  readonly limit?: number;
  /** Whether to report functions whose CRAP score reaches the limit, the one signal that fails the run. */
  readonly crap?: boolean;
  /** Whether to report each public method no test called. */
  readonly uncalledPublicMethods?: boolean;
  /** Whether to report each function a test called that has branch paths no test took. */
  readonly untestedBranches?: boolean;
}

/** The report lines for the measured functions, and whether the run fails. */
export function testMetricsReport(
  functions: readonly MeasuredFunction[],
  { limit = 30, crap = true, uncalledPublicMethods = true, untestedBranches: branches = true }: TestMetricsOptions = {},
): TestMetricsReport {
  const atLimit = (some: readonly MeasuredFunction[]) => (crap ? reportsAtLimit(some, limit) : []);
  const lines = functions.flatMap((measured) => {
    const { publicMethod, called, untestedBranches } = measured;

    return [
      ...atLimit([measured]).map((report) => reportLine(report, limit)),
      ...(uncalledPublicMethods && publicMethod && !called ? [uncalledLine(measured)] : []),
      ...(branches && called && untestedBranches > 0 ? [branchLine(measured)] : []),
    ];
  });

  return { lines, failed: atLimit(functions).length > 0 };
}

function branchLine({ file, line, name, untestedBranches }: MeasuredFunction): string {
  const [paths, them] = untestedBranches === 1 ? ['path', 'it'] : ['paths', 'each of them'];

  return (
    `${file}:${String(line)} Stop and look: Untested Code, ${name} has ${String(untestedBranches)} branch ${paths} ` +
    `no test took. Cure: a test that drives ${them} through the inputs that reach it.`
  );
}

function uncalledLine({ file, line, name }: MeasuredFunction): string {
  return (
    `${file}:${String(line)} Stop and look: Untested Code, ${name} is public and no test called it. Cure: a test ` +
    'that sends it and checks its result, or delete it when nothing sends it.'
  );
}
