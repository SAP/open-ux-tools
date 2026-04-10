import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPathMappings } from '@sap-ux/project-access';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tests call getPathMappings directly (async) instead of through the synckit worker.
// The worker simply wraps this function; testing it directly avoids worker thread
// deadlocks in Jest ESM mode while still validating the underlying logic.
describe('Project Access Tests', () => {
    const testInputPath = join(__dirname, 'test-input');

    describe('getPathMappings', () => {
        test('returns webapp path for standard project', async () => {
            const projectPath = join(testInputPath, 'standardProject');
            const result = await getPathMappings(projectPath);

            expect(result).toBeDefined();
            expect('webapp' in result).toBe(true);
            if ('webapp' in result) {
                expect(result.webapp).toContain('webapp');
            }
        });

        test('handles custom webapp path', async () => {
            const projectPath = join(testInputPath, 'customWebappProject');
            const result = await getPathMappings(projectPath);

            expect(result).toBeDefined();
            expect('webapp' in result).toBe(true);
            if ('webapp' in result) {
                expect(result.webapp).toBeDefined();
            }
        });

        test('handles library project', async () => {
            const projectPath = join(testInputPath, 'libraryProject');
            const result = await getPathMappings(projectPath);

            expect(result).toBeDefined();
            expect('src' in result).toBe(true);
            if ('src' in result) {
                expect(result.src).toContain('src');
                expect(result.test).toContain('test');
            }
        });

        test('handles non-UI5 project', async () => {
            const projectPath = join(testInputPath, 'nonUI5Project');
            // The worker wraps getPathMappings in a try/catch returning {} on error.
            // Mirror that behavior here since non-UI5 projects throw.
            let result;
            try {
                result = await getPathMappings(projectPath);
            } catch {
                result = {};
            }

            expect(result).toEqual({});
        });
    });
});
