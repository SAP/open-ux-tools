import { jest } from '@jest/globals';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const mockPipeline = jest.fn();

jest.unstable_mockModule('@sap-ux/logger', () => ({
    ToolsLogger: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }))
}));

jest.unstable_mockModule('@huggingface/transformers', () => ({
    pipeline: mockPipeline,
    env: { cacheDir: '' }
}));

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataLocalPath = join(packageRoot, 'data_local');
const skillsPath = join(packageRoot, 'data_local', 'skills');

describe('build-embeddings data_local integration', () => {
    let EmbeddingBuilder: new () => {
        documents: Array<{ title: string; content: string; path: string }>;
        loadDocuments(): Promise<void>;
    };

    beforeAll(async () => {
        const module = await import('../src/scripts/build-embeddings.js');
        // EmbeddingBuilder is not exported via the public index — cast via unknown
        EmbeddingBuilder = (module as Record<string, unknown>).EmbeddingBuilder as typeof EmbeddingBuilder;
    });

    it('loads at least one document from each .md file in data_local', async () => {
        const builder = new EmbeddingBuilder();
        await builder.loadDocuments();

        const mdFiles = readdirSync(dataLocalPath).filter((f) => f.endsWith('.md'));
        expect(mdFiles.length).toBeGreaterThan(0);

        for (const file of mdFiles) {
            const loaded = builder.documents.filter((d) => d.path.endsWith(file));
            expect(loaded.length).toBeGreaterThan(0);
        }
    });

    it('loads at least one document from each skill references directory', async () => {
        if (!existsSync(skillsPath)) {
            return; // skills not copied yet — skip gracefully
        }

        const builder = new EmbeddingBuilder();
        await builder.loadDocuments();

        const skillDirs = readdirSync(skillsPath, { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => e.name);

        expect(skillDirs.length).toBeGreaterThan(0);

        for (const skill of skillDirs) {
            const skillRefPath = join(skillsPath, skill);
            const mdFiles = readdirSync(skillRefPath).filter((f) => f.endsWith('.md'));
            for (const file of mdFiles) {
                const loaded = builder.documents.filter((d) => d.path.endsWith(file));
                expect(loaded.length).toBeGreaterThan(0);
            }
        }
    });

    it('all loaded documents have non-empty content', async () => {
        const builder = new EmbeddingBuilder();
        await builder.loadDocuments();

        expect(builder.documents.length).toBeGreaterThan(0);
        for (const doc of builder.documents) {
            expect(doc.content.trim().length).toBeGreaterThan(0);
        }
    });
});
