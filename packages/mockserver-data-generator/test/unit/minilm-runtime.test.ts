import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMiniLmTextEmbedder, type OnnxBackend } from '../../src/model/minilm-runtime.js';

describe('MiniLM ONNX classifier runtime', () => {
    let directory: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'mockgen-minilm-'));
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    test('uses the pilot WordPiece contract and mean-pools normalized embeddings', async () => {
        const vocabularyPath = join(directory, 'vocab.txt');
        await writeFile(
            vocabularyPath,
            [
                '[PAD]',
                '[UNK]',
                '[CLS]',
                '[SEP]',
                'customer',
                'email',
                'field',
                'of',
                'a',
                'contact',
                '(',
                'related',
                ':',
                ')'
            ].join('\n')
        );
        const run = jest.fn(async (feeds: Readonly<Record<string, { data: BigInt64Array; dims: number[] }>>) => {
            expect(Array.from(feeds.input_ids?.data ?? [])).toEqual([
                2n,
                4n,
                5n,
                6n,
                7n,
                8n,
                9n,
                10n,
                11n,
                12n,
                13n,
                3n
            ]);
            const sequenceLength = feeds.input_ids?.dims[1] ?? 0;
            const values = new Float32Array(sequenceLength * 2);
            for (let index = 0; index < sequenceLength; index += 1) {
                values[index * 2] = 3;
                values[index * 2 + 1] = 4;
            }
            return { last_hidden_state: { data: values, dims: [1, sequenceLength, 2] } };
        });
        const backend: OnnxBackend = {
            createSession: jest.fn(async () => ({ run, dispose: jest.fn(async () => undefined) })),
            tensor: (_type, data, dims) => ({ data, dims })
        };
        const embedder = await createMiniLmTextEmbedder({
            modelPath: join(directory, 'model.onnx'),
            vocabularyPath,
            hiddenSize: 2,
            backend
        });

        const vectors = await embedder.embed(
            ['Customer Email field of a Contact (related: )'],
            new AbortController().signal
        );

        expect(vectors).toHaveLength(1);
        expect(vectors[0]?.[0]).toBeCloseTo(0.6);
        expect(vectors[0]?.[1]).toBeCloseTo(0.8);
        expect(run).toHaveBeenCalledTimes(1);
        await embedder.dispose();
    });

    test('propagates cancellation before invoking ONNX', async () => {
        const vocabularyPath = join(directory, 'vocab.txt');
        await writeFile(vocabularyPath, ['[PAD]', '[UNK]', '[CLS]', '[SEP]'].join('\n'));
        const run = jest.fn();
        const backend: OnnxBackend = {
            createSession: jest.fn(async () => ({ run })),
            tensor: (_type, data, dims) => ({ data, dims })
        };
        const embedder = await createMiniLmTextEmbedder({
            modelPath: join(directory, 'model.onnx'),
            vocabularyPath,
            hiddenSize: 2,
            backend
        });
        const controller = new AbortController();
        controller.abort();

        await expect(embedder.embed(['anything'], controller.signal)).rejects.toThrow();
        expect(run).not.toHaveBeenCalled();
    });

    test('drains unresolved native inference before disposing the session', async () => {
        const vocabularyPath = join(directory, 'vocab.txt');
        await writeFile(vocabularyPath, ['[PAD]', '[UNK]', '[CLS]', '[SEP]'].join('\n'));
        let resolveRun!: (output: { last_hidden_state: { data: Float32Array; dims: number[] } }) => void;
        const runResult = new Promise<{ last_hidden_state: { data: Float32Array; dims: number[] } }>((resolve) => {
            resolveRun = resolve;
        });
        const run = jest.fn(() => runResult);
        const disposeSession = jest.fn(async () => undefined);
        const backend: OnnxBackend = {
            createSession: jest.fn(async () => ({ run, dispose: disposeSession })),
            tensor: (_type, data, dims) => ({ data, dims })
        };
        const embedder = await createMiniLmTextEmbedder({
            modelPath: join(directory, 'model.onnx'),
            vocabularyPath,
            hiddenSize: 2,
            backend
        });
        const controller = new AbortController();
        const inference = embedder.embed(['anything'], controller.signal);
        while (run.mock.calls.length === 0) {
            await new Promise((resolve) => setImmediate(resolve));
        }

        controller.abort();
        const disposal = embedder.dispose();
        await new Promise((resolve) => setImmediate(resolve));
        expect(disposeSession).not.toHaveBeenCalled();

        resolveRun({ last_hidden_state: { data: new Float32Array([3, 4, 3, 4, 3, 4]), dims: [1, 3, 2] } });
        await expect(inference).rejects.toThrow();
        await disposal;
        expect(disposeSession).toHaveBeenCalledTimes(1);
        await expect(embedder.embed(['later'], new AbortController().signal)).rejects.toThrow(/disposed/i);
    });
});
