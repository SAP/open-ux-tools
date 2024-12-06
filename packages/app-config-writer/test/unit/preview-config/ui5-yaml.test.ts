import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import { join } from 'path';
import { ToolsLogger } from '@sap-ux/logger';
import { updatePreviewMiddlewareConfigs, updatePreviewMiddlewareConfig } from '../../../src/preview-config/ui5-yaml';
import type { PreviewConfigOptions } from '../../../src/types';
import type { CustomMiddleware } from '@sap-ux/ui5-config';
import * as projectAccess from '@sap-ux/project-access';

describe('update preview middleware config', () => {
    const logger = new ToolsLogger();
    const warnLogMock = jest.spyOn(ToolsLogger.prototype, 'warn').mockImplementation(() => {});
    const basePath = join(__dirname, '../../fixtures/preview-config');
    let fs: Editor;
    let getAllUi5YamlFileNamesMock: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
        getAllUi5YamlFileNamesMock = jest
            .spyOn(projectAccess, 'getAllUi5YamlFileNames')
            .mockResolvedValue([
                'ui5.yaml',
                'ui5-deprecated-tools-preview.yaml',
                'ui5-deprecated-tools-preview-theme.yaml',
                'ui5-existing-preview-middleware.yaml',
                'ui5-existing-tools-preview.yaml',
                'ui5-no-middleware.yaml',
                'ui5-invalid.yaml'
            ]);
    });

    test('w/o path and intent', async () => {
        const previewMiddleware = {
            name: 'fiori-tools-preview',
            afterMiddleware: 'compression',
            configuration: {
                flp: {
                    path: '/test/flp.html'
                }
            }
        } as CustomMiddleware<PreviewConfigOptions>;
        expect(updatePreviewMiddlewareConfig(previewMiddleware, undefined, undefined)).toMatchSnapshot();
    });

    test('skip yaml configurations not used in any script', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            'devDependencies': {
                '@sap-ux/preview-middleware': '0.16.83'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        const text = (filename: string) =>
            `The UI5 YAML configuration file '${filename}', is not used in any preview script. Outdated preview middleware will be adjusted, if necessary.`;

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();
        expect(warnLogMock).toHaveBeenCalledWith(text('ui5-deprecated-tools-preview.yaml'));
        expect(fs.read(join(variousConfigsPath, 'ui5-deprecated-tools-preview.yaml'))).toMatchSnapshot();
        expect(warnLogMock).toHaveBeenCalledWith(text('ui5-deprecated-tools-preview-theme.yaml'));
        expect(fs.read(join(variousConfigsPath, 'ui5-deprecated-tools-preview-theme.yaml'))).toMatchSnapshot();
        expect(warnLogMock).toHaveBeenCalledWith(text('ui5-existing-preview-middleware.yaml'));
        expect(warnLogMock).toHaveBeenCalledWith(text('ui5-existing-tools-preview.yaml'));
        expect(warnLogMock).toHaveBeenCalledWith(text('ui5-no-middleware.yaml'));
        expect(warnLogMock).toHaveBeenCalledWith(text('ui5.yaml'));
        expect(getAllUi5YamlFileNamesMock).toHaveBeenCalledTimes(1);
    });

    test('skip invalid yaml configurations', async () => {
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
        expect(warnLogMock).toHaveBeenCalledWith(
            `Skipping script 'invalid', which refers to the UI5 YAML configuration file 'ui5-invalid.yaml'. An error occurred when reading 'ui5-invalid.yaml': This file does not comply with the schema.`
        );
    });

    test('skip not found yaml configurations', async () => {
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
        expect(warnLogMock).toHaveBeenCalledWith(
            `Skipping script 'not:found', because the UI5 YAML configuration file, 'ui5-unavailable.yaml', could not be found.`
        );
    });

    test('no tooling, no middleware', async () => {
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

    test('deprecated tools preview with theme', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'ui:mockserver':
                    'fiori run --open "test/flpSandbox.html?sap-ui-xx-viewCache=false#Chicken-dance" --config ./ui5-deprecated-tools-preview-theme.yaml',
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

    test('deprecated tools preview w/o theme', async () => {
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

    test('existing tools preview', async () => {
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

    test('existing preview middleware', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'ui:mockserver':
                    'fiori run -o localService/index.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-existing-preview-middleware.yaml',
                'ui:opa5':
                    'fiori run -o test/integration/opaTests.qunit.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-existing-preview-middleware.yaml',
                'ui:unit':
                    'fiori run -o test/unit/unitTests.qunit.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-existing-preview-middleware.yaml'
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

    test('existing RTA script', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'start-rta':
                    'ui5 run -o preview.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-existing-preview-middleware.yaml',
                'start-local': 'ui5 run -o /test/flp.html#Chicken-dance --config ./ui5-existing-preview-middleware.yaml'
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

    test('existing start-variants-management and start-control-property-editor script', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'start-variants-management':
                    'fiori run -o /preview.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-deprecated-tools-preview.yaml',
                'start-control-property-editor':
                    'fiori run -o /editor.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-deprecated-tools-preview.yaml',
                'start-local': 'fiori run -o /test/flp.html#Chicken-dance --config ./ui5-deprecated-tools-preview.yaml'
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

    test('multiple scripts same yaml configuration', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'start': 'fiori run -o /test/flp.html#Chicken-dance --config ./ui5-no-middleware.yaml',
                'start-local': 'fiori run -o /test/flp.html#Chicken-dance --config ./ui5-no-middleware.yaml',
                'start-mock': 'fiori run -o /test/flp.html#Chicken-dance --config ./ui5-no-middleware.yaml'
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

    test('default ui5.yaml w/o index.html', async () => {
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

    test('same yaml config same endpoints', async () => {
        fs.write(join(basePath, 'various-configs', 'webapp', 'test', 'flpSandbox.html'), 'dummy content flpSandbox');
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'start1': 'fiori run --open "test/flpSandbox.html?sap-ui-xx-viewCache=false#v4lropconvert0711-tile"',
                'start2': 'fiori run --open "test/flpSandbox.html?sap-ui-xx-viewCache=false#v4lropconvert0711-tile"'
            },
            'devDependencies': {
                '@sap/ux-ui5-tooling': '1.15.4'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);
        expect(warnLogMock).toHaveBeenCalledTimes(5);
    });

    test('same yaml config different endpoints', async () => {
        const variousConfigsPath = join(basePath, 'various-configs');
        const packageJson = {
            scripts: {
                'start1': 'fiori run --open "test/flpSandbox.html?sap-ui-xx-viewCache=false#v4lropconvert0711-tile"',
                'start2':
                    'fiori run --open "test/flpSandboxMockserver.html?sap-ui-xx-viewCache=false#v4lropconvert0711-tile"'
            },
            'devDependencies': {
                '@sap/ux-ui5-tooling': '1.15.4'
            }
        };
        fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

        await updatePreviewMiddlewareConfigs(fs, variousConfigsPath, logger);

        expect(fs.read(join(variousConfigsPath, 'ui5.yaml'))).toMatchSnapshot();
        expect(fs.read(join(variousConfigsPath, 'package.json'))).toMatchSnapshot();

        expect(warnLogMock).toHaveBeenCalledWith(
            `Skipping script'start2', because another script also refers to UI5 YAML configuration file, 'ui5.yaml'. Adjust the 'flp.path' property in the UI5 YAML configuration file to the correct endpoint or create a separate UI5 YAML configuration file for script 'start2'. ui5.yaml currently uses test/flpSandbox.html whereas script 'start2' uses 'test/flpSandboxMockserver.html'.`
        );
    });
});
