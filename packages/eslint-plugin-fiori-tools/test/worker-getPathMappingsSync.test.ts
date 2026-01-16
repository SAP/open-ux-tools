import { join } from 'node:path';
import { createSyncFn } from 'synckit';
import type { PathMappings } from '@sap-ux/project-access';

describe('Project Access Tests', () => {
    const testInputPath = join(__dirname, 'test-input');

    describe('Synchronized worker version', () => {
        const getPathMappingsWorker = createSyncFn(join(__dirname, '../src/worker-getPathMappingsSync.ts')) as (
            projectRoot: string
        ) => PathMappings;

        test('synchronized worker returns webapp path for standard project', () => {
            const projectPath = join(testInputPath, 'standardProject');
            const result = getPathMappingsWorker(projectPath);

            expect(result).toBeDefined();
            expect('webapp' in result).toBe(true);
            if ('webapp' in result) {
                expect(result.webapp).toContain('webapp');
            }
        });

        test('synchronized worker handles custom webapp path', () => {
            const projectPath = join(testInputPath, 'customWebappProject');
            const result = getPathMappingsWorker(projectPath);

            expect(result).toBeDefined();
            expect('webapp' in result).toBe(true);
            if ('webapp' in result) {
                expect(result.webapp).toBeDefined();
            }
        });

        test('synchronized worker handles library project', () => {
            const projectPath = join(testInputPath, 'libraryProject');
            const result = getPathMappingsWorker(projectPath);

            expect(result).toBeDefined();
            expect('src' in result).toBe(true);
            if ('src' in result) {
                expect(result.src).toContain('src');
                expect(result.test).toContain('test');
            }
        });

        test('synchronized worker handles non-UI5 project', () => {
            const projectPath = join(testInputPath, 'nonUI5Project');
            const result = getPathMappingsWorker(projectPath);

            expect(result).toEqual({});
        });
    });
});