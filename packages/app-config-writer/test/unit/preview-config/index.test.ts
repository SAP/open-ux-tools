import { join } from 'path';
import {
    renameDefaultSandboxes,
    deleteNoLongerUsedFiles,
    checkPrerequisites,
    updatePreviewMiddlewareConfigs,
    updatePreviewMiddlewareConfig,
    ensurePreviewMiddlewareDependency
} from '../../../src/preview-config';
import { ToolsLogger } from '@sap-ux/logger';
import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import type { PreviewConfigOptions } from '../../../src/types';
import type { CustomMiddleware } from '@sap-ux/ui5-config';

describe('check prerequisites', () => {
    const logger = new ToolsLogger();
    const errorLogMock = jest.spyOn(ToolsLogger.prototype, 'error').mockImplementation(() => {});
    const basePath = join(__dirname, '../../fixtures/preview-config');
    const fs = create(createStorage());

    beforeEach(() => {
        jest.clearAllMocks();
        fs.delete(join(basePath, 'various-configs', 'package.json'));
    });

    test('check prerequisites with bestpractice build dependency', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({ devDependencies: { '@sap/grunt-sapui5-bestpractice-build': '1.0.0' } })
        );

        expect(await checkPrerequisites(basePath, fs, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            "A conversion from '@sap/grunt-sapui5-bestpractice-build' is not supported. Please migrate to UI5 CLI version 3.0.0 or higher first. See https://sap.github.io/ui5-tooling/v3/updates/migrate-v3/ for more information."
        );
    });

    test('check prerequisites with UI5 cli 2.0 dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '2.0.0' } }));

        expect(await checkPrerequisites(basePath, fs, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            'UI5 CLI version 3.0.0 or higher is required to convert the preview to virtual files. See https://sap.github.io/ui5-tooling/v3/updates/migrate-v3/ for more information.'
        );
    });

    test('check prerequisites w/o mockserver dependency', async () => {
        fs.write(join(basePath, 'package.json'), JSON.stringify({ devDependencies: { '@ui5/cli': '3.0.0' } }));

        expect(await checkPrerequisites(basePath, fs, logger)).toBeFalsy();
        expect(errorLogMock).toHaveBeenCalledWith(
            "A conversion from 'sap/ui/core/util/MockServer' is not supported. Please migrate to '@sap-ux/ui5-middleware-fe-mockserver' first (details see https://www.npmjs.com/package/@sap-ux/ui5-middleware-fe-mockserver)."
        );
    });

    test('check prerequisites w/o mockserver dependency but with cds-plugin-ui5 dependency', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({ devDependencies: { '@ui5/cli': '3.0.0', 'cds-plugin-ui5': '6.6.6' } })
        );

        expect(await checkPrerequisites(basePath, fs, logger)).toBeTruthy();
    });

    test('check prerequisites fulfilled', async () => {
        fs.write(
            join(basePath, 'package.json'),
            JSON.stringify({
                devDependencies: { '@ui5/cli': '3.0.0', '@sap-ux/ui5-middleware-fe-mockserver': '6.6.6' }
            })
        );

        expect(await checkPrerequisites(basePath, fs, logger)).toBeTruthy();
    });
});

