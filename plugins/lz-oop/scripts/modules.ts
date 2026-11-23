import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import ts from 'typescript';

/** What one source file says about its place among the others. */
export interface ModuleFacts {
  /** The files of the scan this file imports, by any form of import. */
  readonly imports: readonly string[];
  /** The file only passes on what other files export, so its own commits and dependents belong to them. */
  readonly reexportsOnly: boolean;
  /** The classes the file exports that are not abstract. */
  readonly concreteClasses: readonly string[];
  /** The concrete classes of other files this file imports, and the classes of its own it creates with `new`. */
  readonly namedClasses: readonly string[];
}

const withoutConfig: ts.CompilerOptions = {
  allowJs: true,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
};

/** One file as its own text gives it, before the files it imports are read. */
interface Parsed {
  readonly imports: readonly string[];
  readonly reexportsOnly: boolean;
  /** Each concrete class the file exports, by the name it is exported under (`default` for a default export). */
  readonly exportedClasses: ReadonlyMap<string, string>;
  /** Each name an import declaration takes from another file of the scan. */
  readonly importedNames: readonly { readonly from: string; readonly name: string }[];
  /** The classes the file declares and creates with `new`. */
  readonly createdClasses: readonly string[];
}

/** The facts of each file, named from `root` with forward slashes. */
export function readModules(root: string, files: readonly string[]): ReadonlyMap<string, ModuleFacts> {
  const scanned = new Set(files);
  const optionsFor = compilerOptions(root);
  const parsed = new Map(
    files.map((file) => {
      const path = join(root, file);
      const options = optionsFor(path);
      const resolve = (specifier: string): string | undefined => {
        const resolved = ts.resolveModuleName(specifier, path, options, ts.sys).resolvedModule;
        const imported = resolved && relative(root, resolved.resolvedFileName).replaceAll('\\', '/');

        return imported !== undefined && scanned.has(imported) ? imported : undefined;
      };

      return [file, parse(path, resolve)] as const;
    }),
  );

  return new Map(
    [...parsed].map(([file, { imports, reexportsOnly, exportedClasses, importedNames, createdClasses }]) => {
      const imported = importedNames.flatMap(({ from, name }) => present(parsed.get(from)?.exportedClasses.get(name)));
      const namedClasses = [...new Set([...imported, ...createdClasses])].sort();

      return [file, { imports, reexportsOnly, concreteClasses: [...exportedClasses.values()], namedClasses }];
    }),
  );
}

/**
 * The files that import each file, directly or through files that only re-export it; a file that only re-exports is
 * no dependent itself.
 */
export function dependentsOf(modules: ReadonlyMap<string, ModuleFacts>): ReadonlyMap<string, readonly string[]> {
  const importers = Map.groupBy(
    [...modules].flatMap(([file, { imports }]) => [...new Set(imports)].map((imported) => ({ file, imported }))),
    ({ imported }) => imported,
  );

  const dependents = (file: string, passedThrough: ReadonlySet<string>): string[] =>
    (importers.get(file) ?? [])
      .map((edge) => edge.file)
      .filter((importer) => !passedThrough.has(importer))
      .flatMap((importer) =>
        modules.get(importer)?.reexportsOnly === true
          ? dependents(importer, new Set([...passedThrough, importer]))
          : [importer],
      );

  return new Map([...modules.keys()].map((file) => [file, [...new Set(dependents(file, new Set([file])))].sort()]));
}

function parse(path: string, resolve: (specifier: string) => string | undefined): Parsed {
  const text = readFileSync(path, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest);
  const { statements } = source;

  return {
    imports: ts.preProcessFile(text, true, true).importedFiles.flatMap(({ fileName }) => present(resolve(fileName))),
    reexportsOnly:
      statements.some(ts.isExportDeclaration) &&
      statements.every((statement) => ts.isExportDeclaration(statement) || ts.isImportDeclaration(statement)),
    exportedClasses: exportedClassesOf(statements),
    importedNames: statements.filter(ts.isImportDeclaration).flatMap(({ moduleSpecifier, importClause }) => {
      const from = ts.isStringLiteral(moduleSpecifier) ? resolve(moduleSpecifier.text) : undefined;

      return from === undefined ? [] : namesTakenBy(importClause).map((name) => ({ from, name }));
    }),
    createdClasses: createdClassesOf(source),
  };
}

function present<T>(value: T | undefined): T[] {
  return value === undefined ? [] : [value];
}

function exportedClassesOf(statements: readonly ts.Statement[]): ReadonlyMap<string, string> {
  return new Map(
    statements
      .filter(ts.isClassDeclaration)
      .filter((declaration) => hasModifier(declaration, ts.SyntaxKind.ExportKeyword))
      .filter((declaration) => !hasModifier(declaration, ts.SyntaxKind.AbstractKeyword))
      .map((declaration) => {
        const name = declaration.name?.text ?? 'default';

        return [hasModifier(declaration, ts.SyntaxKind.DefaultKeyword) ? 'default' : name, name] as const;
      }),
  );
}

/** The names an import takes from the other file, as that file exports them. */
function namesTakenBy(clause: ts.ImportClause | undefined): string[] {
  const bindings = clause?.namedBindings;

  return [
    ...(clause?.name ? ['default'] : []),
    ...(bindings && ts.isNamedImports(bindings)
      ? bindings.elements.map((element) => (element.propertyName ?? element.name).text)
      : []),
  ];
}

function createdClassesOf(source: ts.SourceFile): string[] {
  const declared = new Set(source.statements.filter(ts.isClassDeclaration).flatMap(({ name }) => present(name?.text)));
  const created = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && declared.has(node.expression.text)) {
      created.add(node.expression.text);
    }

    ts.forEachChild(node, visit);
  };
  visit(source);

  return [...created];
}

function hasModifier(declaration: ts.ClassDeclaration, kind: ts.SyntaxKind): boolean {
  return declaration.modifiers?.some((modifier) => modifier.kind === kind) ?? false;
}

/** The options of the `tsconfig.json` nearest each file inside `root`, read once per config. */
function compilerOptions(root: string): (path: string) => ts.CompilerOptions {
  const read = new Map<string, ts.CompilerOptions>();

  return (path) => {
    const config = ts.findConfigFile(dirname(path), (file) => ts.sys.fileExists(file));

    if (config === undefined || relative(root, config).startsWith('..')) {
      return withoutConfig;
    }

    const cached = read.get(config);

    if (cached !== undefined) {
      return cached;
    }

    const parsed = ts.getParsedCommandLineOfConfigFile(config, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined });
    const options = parsed === undefined ? withoutConfig : { ...parsed.options, allowJs: true };
    read.set(config, options);

    return options;
  };
}
