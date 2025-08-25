import type { AppWizard } from '@sap-devx/yeoman-ui-types';

import { FlexLayer, type AttributesAnswers, type ConfigAnswers, type SystemLookup } from '@sap-ux/adp-tooling';

import { t } from '../../../src/utils/i18n';
import { addFlpGen, addDeployGen, addExtProjectGen } from '../../../src/utils/subgenHelpers';
import { getExtensionProjectData, resolveNodeModuleGenerator } from '../../../src/app/extension-project';
import type { ManifestNamespace } from '@sap-ux/project-access';

jest.mock('../../../src/app/extension-project', () => ({
    getExtensionProjectData: jest.fn(),
    resolveNodeModuleGenerator: jest.fn()
}));

const getExtensionProjectDataMock = getExtensionProjectData as jest.Mock;
const resolveNodeModuleGeneratorMock = resolveNodeModuleGenerator as jest.Mock;

describe('Sub-generator helpers', () => {
    const wizard = {} as unknown as AppWizard;
    const error = new Error('Failed to compose');
    const logger = { info: jest.fn(), error: jest.fn() } as any;

    describe('addFlpGen', () => {
        const composeWith = jest.fn();

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should compose FLP generator with correct parameters', () => {
            const flpOptions = {
                projectRootPath: '/test/path',
                inbounds: {
                    'display-bank': {
                        semanticObject: 'test',
                        action: 'action',
                        title: 'testTitle',
                        subTitle: 'testSubTitle',
                        icon: 'sap-icon://test',
                        signature: {
                            parameters: {
                                param1: {
                                    value: 'test1',
                                    isRequired: true
                                }
                            }
                        }
                    }
                } as unknown as ManifestNamespace.Inbound,
                layer: FlexLayer.CUSTOMER_BASE,
                vscode: {}
            };
            const resolvePath = 'flp-generator';
            jest.spyOn(require, 'resolve').mockReturnValue(resolvePath);

            addFlpGen(flpOptions, composeWith, logger, wizard);

            expect(composeWith).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    inbounds: flpOptions.inbounds,
                    vscode: {},
                    data: { projectRootPath: flpOptions.projectRootPath }
                })
            );
            expect(logger.info).toHaveBeenCalled();
        });

        it('should handle errors and show user notification', async () => {
            composeWith.mockImplementation(() => {
                throw error;
            });

            expect(() => addFlpGen({} as any, composeWith, logger, wizard)).toThrow(
                "Could not call '@sap/fiori:adp-flp-config' sub-generator: Failed to compose"
            );

            expect(logger.error).toHaveBeenCalledWith(error);
        });
    });

    describe('addDeployGen', () => {
        const composeWith = jest.fn();

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should compose deploy-config generator with merged options', () => {
            const deployOptions = {
                projectName: 'some.app',
                projectPath: '/project',
                connectedSystem: 'SYS',
                system: {
                    Name: 'SYS',
                    Client: '100',
                    Url: 'sys-url'
                }
            };

            addDeployGen(deployOptions, composeWith, logger, wizard);

            expect(composeWith).toHaveBeenCalledWith(
                '@sap/fiori:deploy-config',
                expect.objectContaining({
                    projectName: 'some.app',
                    projectPath: '/project',
                    appGenClient: '100',
                    connectedSystem: 'SYS',
                    appGenDestination: 'SYS',
                    appGenServiceHost: 'sys-url',
                    telemetryData: { appType: 'Fiori Adaptation' },
                    subGenPromptOptions: expect.any(Object)
                })
            );
            expect(logger.info).toHaveBeenCalled();
        });

        it('should handle errors and show user notification', async () => {
            composeWith.mockImplementation(() => {
                throw error;
            });

            expect(() => addDeployGen({} as any, composeWith, logger, wizard)).toThrow(
                "Could not call '@sap/fiori:deploy-config' sub-generator: Failed to compose"
            );

            expect(logger.error).toHaveBeenCalledWith(error);
        });
    });

    describe('addExtProjectGen', () => {
        const composeWith = jest.fn();

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should compose extension generator with serialized data', async () => {
            const answers = {
                configAnswers: {} as ConfigAnswers,
                attributeAnswers: {} as AttributesAnswers,
                systemLookup: {} as SystemLookup
            };
            const fakeData = { foo: 'bar' };
            const fakePath = 'ext-generator';

            getExtensionProjectDataMock.mockResolvedValue(fakeData);
            resolveNodeModuleGeneratorMock.mockReturnValue(fakePath);

            await addExtProjectGen(answers, composeWith, logger);

            expect(composeWith).toHaveBeenCalledWith(
                fakePath,
                expect.objectContaining({
                    arguments: [JSON.stringify(fakeData)]
                })
            );
            expect(logger.info).toHaveBeenCalled();
        });

        it('should handle errors and show user notification', async () => {
            getExtensionProjectDataMock.mockRejectedValue(error);

            await expect(addExtProjectGen({} as any, composeWith, logger, wizard)).rejects.toThrow();

            expect(logger.info).toHaveBeenCalledWith(t('error.creatingExtensionProjectError'));
            expect(logger.error).toHaveBeenCalledWith(error);
        });
    });
});
