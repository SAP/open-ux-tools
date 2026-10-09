import { describe, it, expect, beforeAll } from '@jest/globals';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { validateRootDirectory, buildLegacyPaths, tryGitMove } from '../../../src/migration-process/legacy-helpers.js';
import { DirName } from '../../../src/project-spec-types.js';
import { TemplateFileName } from '../../../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Legacy Migration Helpers - Coverage Tests', () => {
    const testOutputDir = join(__dirname, '../../../test-output', 'legacy-helpers');

    beforeAll(() => {
        // Clean up test output directory
        if (existsSync(testOutputDir)) {
            rmSync(testOutputDir, { recursive: true, force: true });
        }
        mkdirSync(testOutputDir, { recursive: true });
    });

    describe('validateRootDirectory', () => {
        it('should accept a valid directory path', () => {
            const validPath = __dirname;
            const result = validateRootDirectory(validPath);
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should reject path with null byte', () => {
            expect(() => validateRootDirectory('/tmp/test\0malicious')).toThrow('Path contains unsafe characters');
        });

        it('should reject path with carriage return', () => {
            expect(() => validateRootDirectory('/tmp/test\rmalicious')).toThrow('Path contains unsafe characters');
        });

        it('should reject path with newline', () => {
            expect(() => validateRootDirectory('/tmp/test\nmalicious')).toThrow('Path contains unsafe characters');
        });

        it('should reject path with backtick', () => {
            expect(() => validateRootDirectory('/tmp/test`command`')).toThrow('Path contains unsafe characters');
        });

        it('should reject path with dollar sign (command substitution)', () => {
            expect(() => validateRootDirectory('/tmp/test$(whoami)')).toThrow('Path contains unsafe characters');
        });

        it('should reject path with pipe', () => {
            expect(() => validateRootDirectory('/tmp/test|command')).toThrow('Path contains unsafe characters');
        });

        it('should reject path with ampersand', () => {
            expect(() => validateRootDirectory('/tmp/test&command')).toThrow('Path contains unsafe characters');
        });

        it('should reject path with semicolon', () => {
            expect(() => validateRootDirectory('/tmp/test;command')).toThrow('Path contains unsafe characters');
        });

        it('should reject path with angle brackets', () => {
            expect(() => validateRootDirectory('/tmp/test<file')).toThrow('Path contains unsafe characters');
            expect(() => validateRootDirectory('/tmp/test>file')).toThrow('Path contains unsafe characters');
        });

        it('should reject non-existent directory', () => {
            const nonExistent = join(__dirname, 'this-should-not-exist-' + Date.now());
            expect(() => validateRootDirectory(nonExistent)).toThrow('Root directory does not exist');
        });
    });

    describe('buildLegacyPaths', () => {
        it('should build correct legacy paths for standard src/main layout', () => {
            const rootPath = '/project/root';
            const legacyPath = 'src/main';

            const paths = buildLegacyPaths(rootPath, legacyPath);

            expect(paths.ffLegacyTestPath).toBe(join(rootPath, 'src', TemplateFileName.Test));
            expect(paths.ffLegacyTestQunitPath).toBe(join(rootPath, 'src', TemplateFileName.Test, 'qunit'));
            expect(paths.ffLegacyTestuiveri5Path).toBe(join(rootPath, 'src', TemplateFileName.Test, 'uiveri5'));
            expect(paths.ffLegacyWebappPath).toBe(join(rootPath, legacyPath, DirName.Webapp));
            expect(paths.ffNewTestPath).toBe(join(rootPath, DirName.Webapp, TemplateFileName.Test));
        });

        it('should build correct legacy paths for custom legacy path', () => {
            const rootPath = '/project/root';
            const legacyPath = 'custom/path';

            const paths = buildLegacyPaths(rootPath, legacyPath);

            expect(paths.ffLegacyWebappPath).toBe(join(rootPath, 'custom/path', DirName.Webapp));
            expect(paths.ffLegacyTestPath).toBe(join(rootPath, 'src', TemplateFileName.Test));
        });

        it('should handle Windows-style paths', () => {
            const rootPath = 'C:\\project\\root';
            const legacyPath = 'src\\main';

            const paths = buildLegacyPaths(rootPath, legacyPath);

            expect(paths.ffLegacyWebappPath).toContain('src');
            expect(paths.ffLegacyWebappPath).toContain('main');
            expect(paths.ffLegacyWebappPath).toContain(DirName.Webapp);
        });

        it('should build paths for root-level legacy path', () => {
            const rootPath = '/project/root';
            const legacyPath = '.';

            const paths = buildLegacyPaths(rootPath, legacyPath);

            expect(paths.ffLegacyWebappPath).toBe(join(rootPath, '.', DirName.Webapp));
        });
    });

    describe('tryGitMove - mem-fs mode', () => {
        it('should skip git operations when mem-fs is enabled', async () => {
            // In test environment, mem-fs is typically enabled
            // This test verifies that tryGitMove returns early without errors
            const mockRootPath = testOutputDir;
            const mockPaths = buildLegacyPaths(mockRootPath, 'src/main');

            await expect(tryGitMove(mockRootPath, mockPaths)).resolves.toBeUndefined();
        });
    });

    describe('Legacy folder structure detection', () => {
        it('should identify src/main/webapp structure', () => {
            const testProjectPath = join(testOutputDir, 'legacy-src-main');
            mkdirSync(join(testProjectPath, 'src', 'main', 'webapp'), { recursive: true });
            writeFileSync(join(testProjectPath, 'src', 'main', 'webapp', 'Component.js'), '// component');

            const paths = buildLegacyPaths(testProjectPath, 'src/main');

            expect(existsSync(join(testProjectPath, 'src', 'main', 'webapp'))).toBe(true);
            expect(paths.ffLegacyWebappPath).toContain('src');
            expect(paths.ffLegacyWebappPath).toContain('main');
            expect(paths.ffLegacyWebappPath).toContain('webapp');
        });

        it('should identify src/test folder structure', () => {
            const testProjectPath = join(testOutputDir, 'legacy-src-test');
            mkdirSync(join(testProjectPath, 'src', 'test', 'qunit'), { recursive: true });
            mkdirSync(join(testProjectPath, 'src', 'test', 'uiveri5', 'pages'), { recursive: true });
            writeFileSync(join(testProjectPath, 'src', 'test', 'qunit', 'AllTests.js'), '// tests');
            writeFileSync(join(testProjectPath, 'src', 'test', 'uiveri5', 'pages', 'app.spec.js'), '// e2e');

            const paths = buildLegacyPaths(testProjectPath, 'src/main');

            expect(paths.ffLegacyTestQunitPath).toContain('qunit');
            expect(paths.ffLegacyTestuiveri5Path).toContain('uiveri5');
        });

        it('should handle projects with no src folder', () => {
            const testProjectPath = join(testOutputDir, 'no-src-folder');
            mkdirSync(join(testProjectPath, 'webapp'), { recursive: true });
            writeFileSync(join(testProjectPath, 'webapp', 'manifest.json'), '{}');

            const paths = buildLegacyPaths(testProjectPath, '.');

            expect(paths.ffLegacyWebappPath).toBe(join(testProjectPath, '.', 'webapp'));
        });
    });

    describe('Path security validation', () => {
        it('should build paths even with directory traversal attempts', () => {
            const rootPath = '/project/root';
            const pathWithTraversal = '../../../etc';

            // buildLegacyPaths itself doesn't validate - it just builds paths
            // The validation happens when these paths are used in git operations or file access
            const paths = buildLegacyPaths(rootPath, pathWithTraversal);

            // Verify the paths are built (security validation happens elsewhere)
            expect(paths).toBeDefined();
            expect(paths.ffLegacyWebappPath).toBeDefined();
        });

        it('should handle absolute paths in legacy path parameter', () => {
            const rootPath = '/project/root';
            const absoluteLegacyPath = '/absolute/path';

            const paths = buildLegacyPaths(rootPath, absoluteLegacyPath);

            // Verify the path is constructed
            expect(paths.ffLegacyWebappPath).toContain('absolute');
        });
    });

    describe('Edge cases', () => {
        it('should handle empty legacy path', () => {
            const rootPath = '/project/root';
            const emptyPath = '';

            const paths = buildLegacyPaths(rootPath, emptyPath);

            expect(paths.ffLegacyWebappPath).toBe(join(rootPath, '', DirName.Webapp));
        });

        it('should handle legacy path with trailing slash', () => {
            const rootPath = '/project/root';
            const pathWithSlash = 'src/main/';

            const paths = buildLegacyPaths(rootPath, pathWithSlash);

            expect(paths.ffLegacyWebappPath).toContain('src');
            expect(paths.ffLegacyWebappPath).toContain('main');
        });

        it('should handle unicode characters in paths', () => {
            const rootPath = '/project/root';
            const unicodePath = 'src/mañana';

            const paths = buildLegacyPaths(rootPath, unicodePath);

            expect(paths.ffLegacyWebappPath).toContain('mañana');
        });

        it('should handle spaces in path components', () => {
            const rootPath = '/project/root';
            const pathWithSpaces = 'src/my folder';

            const paths = buildLegacyPaths(rootPath, pathWithSpaces);

            expect(paths.ffLegacyWebappPath).toContain('my folder');
        });
    });
});
