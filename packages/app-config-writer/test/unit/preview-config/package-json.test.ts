import { create, type Editor } from 'mem-fs-editor';
import { create as createStorage } from 'mem-fs';
import {
    ensurePreviewMiddlewareDependency,
    updateVariantsCreationScript
} from '../../../src/preview-config/package-json';
import { join } from 'path';
import { ToolsLogger } from '@sap-ux/logger';
import * as variantsConfig from '../../../src/variants-config/generateVariantsConfig';

describe('package-json', () => {
    const logger = new ToolsLogger();
    const basePath = join(__dirname, '../../fixtures/preview-config');
    let fs: Editor;

    beforeEach(() => {
        jest.clearAllMocks();
        fs = create(createStorage());
    });

    describe('ensurePreviewMiddlewareDependency', () => {
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
    });

    describe('updateVariantsCreationScript', () => {
        test('update variants creation script - yes', async () => {
            const variousConfigsPath = join(basePath, 'various-configs');
            const packageJson = {
                scripts: {
                    'start-variants-management':
                        'fiori run -o /preview.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-deprecated-tools-preview.yaml'
                }
            };
            fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

            const getAllUi5YamlFileNamesMock = jest
                .spyOn(variantsConfig, 'generateVariantsConfig')
                .mockResolvedValue(fs);

            await updateVariantsCreationScript(fs, variousConfigsPath, logger);

            expect(getAllUi5YamlFileNamesMock).toHaveBeenCalledTimes(1);
        });

        test('update variants creation script - no', async () => {
            const variousConfigsPath = join(basePath, 'various-configs');
            //the following typo in the script name is intended!
            const packageJson = {
                scripts: {
                    'start-varinats-management':
                        'fiori run -o /preview.html?sap-ui-xx-viewCache=false#Chicken-dance --config ./ui5-deprecated-tools-preview.yaml'
                }
            };
            fs.write(join(variousConfigsPath, 'package.json'), JSON.stringify(packageJson));

            const getAllUi5YamlFileNamesMock = jest
                .spyOn(variantsConfig, 'generateVariantsConfig')
                .mockResolvedValue(fs);

            await updateVariantsCreationScript(fs, variousConfigsPath, logger);

            expect(getAllUi5YamlFileNamesMock).not.toHaveBeenCalled();
        });
    });
});
