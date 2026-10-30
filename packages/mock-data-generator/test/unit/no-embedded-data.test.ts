import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
// The TypeScript compiler is the workspace root's toolchain (root devDependencies), not a package dependency.
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type * as TypeScript from 'typescript';

const ts = createRequire(import.meta.url)('typescript') as typeof TypeScript;

const PACKAGE_ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SOURCE_ROOT = join(PACKAGE_ROOT, 'src');
/** Cited specification constants live here and are exempt. */
const SPEC_DIRECTORY = join(SOURCE_ROOT, 'spec') + sep;
/** The most string literals an array, `new Set([...])` or entries a `new Map([...])` may hold. */
const MAXIMUM_LITERALS = 10;
/**
 * Declarations that are code, not data, by `<file>:<name>`:
 * - `SWITCH_PROVIDER_ROLES` lists the `case` labels of the value-provider switches, kept in step by
 *   provider-capability.test.ts; it describes what the code can do.
 * - `STORE_KEYS` is the strict parser's list of the rule store's top-level keys: the format's schema.
 */
const CODE_DECLARATIONS = new Set([
    'semantics/value-banks.ts:SWITCH_PROVIDER_ROLES',
    'semantics/rule-store.ts:STORE_KEYS'
]);

interface Literal {
    location: string;
    declaration: string;
    count: number;
}

/**
 * Every TypeScript source file under a directory.
 *
 * @param directory directory to walk
 * @returns absolute file paths
 */
function sourceFiles(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            return sourceFiles(path);
        }
        return entry.name.endsWith('.ts') ? [path] : [];
    });
}

/**
 * The name of the variable a node is declared in, if any.
 *
 * @param node AST node
 * @returns the variable name, or an empty string
 */
function declarationName(node: TypeScript.Node): string {
    for (let current: TypeScript.Node | undefined = node; current; current = current.parent) {
        if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
            return current.name.text;
        }
    }
    return '';
}

/**
 * Array literals with many string elements and `new Map([...])` calls with many entries in one source.
 *
 * @param name source name, relative to src with forward slashes
 * @param text source text
 * @returns the literals above the limit
 */
function literalsIn(name: string, text: string): Literal[] {
    const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
    const found: Literal[] = [];
    const record = (node: TypeScript.Node, count: number): void => {
        if (count > MAXIMUM_LITERALS) {
            const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
            found.push({ location: `${name}:${line}`, declaration: `${name}:${declarationName(node)}`, count });
        }
    };
    const visit = (node: TypeScript.Node): void => {
        if (ts.isArrayLiteralExpression(node)) {
            record(
                node,
                node.elements.filter(
                    (element) => ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element)
                ).length
            );
        }
        if (
            ts.isNewExpression(node) &&
            ts.isIdentifier(node.expression) &&
            node.expression.text === 'Map' &&
            node.arguments?.[0] !== undefined &&
            ts.isArrayLiteralExpression(node.arguments[0])
        ) {
            record(node, node.arguments[0].elements.filter((element) => ts.isArrayLiteralExpression(element)).length);
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return found;
}

/**
 * The large literals of one source file.
 *
 * @param file absolute path under src
 * @returns the literals above the limit
 */
function largeLiterals(file: string): Literal[] {
    return literalsIn(relative(SOURCE_ROOT, file).split(sep).join('/'), readFileSync(file, 'utf8'));
}

describe('embedded data inventory', () => {
    it('keeps vocabularies and tables out of the source code, outside the cited specification constants', () => {
        // Given every source file outside src/spec
        const files = sourceFiles(SOURCE_ROOT).filter((file) => !file.startsWith(SPEC_DIRECTORY));
        // When large string arrays, sets and maps are collected
        const offenders = files
            .flatMap(largeLiterals)
            .filter(({ declaration }) => !CODE_DECLARATIONS.has(declaration))
            .map(({ location, count }) => `${location} (${count} literals)`);
        // Then there are none: such data belongs in a versioned resource or, when it cites a specification, in src/spec
        expect(offenders).toEqual([]);
    });

    it('still recognizes every declaration it exempts as code', () => {
        // Given the exempt declarations
        const declarations = new Set(
            sourceFiles(SOURCE_ROOT)
                .flatMap(largeLiterals)
                .map(({ declaration }) => declaration)
        );
        // Then each still exists, so a stale exemption cannot hide a new list of the same name
        expect([...CODE_DECLARATIONS].filter((declaration) => !declarations.has(declaration))).toEqual([]);
    });

    it.each([
        ['an array', (words: string) => `const WORDS = [${words}];`],
        ['a set', (words: string) => `const WORDS = new Set([${words}]);`],
        ['a map', (words: string) => `const WORDS = new Map([${words.replaceAll(/('w\d+')/gu, '[$1, 1]')}]);`]
    ])('detects %s with more literals than the limit', (_kind, source) => {
        // Given a source with one literal more than the limit
        const words = Array.from({ length: MAXIMUM_LITERALS + 1 }, (_, index) => `'w${index}'`).join(', ');
        // When it is scanned
        const found = literalsIn('generation/example.ts', source(words));
        // Then the literal is reported with its location and declaration
        expect(found).toEqual([
            expect.objectContaining({ location: 'generation/example.ts:1', declaration: 'generation/example.ts:WORDS' })
        ]);
    });

    it('accepts a list at the limit', () => {
        // Given a source with exactly the limit of literals
        const words = Array.from({ length: MAXIMUM_LITERALS }, (_, index) => `'w${index}'`).join(', ');
        // Then it is not reported
        expect(literalsIn('generation/example.ts', `const WORDS = new Set([${words}]);`)).toEqual([]);
    });
});
