import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const generateService = jest.fn(async () => ({
    validation: { passed: true, semantic: true, relationships: true },
    resources: { Records: [{ ID: 3 }] }
}));

jest.unstable_mockModule(new URL('../../src/standalone.ts', import.meta.url).pathname, () => ({
    createMockDataGenerator: async () => ({ generateService, dispose: async () => undefined })
}));

const { generateProjectData } = await import('../../src/project-data.js');

describe('project data transaction', () => {
    test('restores a directory left in the backup phase by an interrupted process', async () => {
        const root = await mkdtemp(join(tmpdir(), 'mockgen-project-recovery-'));
        const parent = join(root, 'webapp', 'localService');
        const transaction = join(parent, '.mockgen-project-interrupted');
        try {
            await mkdir(join(transaction, 'backup'), { recursive: true });
            await writeFile(join(transaction, 'backup', 'Records.json'), '[{"ID":1}]');
            await writeFile(
                join(transaction, 'journal.json'),
                JSON.stringify({
                    formatVersion: 1,
                    targetName: 'mockdata',
                    phase: 'backed-up',
                    stagedSha256: createHash('sha256').digest('hex')
                })
            );
            generateService.mockRejectedValueOnce(new Error('generation stopped after recovery'));
            await expect(
                generateProjectData({
                    projectRoot: root,
                    dataDirectory: 'webapp/localService/mockdata',
                    request: {
                        metadata: { format: 'edmx', content: '<edmx/>' },
                        service: { urlPath: '/records', odataVersion: '4.0' },
                        targets: [{ name: 'Records', kind: 'entity-set' }],
                        existingData: {}
                    }
                })
            ).rejects.toThrow('generation stopped after recovery');
            expect(await readFile(join(parent, 'mockdata', 'Records.json'), 'utf8')).toBe('[{"ID":1}]');
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    test('preserves a user edit made during generation', async () => {
        const root = await mkdtemp(join(tmpdir(), 'mockgen-project-conflict-'));
        const dataDirectory = join(root, 'webapp', 'localService', 'mockdata');
        const target = join(dataDirectory, 'Records.json');
        try {
            await mkdir(dataDirectory, { recursive: true });
            await writeFile(target, '[{"ID":1}]');
            generateService.mockImplementationOnce(async () => {
                await writeFile(target, '[{"ID":2}]');
                return {
                    validation: { passed: true, semantic: true, relationships: true },
                    resources: { Records: [{ ID: 3 }] }
                };
            });
            await expect(
                generateProjectData({
                    projectRoot: root,
                    dataDirectory: 'webapp/localService/mockdata',
                    request: {
                        metadata: { format: 'edmx', content: '<edmx/>' },
                        service: { urlPath: '/records', odataVersion: '4.0' },
                        targets: [{ name: 'Records', kind: 'entity-set' }],
                        existingData: {}
                    }
                })
            ).rejects.toThrow('changed during generation');
            expect(await readFile(target, 'utf8')).toBe('[{"ID":2}]');
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    test('writes the generated sets and leaves a skipped entity set untouched', async () => {
        const root = await mkdtemp(join(tmpdir(), 'mockgen-project-skipped-'));
        const dataDirectory = join(root, 'webapp', 'localService', 'mockdata');
        try {
            // Given an existing file for an entity set the schema cannot generate
            await mkdir(dataDirectory, { recursive: true });
            await writeFile(join(dataDirectory, 'Scans.json'), '[{"ID":1}]');
            generateService.mockImplementationOnce(async () => ({
                validation: { passed: true, semantic: true, relationships: true },
                resources: { Records: [{ ID: 3 }] },
                diagnostics: [
                    { code: 'SCHEMA_ENTITY_SET_SKIPPED', severity: 'warning', target: 'Scans', message: 'skipped' }
                ]
            }));

            // When project data is generated for both sets
            const generated = await generateProjectData({
                projectRoot: root,
                dataDirectory: 'webapp/localService/mockdata',
                request: {
                    metadata: { format: 'edmx', content: '<edmx/>' },
                    service: { urlPath: '/records', odataVersion: '4.0' },
                    targets: [
                        { name: 'Records', kind: 'entity-set' },
                        { name: 'Scans', kind: 'entity-set' }
                    ],
                    existingData: {}
                }
            });

            // Then only the generated set is written and the skipped set keeps its file
            expect(generated.files).toEqual(['webapp/localService/mockdata/Records.json']);
            expect((await readdir(dataDirectory)).sort()).toEqual(['Records.json', 'Scans.json']);
            expect(await readFile(join(dataDirectory, 'Scans.json'), 'utf8')).toBe('[{"ID":1}]');
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
});
