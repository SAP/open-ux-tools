import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOST_COMPATIBILITY_ERROR } from '../../src/host-compatibility.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cliPath = join(packageRoot, 'dist', 'cli.js');
const CHILD_SCRIPT =
    "require('node:fs').writeFileSync(process.argv[1], process.env.SAP_UX_MOCKGEN_ENABLED ?? 'missing')";
const temporaryRoots: string[] = [];

function application(): string {
    const root = mkdtempSync(join(tmpdir(), 'mockgen-host-compatibility-'));
    temporaryRoots.push(root);
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'mockgen-host-test', private: true }));
    return root;
}

function installHost(appRoot: string, source: string): void {
    const hostRoot = join(appRoot, 'node_modules', '@sap-ux', 'ui5-middleware-fe-mockserver');
    mkdirSync(hostRoot, { recursive: true });
    writeFileSync(
        join(hostRoot, 'package.json'),
        JSON.stringify({
            name: '@sap-ux/ui5-middleware-fe-mockserver',
            version: '0.0.0-test',
            main: './index.cjs'
        })
    );
    writeFileSync(join(hostRoot, 'index.cjs'), source);
}

function runStart(appRoot: string, mockgen: boolean) {
    const sentinel = join(appRoot, 'child-ran.txt');
    const result = spawnSync(
        process.execPath,
        [cliPath, 'start', '--', process.execPath, '-e', CHILD_SCRIPT, sentinel, ...(mockgen ? ['--mockgen'] : [])],
        {
            cwd: appRoot,
            encoding: 'utf8',
            timeout: 30_000
        }
    );
    return { result, sentinel };
}

afterEach(() => {
    for (const root of temporaryRoots.splice(0)) {
        rmSync(root, { recursive: true, force: true });
    }
});

describe('application-local host compatibility CLI contract', () => {
    test('loads a compatible CommonJS host from the application before running the flagged child', () => {
        const appRoot = application();
        installHost(
            appRoot,
            'function middleware() {}\nmiddleware.MOCK_DATA_GENERATOR_API_VERSION = 1;\nmodule.exports = middleware;\n'
        );

        const { result, sentinel } = runStart(appRoot, true);

        expect({ status: result.status, stdout: result.stdout, stderr: result.stderr }).toEqual({
            status: 0,
            stdout: '',
            stderr: ''
        });
        expect(readFileSync(sentinel, 'utf8')).toBe('1');
    });

    test('runs the unflagged child without resolving a host', () => {
        const appRoot = application();

        const { result, sentinel } = runStart(appRoot, false);

        expect({ status: result.status, stdout: result.stdout, stderr: result.stderr }).toEqual({
            status: 0,
            stdout: '',
            stderr: ''
        });
        expect(readFileSync(sentinel, 'utf8')).toBe('0');
    });

    test.each([
        ['missing host', undefined],
        ['markerless host', 'module.exports = function middleware() {};\n'],
        [
            'wrong-version host',
            'function middleware() {}\nmiddleware.MOCK_DATA_GENERATOR_API_VERSION = 2;\nmodule.exports = middleware;\n'
        ],
        [
            'throwing host export',
            "module.exports = new Proxy(function middleware() {}, { getOwnPropertyDescriptor() { throw new Error('private /developer/path'); } });\n"
        ]
    ])('rejects a %s with one stable line and does not run the child', (_label, hostSource) => {
        const appRoot = application();
        if (hostSource !== undefined) {
            installHost(appRoot, hostSource);
        }

        const { result, sentinel } = runStart(appRoot, true);

        expect({ status: result.status, stdout: result.stdout, stderr: result.stderr }).toEqual({
            status: 1,
            stdout: '',
            stderr: `MockGen start failed: ${HOST_COMPATIBILITY_ERROR}\n`
        });
        expect(existsSync(sentinel)).toBe(false);
    });
});