describe('convertPreview', () => {
    const logger = new ToolsLogger();
    const infoLogMock = jest.spyOn(ToolsLogger.prototype, 'info').mockImplementation(() => {});
    const warnLogMock = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation(() => {});
    const errorLogMock = jest.spyOn(ToolsLogger.prototype, 'error').mockImplementation(() => {});
    const basePath = join(__dirname, '../../fixtures/preview-config');
    let fs: Editor;

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
    });

    test('rename default Sandboxes', async () => {
        fs.write(join(basePath, 'webapp', 'test', 'flpSandbox.html'), 'dummy content flpSandbox');
        fs.write(join(basePath, 'webapp', 'test', 'flpSandboxMockserver.html'), 'dummy content flpSandboxMockserver');
        await renameDefaultSandboxes(fs, basePath, logger);
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'flpSandbox.html'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'flpSandbox.html')} doesn\'t exist`
        );
        expect(fs.read(join(basePath, 'webapp', 'test', 'flpSandbox_old.html'))).toMatchInlineSnapshot(
            '"dummy content flpSandbox"'
        );
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'flpSandboxMockserver.html'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'flpSandboxMockserver.html')} doesn\'t exist`
        );
        expect(fs.read(join(basePath, 'webapp', 'test', 'flpSandboxMockserver_old.html'))).toMatchInlineSnapshot(
            '"dummy content flpSandboxMockserver"'
        );
        let path = join('test', 'flpSandbox.html');
        expect(infoLogMock).toHaveBeenCalledWith(
            `Renamed ${path} to ${path.slice(
                0,
                -5
            )}_old.html. This file is no longer needed for the preview. In case there have not been done any modifications you can delete this file. In case of modifications please move the respective content to a custom init script of the preview middleware (see migration information https://www.npmjs.com/package/preview-middleware#migration).`
        );
        path = join('test', 'flpSandboxMockserver.html');
        expect(infoLogMock).toHaveBeenCalledWith(
            `Renamed ${path} to ${path.slice(
                0,
                -5
            )}_old.html. This file is no longer needed for the preview. In case there have not been done any modifications you can delete this file. In case of modifications please move the respective content to a custom init script of the preview middleware (see migration information https://www.npmjs.com/package/preview-middleware#migration).`
        );
    });

    test('delete no longer used files', async () => {
        fs.write(join(basePath, 'webapp', 'test', 'locate-reuse-libs.js'), 'dummy content');
        fs.write(join(basePath, 'webapp', 'test', 'initFlpSandbox.js'), 'dummy content');
        await deleteNoLongerUsedFiles(fs, basePath, logger);
        expect(infoLogMock).toHaveBeenCalledWith(
            `Deleted ${join('webapp', 'test', 'locate-reuse-libs.js')}. This file is no longer needed for the preview.`
        );
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'locate-reuse-libs.js'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'locate-reuse-libs.js')} doesn\'t exist`
        );
        expect(infoLogMock).toHaveBeenCalledWith(
            `Deleted ${join('webapp', 'test', 'initFlpSandbox.js')}. This file is no longer needed for the preview.`
        );
        expect(() => fs.read(join(basePath, 'webapp', 'test', 'initFlpSandbox.js'))).toThrowError(
            `${join(basePath, 'webapp', 'test', 'initFlpSandbox.js')} doesn\'t exist`
        );
    });

    test('ensure preview middleware dependency', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            'name': 'test'
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        const variousConfigsPackageJsonPath = join(variousConfigsPath, 'package.json');
        ensurePreviewMiddlewareDependency(packageJson, fs, variousConfigsPackageJsonPath);
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
    });

    test('ensure preview middleware dependency w/o package.json', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');

        const variousConfigsPackageJsonPath = join(variousConfigsPath, 'package.json');
        ensurePreviewMiddlewareDependency(undefined, fs, variousConfigsPackageJsonPath);
        expect(() => fs.read(join(variousConfigsPath, 'package.json'))).toThrowError(
            `${variousConfigsPackageJsonPath} doesn\'t exist`
        );
    });

    test('update preview middleware config w/o path and intent', async () => {
        const previewMiddleware = {
            name: 'fiori-tools-preview',
            afterMiddleware: 'compression',
            configuration: {
                flp: {
                    path: 'test/flp.html'
                }
            }
        } as CustomMiddleware<PreviewConfigOptions>;
        expect(updatePreviewMiddlewareConfig(previewMiddleware, undefined, undefined)).toMatchSnapshot();
    });

    test('update preview middleware config - skip yaml configurations not used in any script', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            'devDependencies': {
                '@sap-ux/preview-middleware': '0.16.83'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        const text = (filename: string) =>
            `UI5 yaml configuration file ${filename} it is not being used in any package.json script. Consider deleting this file.`;

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
        expect(warnLogMock).toHaveBeenCalledWith(text('ui5-deprecated-tools-preview.yaml'));
        expect(fs.read(join(variousConfigsPath, 'ui5-deprecated-tools-preview.yaml'))).toMatchSnapshot();
        expect(warnLogMock).toHaveBeenCalledWith(text('ui5-deprecated-tools-preview-theme.yaml'));
        expect(fs.read(join(variousConfigsPath, 'ui5-deprecated-tools-preview-theme.yaml'))).toMatchSnapshot();
        expect(warnLogMock).toHaveBeenCalledWith(text('ui5-existing-preview-middleware.yaml'));
        expect(warnLogMock).toHaveBeenCalledWith(text('ui5-existing-tools-preview.yaml'));
        expect(warnLogMock).toHaveBeenCalledWith(text('ui5-no-middleware.yaml'));
    });

    test('update preview middleware config - skip invalid yaml configurations', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'invalid':
                    'ui5 serve -o localService/index.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-invalid.yaml'
            },
            'devDependencies': {
                '@sap-ux/preview-middleware': '0.16.83'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
        expect(errorLogMock).toHaveBeenCalledWith(
            'Skipping script invalid with UI5 yaml configuration file ui5-invalid.yaml because it does not comply with the schema.'
        );
    });

    test('update preview middleware config - skip not found yaml configurations', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'not:found':
                    'ui5 serve -o localService/index.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-unavailable.yaml'
            },
            'devDependencies': {
                '@sap-ux/preview-middleware': '0.16.83'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
        expect(errorLogMock).toHaveBeenCalledWith(
            'Skipping script not:found because UI5 yaml configuration file ui5-unavailable.yaml could not be found.'
        );
    });

    test('update preview middleware config - no tooling, no middleware', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'ui:mockserver':
                    'ui5 serve -o /localService/index.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-no-middleware.yaml'
            },
            'devDependencies': {
                '@sap-ux/preview-middleware': '0.16.83'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);
        expect(fs.read(join(variousConfigsPath, 'ui5-no-middleware.yaml'))).toMatchSnapshot();
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
    });

    test('update preview middleware config - deprecated tools preview with theme', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'ui:mockserver':
                    'fiori run --open test/flpSandbox.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-deprecated-tools-preview-theme.yaml',
                'start-variants-management': 'ui5 serve --o chicken.html'
            },
            'devDependencies': {
                '@sap/ux-ui5-tooling': '1.15.1'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);
        expect(fs.read(join(variousConfigsPath, 'ui5-deprecated-tools-preview-theme.yaml'))).toMatchSnapshot();
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
    });

    test('update preview middleware config - deprecated tools preview w/o theme', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'ui:mockserver':
                    'fiori run --open test/flpSandbox.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-deprecated-tools-preview.yaml',
                'start-variants-management': 'ui5 serve --o chicken.html'
            },
            'devDependencies': {
                '@sap/ux-ui5-tooling': '1.15.1'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);
        expect(fs.read(join(variousConfigsPath, 'ui5-deprecated-tools-preview.yaml'))).toMatchSnapshot();
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
    });

    test('update preview middleware config - existing tools preview', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'ui:mockserver':
                    'fiori run -o test/flpSandbox.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-existing-tools-preview.yaml'
            },
            'devDependencies': {
                '@sap/ux-ui5-tooling': '1.15.1'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);
        expect(fs.read(join(variousConfigsPath, 'ui5-existing-tools-preview.yaml'))).toMatchSnapshot();
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
    });

    test('update preview middleware config - existing preview middleware', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'ui:mockserver':
                    'fiori run -o localService/index.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-existing-preview-middleware.yaml'
            },
            'devDependencies': {
                '@sap-ux/preview-middleware': '0.16.102'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);
        expect(fs.read(join(variousConfigsPath, 'ui5-existing-preview-middleware.yaml'))).toMatchSnapshot();
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
    });

    test('update preview middleware config - existing RTA script', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'start-rta':
                    'ui5 run -o preview.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-existing-preview-middleware.yaml',
                'start-local': 'ui5 run -o test/flp.html#Chicken-dance --config ./ui5-existing-preview-middleware.yaml'
            },
            'devDependencies': {
                '@sap/ux-ui5-tooling': '1.15.4'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);
        expect(fs.read(join(variousConfigsPath, 'ui5-existing-preview-middleware.yaml'))).toMatchSnapshot();
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
    });

    test('update preview middleware config - existing add-variants-management script', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'start-variants-management':
                    'fiori run -o /preview.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-deprecated-tools-preview.yaml',
                'start-local': 'fiori run -o test/flp.html#Chicken-dance --config ./ui5-deprecated-tools-preview.yaml'
            },
            'devDependencies': {
                '@sap/ux-ui5-tooling': '1.15.4'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);
        expect(fs.read(join(variousConfigsPath, 'ui5-deprecated-tools-preview.yaml'))).toMatchSnapshot();
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
    });

    test('update preview middleware config - multiple scripts same yaml configuration', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'start': 'fiori run -o test/flp.html#Chicken-dance --config ./ui5-no-middleware.yaml',
                'start-local': 'fiori run -o test/flp.html#Chicken-dance --config ./ui5-no-middleware.yaml',
                'start-mock': 'fiori run -o test/flp.html#Chicken-dance --config ./ui5-no-middleware.yaml'
            },
            'devDependencies': {
                '@sap/ux-ui5-tooling': '1.15.4'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);

        expect(fs.read(join(variousConfigsPath, 'ui5-no-middleware.yaml'))).toMatchSnapshot();
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
    });

    test('update preview middleware config - default ui5.yaml w/o index.html', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'start': 'fiori run --open "test/flpSandbox.html?sap-ui-xx-viewCache=false#v4lropconvert0711-tile"',
                'start-index': 'fiori run --open "index.html?sap-ui-xx-viewCache=false#v4lropconvert0711-tile"'
            },
            'devDependencies': {
                '@sap/ux-ui5-tooling': '1.15.4'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);

        expect(fs.read(join(variousConfigsPath, 'ui5.yaml'))).toMatchSnapshot();
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
    });
});
