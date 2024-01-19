import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import { getAppProgrammingLanguage, getAppType, getProjectType } from '../../src';

describe('Test getAppProgrammingLanguage()', () => {
    const sampleRoot = join(__dirname, '../test-data/project/info');
    test('Detect TypeScript app, no mem-fs', async () => {
        expect(await getAppProgrammingLanguage(join(sampleRoot, 'typescript-app'))).toBe('TypeScript');
    });

    test('Detect JavaScript app, no mem-fs', async () => {
        expect(await getAppProgrammingLanguage(join(sampleRoot, 'javascript-app'))).toBe('JavaScript');
    });

    test('Detect app language, .ts file deleted in mem-fs, no app language', async () => {
        const fs = create(createStorage());
        fs.delete(join(sampleRoot, 'typescript-app/webapp/index.ts'));
        expect(await getAppProgrammingLanguage(join(sampleRoot, 'typescript-app'), fs)).toBe('');
    });

    test('Detect app language, no webapp folder', async () => {
        const fs = create(createStorage());
        fs.delete(join(sampleRoot, 'javascript-app/webapp'));
        expect(await getAppProgrammingLanguage(join(sampleRoot, 'javascript-app'), fs)).toBe('');
    });
});

describe('Test getProjectType()', () => {
    const sampleRoot = join(__dirname, '../test-data/project/find-all-apps');

    test('Type EDMXBackend', async () => {
        const projectType = await getProjectType(join(sampleRoot, 'single_apps/fiori_elements'));
        expect(projectType).toBe('EDMXBackend');
    });

    test('Type CAPJava', async () => {
        const projectType = await getProjectType(join(sampleRoot, 'CAP/CAPJava_mix'));
        expect(projectType).toBe('CAPJava');
    });

    test('Type CAPNodejs', async () => {
        const projectType = await getProjectType(join(sampleRoot, 'CAP/CAPnode_mix'));
        expect(projectType).toBe('CAPNodejs');
    });
});

describe('Test getAppType()', () => {
    const sampleRoot = join(__dirname, '../test-data/project/find-all-apps');

    test('Type Fiori elements', async () => {
        const appType = await getAppType(join(sampleRoot, 'single_apps/fiori_elements'));
        expect(appType).toBe('SAP Fiori elements');
    });

    test('Type Fiori elements in CAP', async () => {
        const appType = await getAppType(join(sampleRoot, 'CAP/CAPJava_mix/app/fiori_elements'));
        expect(appType).toBe('SAP Fiori elements');
    });

    test('Type SAPUI5 freestyle', async () => {
        const appType = await getAppType(join(sampleRoot, 'single_apps/freestyle'));
        expect(appType).toBe('SAPUI5 freestyle');
    });

    test('Type SAPUI5 freestyle in CAP', async () => {
        const appType = await getAppType(join(sampleRoot, 'CAP/CAPJava_freestyle/app/freestyle'));
        expect(appType).toBe('SAPUI5 freestyle');
    });

    test('Type Extension', async () => {
        const appType = await getAppType(join(sampleRoot, 'extensions/valid-extension'));
        expect(appType).toBe('SAPUI5 Extension');
    });

    test('Type Reuse', async () => {
        const appType = await getAppType(join(sampleRoot, 'libraries/valid-library'));
        expect(appType).toBe('Fiori Reuse');
    });

    test('Type Adaptation', async () => {
        const appType = await getAppType(join(sampleRoot, 'adaptations/valid-adaptation'));
        expect(appType).toBe('Fiori Adaptation');
    });

    test('Undefined type', async () => {
        const appType = await getAppType(join(sampleRoot, 'adaptations/invalid-adaptation'));
        expect(appType).toBeUndefined();
    });
});
