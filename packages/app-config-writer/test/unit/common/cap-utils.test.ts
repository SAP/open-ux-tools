import { jest } from '@jest/globals';
import { join } from 'node:path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';

const mockFindCapProjectRoot = jest.fn();
const mockGetProjectType = jest.fn();
const mockReadManifest = jest.fn();

jest.unstable_mockModule('@sap-ux/project-access', () => ({
    findCapProjectRoot: mockFindCapProjectRoot,
    getProjectType: mockGetProjectType
}));

jest.unstable_mockModule('../../../src/common/utils.js', () => ({
    readManifest: mockReadManifest
}));

const { getCapProjectInfo, writeCdsWatchScript } = await import('../../../src/common/cap-utils.js');

describe('getCapProjectInfo', () => {
    let mockFs: Editor;
    const basePath = '/cap-root/app/my_app';

    beforeEach(() => {
        jest.resetAllMocks();
        mockFs = {} as Editor;
        mockReadManifest.mockResolvedValue({ manifest: { 'sap.app': { id: 'ns.myapp' } } });
    });

    test('returns EDMXBackend info without reading manifest', async () => {
        mockFindCapProjectRoot.mockResolvedValue(null);
        mockGetProjectType.mockResolvedValue('EDMXBackend');

        const result = await getCapProjectInfo(basePath, mockFs);

        expect(result.projectType).toBe('EDMXBackend');
        expect(result.capRoot).toBeNull();
        expect(result.appFolderName).toBe('my_app');
        expect(mockGetProjectType).toHaveBeenCalledWith(basePath);
        expect(mockReadManifest).not.toHaveBeenCalled();
    });

    test('returns CAPNodejs info with appId from manifest', async () => {
        mockFindCapProjectRoot.mockResolvedValue('/cap-root');
        mockGetProjectType.mockResolvedValue('CAPNodejs');

        const result = await getCapProjectInfo(basePath, mockFs);

        expect(result.projectType).toBe('CAPNodejs');
        expect(result.capRoot).toBe('/cap-root');
        expect(result.appFolderName).toBe('my_app');
        if (result.projectType === 'CAPNodejs') {
            expect(result.appId).toBe('ns.myapp');
        }
        expect(mockGetProjectType).toHaveBeenCalledWith('/cap-root');
    });

    test('returns CAPJava info with appId from manifest', async () => {
        mockFindCapProjectRoot.mockResolvedValue('/cap-root');
        mockGetProjectType.mockResolvedValue('CAPJava');

        const result = await getCapProjectInfo(basePath, mockFs);

        expect(result.projectType).toBe('CAPJava');
        expect(result.capRoot).toBe('/cap-root');
    });

    test('throws when sap.app.id is missing from manifest in CAP project', async () => {
        mockFindCapProjectRoot.mockResolvedValue('/cap-root');
        mockGetProjectType.mockResolvedValue('CAPNodejs');
        mockReadManifest.mockResolvedValue({ manifest: { 'sap.app': {} } });

        await expect(getCapProjectInfo(basePath, mockFs)).rejects.toThrow(
            "The 'sap.app.id' property is missing in the manifest.json file."
        );
    });
});

describe('writeCdsWatchScript', () => {
    const capRoot = '/cap-root';

    test('writes cds watch script to CAP root package.json', () => {
        const fs = create(createStorage());
        fs.writeJSON(join(capRoot, 'package.json'), { name: 'cap-project' });

        writeCdsWatchScript(capRoot, 'start-cards-generator-my_app', 'ns.myapp/test/flpCards.html#app-preview', fs);

        const pkg = fs.readJSON(join(capRoot, 'package.json')) as Record<string, unknown>;
        expect((pkg.scripts as Record<string, string>)['start-cards-generator-my_app']).toBe(
            'cds watch --open "ns.myapp/test/flpCards.html#app-preview"'
        );
    });

    test('preserves existing scripts', () => {
        const fs = create(createStorage());
        fs.writeJSON(join(capRoot, 'package.json'), {
            name: 'cap-project',
            scripts: { 'watch-my_app': 'cds watch --open my_app/webapp/index.html' }
        });

        writeCdsWatchScript(capRoot, 'start-cards-generator-my_app', 'ns.myapp/test/flpCards.html#app-preview', fs);

        const pkg = fs.readJSON(join(capRoot, 'package.json')) as Record<string, unknown>;
        const scripts = pkg.scripts as Record<string, string>;
        expect(scripts['watch-my_app']).toBe('cds watch --open my_app/webapp/index.html');
        expect(scripts['start-cards-generator-my_app']).toBeDefined();
    });

    test('throws when CAP root package.json does not exist', () => {
        const fs = create(createStorage());

        expect(() =>
            writeCdsWatchScript(capRoot, 'start-cards-generator-my_app', 'ns.myapp/test/flpCards.html', fs)
        ).toThrow(`package.json not found at CAP root: ${capRoot}`);
    });
});
