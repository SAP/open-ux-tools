import { jest } from '@jest/globals';
import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import * as actualFs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Every rename into this directory fails, so installing the staged data and restoring the backup both fail.
let blockedDestination = '';
const installError = new Error('install rename refused');
const restoreError = new Error('restore rename refused');
const failures = [installError, restoreError];

jest.unstable_mockModule('node:fs/promises', () => ({
    ...actualFs,
    rename: async (from: string, to: string): Promise<void> => {
        if (to === blockedDestination) {
            throw failures.shift() ?? new Error('unexpected rename');
        }
        return actualFs.rename(from, to);
    }
}));
jest.unstable_mockModule(new URL('../../src/standalone.ts', import.meta.url).pathname, () => ({
    createMockDataGenerator: async () => ({
        generateService: async () => ({
            validation: { passed: true, semantic: true, relationships: true },
            resources: { Records: [{ ID: 3 }] }
        }),
        dispose: async () => undefined
    })
}));

const { generateProjectData } = await import('../../src/project-data.js');

describe('project data rollback failure', () => {
    it('reports the rollback error together with the original error', async () => {
        // The real path, because the project root is resolved before any file is moved (macOS links /var).
        const root = await realpath(await mkdtemp(join(tmpdir(), 'mockgen-project-rollback-')));
        const dataDirectory = join(root, 'webapp', 'localService', 'mockdata');
        blockedDestination = dataDirectory;
        try {
            // Given existing data and a file system that refuses to move anything back into the data directory
            await mkdir(dataDirectory, { recursive: true });
            await writeFile(join(dataDirectory, 'Records.json'), '[{"ID":1}]');
            // When generation fails to install and then fails to roll back
            const outcome = generateProjectData({
                projectRoot: root,
                dataDirectory: 'webapp/localService/mockdata',
                request: {
                    metadata: { format: 'edmx', content: '<edmx/>' },
                    service: { urlPath: '/records', odataVersion: '4.0' },
                    targets: [{ name: 'Records', kind: 'entity-set' }],
                    existingData: {}
                }
            });
            // Then both the original error and the rollback error are reported
            await expect(outcome).rejects.toMatchObject({
                message: expect.stringMatching(/rollback failed; originals are retained at/),
                errors: [installError, restoreError]
            });
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
});
