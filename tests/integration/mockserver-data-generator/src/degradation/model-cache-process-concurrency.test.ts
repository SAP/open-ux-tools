import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, test } from '@jest/globals';

const GENERATOR_ENTRY = fileURLToPath(
    new URL('../../../../../packages/mockserver-data-generator/dist/index.js', import.meta.url)
);
const MODEL_BYTES = Buffer.from('cross-process model-cache fixture');
const temporaryDirectories: string[] = [];

/**
 * Create and track a disposable test directory.
 *
 * @returns Absolute temporary directory.
 */
function temporaryDirectory(): string {
    const directory = mkdtempSync(join(tmpdir(), 'mockgen-process-cache-'));
    temporaryDirectories.push(directory);
    return directory;
}

/**
 * Run one isolated production-package cache preparation process.
 *
 * @param workerPath Worker module path.
 * @param manifestPath Model manifest path.
 * @param cacheRoot Shared cache root.
 * @returns Parsed worker result.
 */
function runPreparationWorker(
    workerPath: string,
    manifestPath: string,
    cacheRoot: string
): Promise<{ ready: boolean }> {
    return new Promise((resolve, reject) => {
        const child = spawn(
            process.execPath,
            [workerPath, pathToFileURL(GENERATOR_ENTRY).href, manifestPath, cacheRoot],
            { stdio: ['ignore', 'pipe', 'pipe'] }
        );
        const stdout: Buffer[] = [];
        const stderr: Buffer[] = [];
        child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
        child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));
        child.once('error', reject);
        child.once('close', (code) => {
            const errorOutput = Buffer.concat(stderr).toString('utf8');
            if (code !== 0) {
                reject(new Error(`cache preparation worker exited ${String(code)}: ${errorOutput}`));
                return;
            }
            try {
                resolve(JSON.parse(Buffer.concat(stdout).toString('utf8')) as { ready: boolean });
            } catch (error) {
                reject(error);
            }
        });
    });
}

/**
 * Create a delayed local model server.
 *
 * @param onRequest Request observer.
 * @returns Unbound HTTP server.
 */
function createModelServer(onRequest: () => void): Server {
    return createServer((_request, response) => {
        onRequest();
        const respond = (): void => {
            response.writeHead(200, { 'content-length': MODEL_BYTES.length });
            response.end(MODEL_BYTES);
        };
        setTimeout(respond, 250);
    });
}

/**
 * Bind a fixture server to an ephemeral loopback port.
 *
 * @param server Server to bind.
 * @returns Bound port.
 */
async function listen(server: Server): Promise<number> {
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') {
        throw new Error('fixture server did not bind');
    }
    return address.port;
}

/**
 * Close a fixture server.
 *
 * @param server Server to close.
 * @returns Completion promise.
 */
function close(server: Server): Promise<void> {
    return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

afterEach(() => {
    for (const directory of temporaryDirectories.splice(0)) {
        rmSync(directory, { recursive: true, force: true });
    }
});

describe('model-cache process concurrency', () => {
    test('coalesces two independent preparations into one download and one verified publication', async () => {
        expect(existsSync(GENERATOR_ENTRY)).toBe(true);
        const root = temporaryDirectory();
        const cacheRoot = join(root, 'shared model cache 日本語');
        const manifestPath = join(root, 'model manifest.json');
        const workerPath = join(root, 'prepare-worker.mjs');
        mkdirSync(cacheRoot);
        let requests = 0;
        const server = createModelServer(() => {
            requests += 1;
        });
        const port = await listen(server);
        try {
            writeFileSync(
                manifestPath,
                JSON.stringify({
                    formatVersion: 1,
                    bundleId: 'process-concurrency',
                    revision: '3'.repeat(40),
                    lifecycle: 'development',
                    components: [
                        {
                            id: 'semantic-classifier',
                            kind: 'classifier',
                            version: '0.0.1',
                            fingerprint: 'a'.repeat(64),
                            files: [
                                {
                                    role: 'encoder',
                                    path: 'classifier/model.onnx',
                                    bytes: MODEL_BYTES.length,
                                    sha256: createHash('sha256').update(MODEL_BYTES).digest('hex'),
                                    url: `http://127.0.0.1:${port}/model.onnx`
                                }
                            ],
                            runtime: {
                                backend: 'onnx',
                                package: 'onnxruntime-node',
                                version: '1.24.3',
                                inputs: ['input_ids'],
                                outputs: ['last_hidden_state'],
                                outputFormat: 'embedding-classifier-v2'
                            },
                            license: { name: 'Apache-2.0', url: 'https://example.invalid/license' },
                            modelCardUrl: 'https://example.invalid/model-card'
                        }
                    ]
                })
            );
            writeFileSync(
                workerPath,
                [
                    "import { readFile } from 'node:fs/promises';",
                    'const [entry, manifestPath, cacheRoot] = process.argv.slice(2);',
                    'const { parseModelManifest, prepareModelCache } = await import(entry);',
                    "const manifest = parseModelManifest(JSON.parse(await readFile(manifestPath, 'utf8')));",
                    'const result = await prepareModelCache(cacheRoot, manifest, {',
                    '  acquisitionTimeoutMs: 5000, lockTimeoutMs: 5000, staleLockMs: 1000',
                    '});',
                    'process.stdout.write(JSON.stringify({ ready: result.ready }));'
                ].join('\n')
            );

            const results = await Promise.all([
                runPreparationWorker(workerPath, manifestPath, cacheRoot),
                runPreparationWorker(workerPath, manifestPath, cacheRoot)
            ]);

            expect(results).toEqual([{ ready: true }, { ready: true }]);
            expect(requests).toBe(1);
            const bundleDirectory = join(cacheRoot, 'process-concurrency', '3'.repeat(40));
            expect(readFileSync(join(bundleDirectory, 'classifier', 'model.onnx'))).toEqual(MODEL_BYTES);
            expect(readdirSync(bundleDirectory, { recursive: true })).not.toEqual(
                expect.arrayContaining([expect.stringMatching(/partial|lock|reclaim|release/)])
            );
        } finally {
            await close(server);
        }
    });
});
