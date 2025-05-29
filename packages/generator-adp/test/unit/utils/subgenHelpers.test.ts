import type { AppWizard } from '@sap-devx/yeoman-ui-types';

import type { Manifest } from '@sap-ux/project-access';
import type { AttributesAnswers, ConfigAnswers, SystemLookup } from '@sap-ux/adp-tooling';

import { t } from '../../../src/utils/i18n';
import * as subgenHelpers from '../../../src/utils/subgenHelpers';
import { getExtensionProjectData, resolveNodeModuleGenerator } from '../../../src/app/extension-project';

jest.mock('../../../src/app/extension-project', () => ({
    getExtensionProjectData: jest.fn(),
    resolveNodeModuleGenerator: jest.fn()
}));

const getExtensionProjectDataMock = getExtensionProjectData as jest.Mock;
const resolveNodeModuleGeneratorMock = resolveNodeModuleGenerator as jest.Mock;

describe('Sub-generator helpers', () => {
    const logger = { info: jest.fn(), error: jest.fn() } as any;
    const composeWith = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('addFlpGen', () => {
        it('should compose FLP generator with correct parameters', () => {
            const flpOptions = {
                projectRootPath: '/test/path',
                system: 'SYS',
                manifest: { 'sap.app': {} } as Manifest
            };
            const resolvePath = 'flp-generator';
            jest.spyOn(require, 'resolve').mockReturnValue(resolvePath);

            subgenHelpers.addFlpGen(flpOptions, composeWith, logger);

            expect(composeWith).toHaveBeenCalledWith(
                expect.any(String), // mock require.resolve
                expect.objectContaining({
                    manifest: flpOptions.manifest,
                    system: flpOptions.system,
                    data: { projectRootPath: flpOptions.projectRootPath }
                })
            );
            expect(logger.info).toHaveBeenCalled();
        });
    });

    describe('addDeployGen', () => {
        it('should compose deploy-config generator with merged options', () => {
            const deployOptions = {
                projectName: 'some.app',
                targetFolder: '/project',
                client: '100',
                connectedSystem: 'SYS',
                destinationName: 'DEST'
            };

            subgenHelpers.addDeployGen(deployOptions, composeWith, logger);

            expect(composeWith).toHaveBeenCalledWith(
                '@sap/fiori:deploy-config',
                expect.objectContaining({
                    projectName: 'some.app',
                    projectPath: '/project',
                    appGenClient: '100',
                    connectedSystem: 'SYS',
                    appGenDestination: 'DEST',
                    telemetryData: expect.any(Object)
                })
            );
            expect(logger.info).toHaveBeenCalled();
        });
    });

    describe('addExtProjectGen', () => {
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

            await subgenHelpers.addExtProjectGen(answers, composeWith, logger);

            expect(composeWith).toHaveBeenCalledWith(
                fakePath,
                expect.objectContaining({
                    arguments: [JSON.stringify(fakeData)]
                })
            );
            expect(logger.info).toHaveBeenCalled();
        });

        it('should handle errors and show user notification', async () => {
            const wizard = { showError: jest.fn() } as unknown as AppWizard;
            const error = new Error('fail');
            getExtensionProjectDataMock.mockRejectedValue(error);

            await expect(subgenHelpers.addExtProjectGen({} as any, composeWith, logger, wizard)).rejects.toThrow();

            expect(logger.info).toHaveBeenCalledWith(t('error.creatingExtensionProjectError'));
            expect(logger.error).toHaveBeenCalledWith(error);
        });
    });
});
