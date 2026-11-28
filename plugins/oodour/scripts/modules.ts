import { readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import ts from 'typescript';
import { placeBelow } from './below.ts';

export interface ModuleFacts {
  readonly imports: readonly string[];
  readonly reexportsOnly: boolean;
  readonly concreteClasses: readonly string[];
  readonly concreteClassesNamed: readonly string[];
}

// TypeScript's own defaults resolve an import as a bundler does, to a JavaScript file too.
const withoutConfig: ts.CompilerOptions = {};

interface Parsed {
  readonly imports: readonly string[];
  readonly reexportsOnly: boolean;
  readonly classNameByExportName: ReadonlyMap<string, string>;
  readonly reexports: readonly {
    readonly from: string;
    readonly originalNameByExportName: ReadonlyMap<string, string> | 'all';
  }[];
  readonly importedNames: readonly {
    readonly from: string;
    readonly name: string;
  }[];
  readonly createdClasses: readonly string[];
}

export function readModules(
  root: string,
  files: readonly string[],
): ReadonlyMap<string, ModuleFacts> {
  const resolverFor = importResolver(root, files);
  const parsed = new Map(
    files.map((file) => {
      const path = join(root, file);

      return [file, parse(path, resolverFor(path))] as const;
    }),
  );

  const classExported = (
    file: string,
    name: string,
    passed: ReadonlySet<string>,
  ): string | undefined => {
    const facts = parsed.get(file);
    const own = facts?.classNameByExportName.get(name);

    if (own !== undefined || facts === undefined || passed.has(file)) {
      return own;
    }

    return facts.reexports
      .map(({ from, originalNameByExportName: originals }) => {
        const original =
          originals === 'all'
            ? name === 'default'
              ? undefined
              : name
            : originals.get(name);

        return original === undefined
          ? undefined
          : classExported(from, original, new Set([...passed, file]));
      })
      .find((found) => found !== undefined);
  };

  return new Map(
    [...parsed].map(
      ([
        file,
        {
          imports,
          reexportsOnly,
          classNameByExportName,
          importedNames,
          createdClasses,
        },
      ]) => {
        const imported = importedNames.flatMap(({ from, name }) =>
          present(classExported(from, name, new Set())),
        );
        const concreteClassesNamed = [
          ...new Set([...imported, ...createdClasses]),
        ].sort();

        return [
          file,
          {
            imports,
            reexportsOnly,
            concreteClasses: [...new Set(classNameByExportName.values())],
            concreteClassesNamed,
          },
        ];
      },
    ),
  );
}

export function dependentsThroughReexports(
  modules: ReadonlyMap<string, ModuleFacts>,
): ReadonlyMap<string, readonly string[]> {
  const importers = Map.groupBy(
    [...modules].flatMap(([file, { imports }]) =>
      [...new Set(imports)].map((imported) => ({ file, imported })),
    ),
    ({ imported }) => imported,
  );

  const dependents = (
    file: string,
    passedThrough: ReadonlySet<string>,
  ): string[] =>
    (importers.get(file) ?? [])
      .map((edge) => edge.file)
      .filter((importer) => !passedThrough.has(importer))
      .flatMap((importer) =>
        modules.get(importer)?.reexportsOnly === true
          ? dependents(importer, new Set([...passedThrough, importer]))
          : [importer],
      );

  return new Map(
    [...modules.keys()].map((file) => [
      file,
      [...new Set(dependents(file, new Set([file])))].sort(),
    ]),
  );
}

function parse(
  path: string,
  resolve: (specifier: string) => string | undefined,
): Parsed {
  const text = readFileSync(path, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest);
  const { statements } = source;

  return {
    imports: ts
      .preProcessFile(text, true, true)
      .importedFiles.flatMap(({ fileName }) => present(resolve(fileName))),
    reexportsOnly:
      statements.some(ts.isExportDeclaration) &&
      statements.every(
        (statement) =>
          ts.isExportDeclaration(statement) ||
          ts.isImportDeclaration(statement),
      ),
    classNameByExportName: concreteClassesByExportName(statements),
    reexports: statements
      .filter(ts.isExportDeclaration)
      .flatMap(({ moduleSpecifier, exportClause }) => {
        const from =
          moduleSpecifier && ts.isStringLiteral(moduleSpecifier)
            ? resolve(moduleSpecifier.text)
            : undefined;

        if (
          from === undefined ||
          (exportClause !== undefined && !ts.isNamedExports(exportClause))
        ) {
          return [];
        }

        const originalNameByExportName =
          exportClause === undefined
            ? ('all' as const)
            : new Map(namesExportedBy(exportClause));

        return [{ from, originalNameByExportName }];
      }),
    importedNames: statements
      .filter(ts.isImportDeclaration)
      .flatMap(({ moduleSpecifier, importClause }) => {
        const from = ts.isStringLiteral(moduleSpecifier)
          ? resolve(moduleSpecifier.text)
          : undefined;

        return from === undefined
          ? []
          : exportedNamesImportedBy(importClause).map((name) => ({
              from,
              name,
            }));
      }),
    createdClasses: createdClassesOf(source),
  };
}

function present<T>(value: T | undefined): T[] {
  return value === undefined ? [] : [value];
}

function concreteClassesByExportName(
  statements: readonly ts.Statement[],
): ReadonlyMap<string, string> {
  const concrete = statements
    .filter(ts.isClassDeclaration)
    .filter(
      (declaration) => !hasModifier(declaration, ts.SyntaxKind.AbstractKeyword),
    );
  const declaredHere = new Set(
    concrete.flatMap(({ name }) => present(name?.text)),
  );
  const exportedWhereDeclared = concrete
    .filter((declaration) =>
      hasModifier(declaration, ts.SyntaxKind.ExportKeyword),
    )
    .map((declaration) => {
      const name = declaration.name?.text ?? 'default';

      return [
        hasModifier(declaration, ts.SyntaxKind.DefaultKeyword)
          ? 'default'
          : name,
        name,
      ] as const;
    });
  const exportedLater = statements
    .flatMap(localNameByExportName)
    .filter(([, name]) => declaredHere.has(name));

  return new Map([...exportedWhereDeclared, ...exportedLater]);
}

function localNameByExportName(
  statement: ts.Statement,
): (readonly [string, string])[] {
  if (
    ts.isExportAssignment(statement) &&
    !statement.isExportEquals &&
    ts.isIdentifier(statement.expression)
  ) {
    return [['default', statement.expression.text]];
  }

  const clause =
    ts.isExportDeclaration(statement) && statement.moduleSpecifier === undefined
      ? statement.exportClause
      : undefined;

  return clause !== undefined && ts.isNamedExports(clause)
    ? namesExportedBy(clause)
    : [];
}

function namesExportedBy(
  clause: ts.NamedExports,
): (readonly [string, string])[] {
  return clause.elements.map(({ name, propertyName }) => [
    name.text,
    (propertyName ?? name).text,
  ]);
}

function exportedNamesImportedBy(
  clause: ts.ImportClause | undefined,
): string[] {
  return [
    ...present(clause?.name).map(() => 'default'),
    ...present(clause?.namedBindings)
      .filter(ts.isNamedImports)
      .flatMap(({ elements }) =>
        elements.map((element) => (element.propertyName ?? element.name).text),
      ),
  ];
}

function createdClassesOf(source: ts.SourceFile): string[] {
  const declared = new Set(
    source.statements
      .filter(ts.isClassDeclaration)
      .flatMap(({ name }) => present(name?.text)),
  );
  const created = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      declared.has(node.expression.text)
    ) {
      created.add(node.expression.text);
    }

    ts.forEachChild(node, visit);
  };
  visit(source);

  return [...created];
}

