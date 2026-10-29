import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MockDataGeneratorDiagnostic, MockDataGeneratorDiagnosticCode } from '../../src/types.js';

const SOURCE_ROOT = fileURLToPath(new URL('../../src', import.meta.url));
/** Codes that name thrown errors, not diagnostics; they live in src/errors.ts or on internal error classes. */
const ERROR_CODES = new Set([
    'METADATA_INPUT_TOO_LARGE',
    'GENERATED_RESULT_TOO_LARGE',
    'SFT_CANDIDATE_RELEVANCE_FAILED'
]);

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
 * The members of the diagnostic code union, read from its declaration in src/types.ts.
 *
 * @returns the declared codes
 */
function declaredCodes(): Set<string> {
    const types = readFileSync(join(SOURCE_ROOT, 'types.ts'), 'utf8');
    const declaration = /export type MockDataGeneratorDiagnosticCode =([^;]+);/u.exec(types)?.[1] ?? '';
    return new Set([...declaration.matchAll(/'([A-Z0-9_]+)'/gu)].map(([, code]) => code));
}

/**
 * The upper-snake-case string literals of the sources outside the type declaration and the error codes.
 *
 * @returns the literals that can be diagnostic codes
 */
function codeLiterals(): Set<string> {
    const literals = new Set<string>();
    for (const file of sourceFiles(SOURCE_ROOT)) {
        if (file.endsWith(`${join('src', 'types.ts')}`) || file.endsWith(`${join('src', 'errors.ts')}`)) {
            continue;
        }
        for (const [, literal] of readFileSync(file, 'utf8').matchAll(/'([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)'/gu)) {
            literals.add(literal);
        }
    }
    return literals;
}

describe('diagnostic codes', () => {
    it('types the code of a diagnostic as the declared union', () => {
        // Given a diagnostic with a declared code, Then it compiles; an undeclared code would not
        const diagnostic: MockDataGeneratorDiagnostic = {
            code: 'SFT_BUDGET_EXHAUSTED' satisfies MockDataGeneratorDiagnosticCode,
            severity: 'info',
            message: 'example'
        };
        expect(diagnostic.code).toBe('SFT_BUDGET_EXHAUSTED');
    });

    it('declares exactly the codes the sources emit', () => {
        // Given the declared union and the code literals of the sources
        const declared = declaredCodes();
        const emitted = new Set([...codeLiterals()].filter((literal) => !ERROR_CODES.has(literal)));
        // Then every emitted code is declared and every declared code is emitted somewhere
        expect([...emitted].filter((code) => !declared.has(code))).toEqual([]);
        expect([...declared].filter((code) => !emitted.has(code))).toEqual([]);
        expect(declared.size).toBeGreaterThan(30);
    });
});
