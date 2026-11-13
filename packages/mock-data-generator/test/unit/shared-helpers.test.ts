import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { isPathInside, isRecord, isSha256Hex } from '../../src/guards.js';
import { canonicalJson, sha256, sha256File, sha256Uint32 } from '../../src/hash.js';

describe('shared guards', () => {
    it('accepts only non-array objects as records', () => {
        // Given values of every JSON shape
        const values = [{}, { a: 1 }, [], null, 'text', 1, true, undefined];
        // When each is checked
        const accepted = values.map((value) => isRecord(value));
        // Then only the two plain objects are records
        expect(accepted).toEqual([true, true, false, false, false, false, false, false]);
    });

    it('accepts only lowercase 64-character hexadecimal SHA-256 digests', () => {
        // Given a valid digest and near misses
        const digest = 'ab'.repeat(32);
        // When each is checked
        // Then only the lowercase digest of the exact length passes
        expect(isSha256Hex(digest)).toBe(true);
        expect(isSha256Hex(digest.toUpperCase())).toBe(false);
        expect(isSha256Hex(digest.slice(1))).toBe(false);
        expect(isSha256Hex(`${digest}0`)).toBe(false);
        expect(isSha256Hex(`${digest.slice(1)}g`)).toBe(false);
        expect(isSha256Hex(undefined)).toBe(false);
    });

    it('treats the root and its descendants as inside, and siblings and parents as outside', () => {
        // Given a resolved root directory
        const root = resolve('/app/root');
        // When candidate paths are checked
        // Then the root and descendants are inside; a parent, a sibling with a shared prefix and a
        // traversal out of the root are not
        expect(isPathInside(root, root)).toBe(true);
        expect(isPathInside(root, join(root, 'webapp', 'data'))).toBe(true);
        expect(isPathInside(root, resolve('/app'))).toBe(false);
        expect(isPathInside(root, resolve('/app/root-other'))).toBe(false);
        expect(isPathInside(root, resolve(root, '..', 'other'))).toBe(false);
        expect(isPathInside(root, join(root, '..data'))).toBe(true);
    });
});

describe('shared hashing', () => {
    let directory: string;

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'mockgen-hash-'));
    });

    afterEach(async () => {
        await rm(directory, { recursive: true, force: true });
    });

    it('writes canonical JSON with object keys in code-unit order at every depth', () => {
        // Given objects whose keys are written in different orders
        const left = { b: [1, { y: null, x: 'é' }], a: true };
        const right = { a: true, b: [1, { x: 'é', y: null }] };
        // When both are serialized
        // Then the text is identical, sorted and otherwise plain JSON
        expect(canonicalJson(left)).toBe('{"a":true,"b":[1,{"x":"é","y":null}]}');
        expect(canonicalJson(right)).toBe(canonicalJson(left));
        expect(canonicalJson({ Z: 1, a: 2, _: 3 })).toBe('{"Z":1,"_":3,"a":2}');
        expect(canonicalJson('text')).toBe('"text"');
    });

    it('hashes text and bytes to the same SHA-256 digest', () => {
        // Given the text "abc" and its UTF-8 bytes
        // When both are hashed
        // Then both give the published SHA-256 test vector
        const expected = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
        expect(sha256('abc')).toBe(expected);
        expect(sha256(new TextEncoder().encode('abc'))).toBe(expected);
        expect(sha256Uint32('abc')).toBe(0xba7816bf);
    });

    it('streams a file to the same digest as hashing its bytes', async () => {
        // Given a file on disk
        const path = join(directory, 'artifact.bin');
        await writeFile(path, 'abc');
        // When it is hashed as a stream
        // Then the digest equals the in-memory digest
        await expect(sha256File(path)).resolves.toBe(sha256('abc'));
    });

    it('stops streaming once the signal is aborted', async () => {
        // Given a file and an aborted signal
        const path = join(directory, 'artifact.bin');
        await writeFile(path, 'abc');
        const controller = new AbortController();
        controller.abort(new Error('cancelled'));
        // When the file is hashed
        // Then the abort reason propagates
        await expect(sha256File(path, controller.signal)).rejects.toThrow('cancelled');
    });

    it('propagates a read error for a missing file', async () => {
        // Given a path with no file
        // When it is hashed
        // Then the file-system error propagates with its code
        await expect(sha256File(join(directory, 'missing.bin'))).rejects.toMatchObject({ code: 'ENOENT' });
    });
});
