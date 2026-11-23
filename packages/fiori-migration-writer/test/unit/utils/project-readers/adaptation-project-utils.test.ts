import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { createMemFsEditor } from '../../../../src/utils/fs-adapter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { checkMigratableAdaptationProject, isFioriToolsAdaptationProject } =
    await import('../../../../src/utils/project-readers/adaptation-project-utils.js');

describe('adaptation-project-utils', () => {
    const testOutputDir = join(__dirname, '../../../../test-output', 'adaptation-project-utils');

    beforeEach(async () => {
        await mkdir(testOutputDir, { recursive: true });
    });

    afterEach(async () => {
        await rm(testOutputDir, { recursive: true, force: true });
    });

    test('isFioriToolsAdaptationProject detects .adp/config.json', async () => {
        const root = join(testOutputDir, 'fiori-adp');
        await mkdir(join(root, '.adp'), { recursive: true });
        await writeFile(join(root, '.adp', 'config.json'), JSON.stringify({ target: {} }));
        expect(await isFioriToolsAdaptationProject(createMemFsEditor(), root)).toBe(true);
    });

    test('isFioriToolsAdaptationProject returns false when no .adp/config.json', async () => {
        const root = join(testOutputDir, 'no-adp');
        await mkdir(root, { recursive: true });
        expect(await isFioriToolsAdaptationProject(createMemFsEditor(), root)).toBe(false);
    });

    test('resolves a Fiori Tools adaptation project from .adp/config.json', async () => {
        const root = join(testOutputDir, 'fiori-tools-adp');
        await mkdir(join(root, '.adp'), { recursive: true });
        await writeFile(join(root, '.adp', 'config.json'), JSON.stringify({ target: { url: 'http://host' } }));
        const result = await checkMigratableAdaptationProject(createMemFsEditor(), root);
        expect(result).toBeDefined();
        expect(result.isAdp).toBe(true);
    });

    test('resolves a legacy WebIDE adaptation project from .che/project.json uiadaptation', async () => {
        const root = join(testOutputDir, 'legacy-adp');
        await mkdir(join(root, '.che'), { recursive: true });
        const settings = JSON.stringify({ uiadaptation: { reference: 'base.app', layer: 'CUSTOMER_BASE' } });
        await writeFile(
            join(root, '.che', 'project.json'),
            JSON.stringify({ attributes: { 'sap.watt.common.setting': [settings] } })
        );
        const result = await checkMigratableAdaptationProject(createMemFsEditor(), root);
        expect(result).toBeDefined();
        expect(result.reference).toBe('base.app');
    });

    test('derives an appvariant from manifest.appdescr_variant when no settings file exists', async () => {
        const root = join(testOutputDir, 'appdescr-only');
        await mkdir(join(root, 'webapp'), { recursive: true });
        await writeFile(
            join(root, 'webapp', 'manifest.appdescr_variant'),
            JSON.stringify({ reference: 'base.reference.app' })
        );
        const result = await checkMigratableAdaptationProject(createMemFsEditor(), root);
        expect(result).toBeDefined();
        expect(result.reference).toBe('base.reference.app');
    });

    test('returns undefined for a non-adaptation project', async () => {
        const root = join(testOutputDir, 'plain');
        await mkdir(root, { recursive: true });
        expect(await checkMigratableAdaptationProject(createMemFsEditor(), root)).toBeUndefined();
    });
});
