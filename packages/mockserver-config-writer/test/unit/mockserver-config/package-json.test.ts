import { join } from 'path';
import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { Editor } from 'mem-fs-editor';
import type { Package } from '@sap-ux/project-access';
import { enhancePackageJson } from '../../../src/mockserver-config/package-json';

describe('Test for start-mock script in package.json', () => {
    test('Copy basic start script from package.json', () => {
        const fs = getMockFsPackageJson('fiori run');
        enhancePackageJson(fs, join('/'));
        const startMock = (fs.readJSON(join('/package.json')) as Package).scripts?.['start-mock'];
        expect(startMock).toBe('fiori run --config ./ui5-mock.yaml');
    });

    test('Copy start script with --config', () => {
        const fs = getMockFsPackageJson('fiori run --config .');
        enhancePackageJson(fs, join('/'));
        const startMock = (fs.readJSON(join('/package.json')) as Package).scripts?.['start-mock'];
        expect(startMock).toBe('fiori run --config ./ui5-mock.yaml');
    });

    test('Copy start script with --config and apostrophe path', () => {
        const fs = getMockFsPackageJson("fiori run --config     'path/with/a postrophe/any.yaml'  ");
        enhancePackageJson(fs, join('/'));
        const startMock = (fs.readJSON(join('/package.json')) as Package).scripts?.['start-mock'];
        expect(startMock).toBe('fiori run --config ./ui5-mock.yaml  ');
    });

    test('Copy start script that contains multiple --config and path with space from package.json', () => {
        const fs = getMockFsPackageJson(
            'any --config before && fiori run --open "folder/file.html?some-param=value#frag-ment" --config "ui5 .yaml" --other arg'
        );
        enhancePackageJson(fs, join('/'));
        const startMock = (fs.readJSON(join('/package.json')) as Package).scripts?.['start-mock'];
        expect(startMock).toBe(
            'any --config before && fiori run --open "folder/file.html?some-param=value#frag-ment" --config ./ui5-mock.yaml --other arg'
        );
    });

    function getMockFsPackageJson(startScript?: string, startMockScript?: string): Editor {
        const fs = create(createStorage());
        const packageJson: Package = {};
        if (startScript) {
            packageJson.scripts ||= {};
            packageJson.scripts['start'] = startScript;
        }
        if (startMockScript) {
            packageJson.scripts ||= {};
            packageJson.scripts['start-mock'] = startMockScript;
        }
        fs.writeJSON(join('/package.json'), packageJson);
        return fs;
    }
});
