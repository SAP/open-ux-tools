import { jest } from '@jest/globals';
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import * as actualFs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Windows refuses to move a directory another process, such as a virus scanner, has open; the refusal is scripted
// for the move that clears away a finished transaction.
let refuseCleanup = false;
let refuseRemoval = false;
let generationError: Error | undefined;

jest.unstable_mockModule('node:fs/promises', () => ({
    ...actualFs,
    rename: async (from: string, to: string): Promise<void> => {
        if (refuseCleanup && basename(to).startsWith('.mockgen-trash-')) {
            throw Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' });
        }
        return actualFs.rename(from, to);
    },
    rm: async (path: string, options?: Parameters<typeof actualFs.rm>[1]): Promise<void> => {
        if (refuseRemoval && basename(path).startsWith('.mockgen-project-')) {
            throw Object.assign(new Error('EBUSY: resource busy or locked'), { code: 'EBUSY' });
        }
        return actualFs.rm(path, options);
    }
}));
jest.unstable_mockModule(fileURLToPath(new URL('../../src/standalone.ts', import.meta.url)), () => ({
    createMockDataGenerator: async () => ({
        generateService: async () => {
            if (generationError) {
                throw generationError;
            }
            return {
                validation: { passed: true, semantic: true, relationships: true },
                resources: { Records: [{ ID: 3 }] }
            };
        },
        dispose: async () => undefined
    })
}));

const { generateProjectData } = await import('../../src/project-data.js');

const input = (root: string) =>
    ({
        projectRoot: root,
        dataDirectory: 'mockdata',
        request: {
            metadata: { format: 'edmx', content: '<edmx/>' },
            service: { urlPath: '/records', odataVersion: '4.0' },
            targets: [{ name: 'Records', kind: 'entity-set' }],
            existingData: {}
        }
    }) as const;

describe('project data cleanup on a file system that refuses to move the finished transaction', () => {
    let root: string;

    beforeEach(async () => {
        // The real path, because the project root is resolved before any file is moved (macOS links /var).
        root = await realpath(await mkdtemp(join(tmpdir(), 'mockgen-project-cleanup-')));
        refuseCleanup = false;
        refuseRemoval = false;
        generationError = undefined;
    });

    afterEach(async () => {
        await rm(root, { recursive: true, force: true });
    });

    it('removes the finished transaction in place and reports the installed data', async () => {
        // Given a file system that refuses the cleanup move once the data is installed
        refuseCleanup = true;

        // When project data is generated
        const outcome = await generateProjectData(input(root));

        // Then the call reports the files it installed and leaves nothing behind
        expect(outcome.files.map((file) => basename(file))).toEqual(['Records.json']);
        expect(JSON.parse(await readFile(join(root, 'mockdata', 'Records.json'), 'utf8'))).toEqual([{ ID: 3 }]);
        expect(await readdir(root)).toEqual(['mockdata']);
    });

    it('reports the installed data when the transaction cannot be removed at all, and the next run clears it', async () => {
        // Given a file system that refuses both to move and to delete the finished transaction
        refuseCleanup = true;
        refuseRemoval = true;

        // When project data is generated
        const outcome = await generateProjectData(input(root));

        // Then the call reports the files it installed
        expect(outcome.files.map((file) => basename(file))).toEqual(['Records.json']);
        expect(JSON.parse(await readFile(join(root, 'mockdata', 'Records.json'), 'utf8'))).toEqual([{ ID: 3 }]);

        // And the next run, on a file system that allows it, leaves only the data directory
        refuseCleanup = false;
        refuseRemoval = false;
        await generateProjectData(input(root));
        expect(await readdir(root)).toEqual(['mockdata']);
    });

    it('keeps the installed data, not the backup of the data it replaced, when the next run recovers', async () => {
        // Given existing data that an install replaces, and a file system that refuses to remove the transaction
        await mkdir(join(root, 'mockdata'));
        await writeFile(join(root, 'mockdata', 'Records.json'), '[{"ID":1}]');
        refuseCleanup = true;
        refuseRemoval = true;
        await generateProjectData(input(root));
        expect((await readdir(root)).filter((name) => name.startsWith('.mockgen-project-'))).toHaveLength(1);

        // When the next run recovers the transaction left behind and then fails to generate
        refuseCleanup = false;
        refuseRemoval = false;
        generationError = new Error('generation failed');
        await expect(generateProjectData(input(root))).rejects.toThrow('generation failed');

        // Then the installed data stays, and the transaction with the backup is gone
        expect(JSON.parse(await readFile(join(root, 'mockdata', 'Records.json'), 'utf8'))).toEqual([{ ID: 3 }]);
        expect(await readdir(root)).toEqual(['mockdata']);
    });
});