function hasModifier(
  declaration: ts.ClassDeclaration,
  kind: ts.SyntaxKind,
): boolean {
  return (
    declaration.modifiers?.some((modifier) => modifier.kind === kind) ?? false
  );
}

interface BoundedFiles extends ts.ParseConfigFileHost {
  directoryExists(path: string): boolean;
  getDirectories(path: string): string[];
  realpath(path: string): string;
}

// On Windows, reading a path such as \\host\share\x.json sends the user's credentials to that host.
export function boundedTo(root: string): BoundedFiles {
  const place = placeBelow(root);
  const inside = (path: string): boolean => place(path) !== undefined;

  return {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    getCurrentDirectory: () => root,
    fileExists: (path) => inside(path) && ts.sys.fileExists(path),
    readFile: (path) => (inside(path) ? ts.sys.readFile(path) : undefined),
    directoryExists: (path) => inside(path) && ts.sys.directoryExists(path),
    getDirectories: (path) => (inside(path) ? ts.sys.getDirectories(path) : []),
    realpath: (path) =>
      inside(path) && ts.sys.realpath ? ts.sys.realpath(path) : path,
    readDirectory: () => [],
    onUnRecoverableConfigFileDiagnostic: () => undefined,
  };
}

// Imports resolve as TypeScript resolves them, through a file system that ends at the root, to scanned files only.
function importResolver(
  root: string,
  files: readonly string[],
): (path: string) => (specifier: string) => string | undefined {
  const scanned = new Set(files);
  const system = boundedTo(root);
  const optionsFor = compilerOptions(system);
  // One cache per set of compiler options: without it TypeScript probes the same folders again for every import.
  const caches = new Map<ts.CompilerOptions, ts.ModuleResolutionCache>();
  const cacheFor = (options: ts.CompilerOptions): ts.ModuleResolutionCache => {
    const known =
      caches.get(options) ??
      ts.createModuleResolutionCache(root, (name) => name, options);
    // Stryker disable next-line CallExpression: a new cache resolves the same imports; keeping it only saves time
    caches.set(options, known);

    return known;
  };

  return (path) => {
    const resolvers = optionsFor(path).map((options) => {
      const format = ts.getImpliedNodeFormatForFile(
        path,
        undefined,
        system,
        options,
      );
      const cache = cacheFor(options);

      return (specifier: string): string | undefined => {
        const resolved = ts.resolveModuleName(
          specifier,
          path,
          options,
          system,
          cache,
          undefined,
          format,
        );
        const imported =
          resolved.resolvedModule &&
          relative(root, resolved.resolvedModule.resolvedFileName).replaceAll(
            '\\',
            '/',
          );

        return [imported, imported?.replace(/\.d\.([cm]?)ts$/, '.$1js')].find(
          (file) => file !== undefined && scanned.has(file),
        );
      };
    });

    return (specifier) =>
      resolvers
        .values()
        .map((resolveWith) => resolveWith(specifier))
        .find((found) => found !== undefined);
  };
}

