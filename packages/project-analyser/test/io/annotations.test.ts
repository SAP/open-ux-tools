import path from 'node:path';
import { tmpdir } from 'node:os';
import { promises as fs } from 'node:fs';
import type { Logger } from '@sap-ux/logger';

jest.mock('fast-glob', () => jest.fn());
import fg from 'fast-glob';

const realFastGlob: any = jest.requireActual('fast-glob');

import { loadAnnotationDocuments } from '../../src/io/annotations';

describe('loadAnnotationDocuments', () => {
    let tempDir: string;

    beforeEach(async () => {
        (fg as unknown as jest.Mock).mockImplementation((pattern: any, options: any) => realFastGlob(pattern, options));
        tempDir = await fs.mkdtemp(path.join(tmpdir(), 'project-analyser-'));
    });

    afterEach(async () => {
        if (tempDir) {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
    });

    it('returns annotation documents with inferred formats', async () => {
        const annotationsDir = path.join(tempDir, 'annotations');
        await fs.mkdir(annotationsDir, { recursive: true });

        const fixtures = [
            { filename: 'travel.xml', content: '<Annotations />', format: 'xml' },
            { filename: 'travel.json', content: '{ "annotations": [] }', format: 'json' },
            { filename: 'travel.cds', content: 'annotate Travel with {};', format: 'cds' }
        ] as const;

        for (const { filename, content } of fixtures) {
            await fs.writeFile(path.join(annotationsDir, filename), content, 'utf8');
        }

        const documents = await loadAnnotationDocuments({ appPath: tempDir });

        expect(documents).toHaveLength(fixtures.length);
        for (const fixture of fixtures) {
            const matchingDoc = documents.find((doc) => doc.path === path.join(annotationsDir, fixture.filename));
            expect(matchingDoc).toEqual(
                expect.objectContaining({
                    content: fixture.content,
                    format: fixture.format
                })
            );
        }
    });

    it('filters out files that cannot be read', async () => {
        const annotationsDir = path.join(tempDir, 'annotations');
        await fs.mkdir(annotationsDir, { recursive: true });

        const goodFile = path.join(annotationsDir, 'good.xml');
        const badFile = path.join(annotationsDir, 'bad.xml');
        await fs.writeFile(goodFile, '<Annotations />', 'utf8');
        await fs.writeFile(badFile, '<Broken />', 'utf8');

        const originalReadFile = fs.readFile;
        const readFileSpy = jest.spyOn(fs, 'readFile').mockImplementation(async (filePath: any, options: any) => {
            if (typeof filePath === 'string' && filePath === badFile) {
                throw new Error('read failure');
            }
            return originalReadFile.call(fs, filePath, options);
        });

        try {
            const documents = await loadAnnotationDocuments({ appPath: tempDir });

            expect(documents).toHaveLength(1);
            expect(documents[0]).toEqual(
                expect.objectContaining({
                    path: goodFile,
                    format: 'xml'
                })
            );
        } finally {
            readFileSpy.mockRestore();
        }
    });

    it('logs a debug message and returns empty array when globbing fails', async () => {
        const logger = {
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
            add: jest.fn().mockReturnThis(),
            remove: jest.fn().mockReturnThis(),
            transports: jest.fn().mockReturnValue([]),
            child: jest.fn().mockReturnThis()
        } as unknown as Logger;

        (fg as unknown as jest.Mock).mockImplementation(() => {
            throw new Error('glob failure');
        });

        const documents = await loadAnnotationDocuments({ appPath: tempDir }, logger);

        expect(documents).toEqual([]);
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('Unable to load annotations directory'));
    });
});
