import { join } from 'node:path';
import { getProjectArtifacts } from '../../src/project-context/artifacts';

describe('artifacts module', () => {
    describe('getProjectArtifacts', () => {
        it('should return artifacts and project type for a valid V4 project', async () => {
            const testPath = join(__dirname, '..', 'data', 'v4-xml-start', 'webapp', 'manifest.json');
            const result = await getProjectArtifacts(testPath);

            expect(result).toBeDefined();
            expect(result.artifacts).toBeDefined();
            expect(result.projectType).toBe('EDMXBackend');
        });

        it('should return artifacts and project type for a valid V2 project', async () => {
            const testPath = join(__dirname, '..', 'data', 'v2-xml-start', 'webapp', 'manifest.json');
            const result = await getProjectArtifacts(testPath);

            expect(result).toBeDefined();
            expect(result.artifacts).toBeDefined();
            expect(result.projectType).toBe('EDMXBackend');
        });

        it('should handle deeply nested file paths', async () => {
            const testPath = join(__dirname, '..', 'data', 'v4-xml-start', 'webapp', 'annotations', 'annotation.xml');
            const result = await getProjectArtifacts(testPath);

            expect(result).toBeDefined();
            expect(result.artifacts).toBeDefined();
            expect(result.projectType).toBe('EDMXBackend');
        });

        it('should handle errors gracefully and return default values', async () => {
            const invalidPath = '/definitely/not/a/valid/path/manifest.json';
            const result = await getProjectArtifacts(invalidPath);

            expect(result).toEqual({
                artifacts: {},
                projectType: 'EDMXBackend'
            });
        });
    });
});
