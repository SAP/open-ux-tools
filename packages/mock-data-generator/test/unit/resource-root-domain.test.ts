import { createHash } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMockDataGenerator } from '../../src/standalone.js';
import { packagedBanks } from '../../src/semantics/bank-store.js';

// This file runs in its own module registry, so its first session fixes the domain resource root.

const PACKAGE_RESOURCES = fileURLToPath(new URL('../../resources', import.meta.url));
const DATA_RESOURCES = [
    'models/manifest.json',
    'banks/value-banks.v2.json',
    'rules/semantic-rules.v1.json',
    'rules/role-registry.v1.json'
];
const MARKER_VALUE = 'Relocated Resource Probe';

/**
 * Copy the data resources and the manifest to a new directory.
 *
 * @returns the new resource root
 */
async function copyResources(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'mockgen-domain-root-'));
    for (const path of DATA_RESOURCES) {
        await mkdir(join(root, path, '..'), { recursive: true });
        await copyFile(join(PACKAGE_RESOURCES, path), join(root, path));
    }
    return root;
}

/**
 * Replace the first measurement dimension of the copied value banks and declare the new bytes in the copied
 * manifest.
 *
 * @param root the copied resource root
 */
async function markValueBank(root: string): Promise<void> {
    const bankPath = join(root, 'banks/value-banks.v2.json');
    const banks = JSON.parse(await readFile(bankPath, 'utf8')) as { banks: Record<string, { values: string[] }> };
    banks.banks['role:measurement-dimensions'].values[0] = MARKER_VALUE;
    const bytes = Buffer.from(JSON.stringify(banks));
    await writeFile(bankPath, bytes);
    const manifestPath = join(root, 'models/manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
        datasets: Array<{ id: string; bytes: number; sha256: string }>;
    };
    for (const dataset of manifest.datasets.filter(({ id }) => id === 'mockgen-value-banks')) {
        dataset.bytes = bytes.length;
        dataset.sha256 = createHash('sha256').update(bytes).digest('hex');
    }
    await writeFile(manifestPath, JSON.stringify(manifest));
}

describe('domain resources below the resource root', () => {
    const roots: string[] = [];

    afterAll(async () => {
        await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
    });

    it('reads the value banks from the resource root of the first session', async () => {
        // Given a resource root whose value banks differ from the package's own
        const root = await copyResources();
        roots.push(root);
        await markValueBank(root);
        // When the first session of the process is created on it
        const generator = await createMockDataGenerator({ resourceRoot: root });
        await generator.dispose();
        // Then the value banks come from that root
        expect(packagedBanks().measurementDimensions[0]).toBe(MARKER_VALUE);
    });

    it('accepts a later session on a byte-identical copy of the loaded resources', async () => {
        // Given a second root holding the same marked value banks
        const copy = await copyResources();
        roots.push(copy);
        await markValueBank(copy);
        // When a session is created on it, Then it is accepted
        const generator = await createMockDataGenerator({ resourceRoot: copy });
        await generator.dispose();
        expect(packagedBanks().measurementDimensions[0]).toBe(MARKER_VALUE);
    });

    it('rejects a later session whose resources differ from the loaded ones', async () => {
        // Given the process loaded the marked value banks
        // When a session is created on the package's own resources, Then the conflict names both roots
        await expect(createMockDataGenerator()).rejects.toMatchObject({
            code: 'CONFIGURATION_INVALID',
            message: expect.stringContaining('value-bank store')
        });
    });
});