interface Config {
  readonly options: ts.CompilerOptions;
  readonly references: readonly string[];
}

// A config that only references others (one per app, library or test set) holds no options of its own, so a file's
// imports may resolve only through one of the configs it references.
function compilerOptions(
  system: BoundedFiles,
): (path: string) => readonly ts.CompilerOptions[] {
  const read = new Map<string, Config | undefined>();
  const configAt = (path: string): Config | undefined => {
    // Stryker disable next-line ConditionalExpression: `true` reads the config again, which holds the same options and only costs time; `false` reads none, which "an import through a path the nearest tsconfig.json maps names the file it maps to" kills
    if (!read.has(path)) {
      const parsed = ts.getParsedCommandLineOfConfigFile(path, {}, system);
      read.set(
        path,
        parsed && {
          options: parsed.options,
          references: (parsed.projectReferences ?? []).map((reference) =>
            ts.resolveProjectReferencePath(reference),
          ),
        },
      );
    }

    return read.get(path);
  };

  return (path) => {
    const nearest = ts.findConfigFile(dirname(path), (file) =>
      system.fileExists(file),
    );
    const config = nearest === undefined ? undefined : configAt(nearest);

    if (config === undefined) {
      return [withoutConfig];
    }

    return [
      config.options,
      ...config.references.flatMap((reference) =>
        present(configAt(reference)?.options),
      ),
    ];
  };
}
