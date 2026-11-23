import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import ts from 'typescript';

export interface ModuleFacts {
  readonly imports: readonly string[];
  readonly reexportsOnly: boolean;
  readonly concreteClasses: readonly string[];
  readonly concreteClassesNamed: readonly string[];
}

const withoutConfig: ts.CompilerOptions = {
  allowJs: true,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
};

interface Parsed {
  readonly imports: readonly string[];
  readonly reexportsOnly: boolean;
  readonly classNameByExportName: ReadonlyMap<string, string>;
  readonly reexports: readonly { readonly from: string; readonly originalNameByExportName: ReadonlyMap<string, string> | 'all' }[];
  readonly importedNames: readonly { readonly from: string; readonly name: string }[];
  readonly createdClasses: readonly string[];
}

export function readModules(root: string, files: readonly string[]): ReadonlyMap<string, ModuleFacts> {
  const scanned = new Set(files);
  const optionsFor = compilerOptions(root);
  const parsed = new Map(
    files.map((file) => {
      const path = join(root, file);
      const options = optionsFor(path);
      const format = ts.getImpliedNodeFormatForFile(path, undefined, ts.sys, options);
      const resolve = (specifier: string): string | undefined => {
        const resolved = ts.resolveModuleName(specifier, path, options, ts.sys, undefined, undefined, format);
        const imported = resolved.resolvedModule && relative(root, resolved.resolvedModule.resolvedFileName).replaceAll('\\', '/');

        return [imported, imported && describedScript(imported)].find((file) => file !== undefined && scanned.has(file));
      };

      return [file, parse(path, resolve)] as const;
    }),
  );

  const classExported = (file: string, name: string, passed: ReadonlySet<string>): string | undefined => {
    const facts = parsed.get(file);
    const own = facts?.classNameByExportName.get(name);

    if (own !== undefined || facts === undefined || passed.has(file)) {
      return own;
    }

    return facts.reexports
      .map(({ from, originalNameByExportName: originals }) => {
        const original = originals === 'all' ? (name === 'default' ? undefined : name) : originals.get(name);

        return original === undefined ? undefined : classExported(from, original, new Set([...passed, file]));
      })
      .find((found) => found !== undefined);
  };

  return new Map(
    [...parsed].map(([file, { imports, reexportsOnly, classNameByExportName, importedNames, createdClasses }]) => {
      const imported = importedNames.flatMap(({ from, name }) => present(classExported(from, name, new Set())));
      const concreteClassesNamed = [...new Set([...imported, ...createdClasses])].sort();

      return [file, { imports, reexportsOnly, concreteClasses: [...classNameByExportName.values()], concreteClassesNamed }];
    }),
  );
}

export function dependentsThroughReexports(modules: ReadonlyMap<string, ModuleFacts>): ReadonlyMap<string, readonly string[]> {
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
    classNameByExportName: concreteClassesByExportName(statements),
    reexports: statements.filter(ts.isExportDeclaration).flatMap(({ moduleSpecifier, exportClause }) => {
      const from = moduleSpecifier && ts.isStringLiteral(moduleSpecifier) ? resolve(moduleSpecifier.text) : undefined;

      if (from === undefined || (exportClause !== undefined && !ts.isNamedExports(exportClause))) {
        return [];
      }

      const originalNameByExportName =
        exportClause === undefined
          ? ('all' as const)
          : new Map(exportClause.elements.map(({ name, propertyName }) => [name.text, (propertyName ?? name).text]));

      return [{ from, originalNameByExportName }];
    }),
    importedNames: statements.filter(ts.isImportDeclaration).flatMap(({ moduleSpecifier, importClause }) => {
      const from = ts.isStringLiteral(moduleSpecifier) ? resolve(moduleSpecifier.text) : undefined;

      return from === undefined ? [] : exportedNamesImportedBy(importClause).map((name) => ({ from, name }));
    }),
    createdClasses: createdClassesOf(source),
  };
}

function describedScript(declaration: string): string | undefined {
  const parts = /^(.*)\.d\.([cm]?)ts$/.exec(declaration);

  return parts ? `${parts[1] ?? ''}.${parts[2] ?? ''}js` : undefined;
}

function present<T>(value: T | undefined): T[] {
  return value === undefined ? [] : [value];
}

function concreteClassesByExportName(statements: readonly ts.Statement[]): ReadonlyMap<string, string> {
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

function exportedNamesImportedBy(clause: ts.ImportClause | undefined): string[] {
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
