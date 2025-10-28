import type { CapService } from '@sap-ux/cap-config-writer';
import { hostEnvironment } from '@sap-ux/fiori-generator-shared';
import { getCapCustomPaths } from '@sap-ux/project-access';
import type { CapCustomPaths, CdsVersionInfo } from '@sap-ux/project-access';
import type { PathLike } from 'node:fs';
import * as fsPromises from 'fs/promises';
import type { ListQuestion } from 'inquirer';
import os from 'node:os';
import { initI18nOdataServiceInquirer, t } from '../../../../src/i18n';
import {
    enterCapPathChoiceValue,
    getCapServiceChoices as getCapServiceChoicesMock
} from '../../../../src/prompts/datasources/cap-project/cap-helpers';
import { getLocalCapProjectPrompts } from '../../../../src/prompts/datasources/cap-project/questions';
import { capInternalPromptNames, type CapProjectChoice } from '../../../../src/prompts/datasources/cap-project/types';
import * as capValidators from '../../../../src/prompts/datasources/cap-project/validators';
import { errorHandler } from '../../../../src/prompts/prompt-helpers';
import { promptNames, type CapServiceChoice } from '../../../../src/types';
import { PromptState, getPromptHostEnvironment } from '../../../../src/utils';

jest.mock('fs/promises', () => ({
    __esModule: true, // Workaround for spyOn TypeError: Jest cannot redefine property
    ...jest.requireActual('fs/promises')
}));

jest.mock('../../../../src/utils', () => ({
    ...jest.requireActual('../../../../src/utils'),
    getPromptHostEnvironment: jest.fn()
}));

const mockCapCustomPaths: CapCustomPaths = {
    app: 'app',
    srv: 'src',
    db: 'db'
};

jest.mock('@sap-ux/project-access', () => ({
    ...jest.requireActual('@sap-ux/project-access'),
    getCapCustomPaths: jest.fn().mockImplementation(async () => mockCapCustomPaths)
}));

const mockCdsVersionInfo: CdsVersionInfo = {
    version: '7.0.0',
    home: '/path/to/cds/home',
    root: '/path/to/cds/root'
};

const initialMockCapServicesChoices: CapServiceChoice[] = [
    {
        name: 'AdminService',
        value: {
            serviceName: 'AdminService',
            urlPath: '/admin/',
            serviceCdsPath: '../bookshop/srv/admin-service',
            projectPath: '/cap/path/to/project1',
            cdsVersionInfo: mockCdsVersionInfo
        }
    },
    {
        name: 'CatalogService',
        value: {
            serviceName: 'CatalogService',
            urlPath: '/browse/',
            serviceCdsPath: '../bookshop/srv/cat-service',
            projectPath: '/cap/path/to/project1',
            cdsVersionInfo: mockCdsVersionInfo
        }
    }
];

let mockCapServiceChoices: CapServiceChoice[] = initialMockCapServicesChoices;
let mockCapProjectChoices: CapProjectChoice[] = [];
let mockCapWorkspaceFolders: CapProjectChoice[] = [];

const initialMockEdmx = '<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="2"/>';
let mockEdmx: string | undefined = initialMockEdmx;

jest.mock('../../../../src/prompts/datasources/cap-project/cap-helpers', () => ({
    ...jest.requireActual('../../../../src/prompts/datasources/cap-project/cap-helpers'),
    getCapServiceChoices: jest.fn().mockImplementation(async () => mockCapServiceChoices),
    getCapEdmx: jest.fn().mockImplementation(async () => mockEdmx),
    getCapProjectPaths: jest.fn().mockImplementation(() => mockCapWorkspaceFolders),
    getCapProjectChoices: jest.fn().mockImplementation(async () => mockCapProjectChoices)
}));

describe('getLocalCapProjectPrompts', () => {
    beforeAll(async () => {
        (getPromptHostEnvironment as jest.Mock).mockReturnValue(hostEnvironment.cli);
        // Wait for i18n to bootstrap so we can test localised strings
        await initI18nOdataServiceInquirer();
    });

    beforeEach(() => {
        // Ensure each test is isolated, reset mocked function return values to initial state
        mockCapServiceChoices = initialMockCapServicesChoices;
        mockCapProjectChoices = [];
        mockCapWorkspaceFolders = [];
        mockEdmx = initialMockEdmx;
        jest.restoreAllMocks();
    });

    test('getLocalCapProjectPrompts, returns expected prompts', async () => {
        const capPrompts = await getLocalCapProjectPrompts();
        // Verify static values
        expect(capPrompts).toMatchSnapshot();
    });

    test('prompt: capProject', async () => {
        let capPrompts = await getLocalCapProjectPrompts();
        let capProjectPrompt = capPrompts.find((prompt) => prompt.name === promptNames.capProject);
        if (!capProjectPrompt) {
            fail('`capProjectPrompt` is not defined');
        }
        // Dont show the project selection prompt if only one entry ('Enter path manually') since we will prompt for the path by default
        expect(await (capProjectPrompt.when as Function)()).toEqual(false);

        mockCapProjectChoices = [
            {
                name: 'project1',
                value: {
                    folderName: 'project1',
                    path: '/abs/path/to/cap/project1',
                    app: 'app',
                    db: 'db',
                    srv: 'srv'
                }
            },
            {
                name: t('prompts.capProject.enterCapPathChoiceName'),
                value: 'enterCapPath'
            }
        ];
        // Show the project selection prompt when more than 1 choice
        expect(await (capProjectPrompt.when as Function)()).toEqual(true);
        expect(((capProjectPrompt as ListQuestion).choices as Function)().length).toEqual(2);
        expect(((capProjectPrompt as ListQuestion).choices as Function)()).toEqual(mockCapProjectChoices);

        // find the default cap project choice, 2 choices (one project), always pre-select (0) to avoid selection message
        expect((capProjectPrompt.default as Function)()).toEqual(0);
        mockCapProjectChoices.unshift({
            name: 'project2',
            value: {
                folderName: 'project2',
                path: '/abs/path/to/cap/project2',
                app: 'app',
                db: 'db',
                srv: 'srv'
            }
        });
        expect((capProjectPrompt.default as Function)()).toEqual(-1);

        capPrompts = await getLocalCapProjectPrompts({
            capProject: {
                capSearchPaths: [],
                defaultChoice: '/abs/path/to/cap/project1'
            }
        });
        capProjectPrompt = capPrompts.find((prompt) => prompt.name === promptNames.capProject);
        // It is expect that the `when` condition must first execute to preload the cap choices
        expect(await (capProjectPrompt!.when as Function)()).toEqual(true);
        expect(((capProjectPrompt as ListQuestion).choices as Function)().length).toEqual(3);
        expect(((capProjectPrompt as ListQuestion).choices as Function)()).toEqual(mockCapProjectChoices);
        expect((capProjectPrompt!.default as Function)()).toEqual(1);
    });

    test('prompt: capProjectPath', async () => {
        let realpathSpy: jest.SpyInstance | undefined;
        if (os.platform() === 'win32') {
            realpathSpy = jest
                .spyOn(fsPromises, 'realpath')
                .mockImplementation(
                    async (path: PathLike) => (path as string)[0].toUpperCase() + (path as string).slice(1)
                );
        }
        let capPrompts = await getLocalCapProjectPrompts();
        let capProjectPathPrompt = capPrompts.find((prompt) => prompt.name === capInternalPromptNames.capProjectPath);

        // No previous answers, no cap project choices (from prompt `capProject`)
        expect(await (capProjectPathPrompt!.when as Function)()).toEqual(false);
        // Previous answer to enter manual path
        expect(
            await (capProjectPathPrompt!.when as Function)({ [promptNames.capProject]: enterCapPathChoiceValue })
        ).toEqual(true);
        // No previous choices, so only option is to enter manual path
        mockCapProjectChoices = [
            {
                name: t('prompts.capProject.enterCapPathChoiceName'),
                value: 'enterCapPath'
            }
        ];
        const capProjectPrompt = capPrompts.find((prompt) => prompt.name === promptNames.capProject);
        await (capProjectPrompt!.when as Function)();
        expect(await (capProjectPathPrompt!.when as Function)()).toEqual(true);

        capPrompts = await getLocalCapProjectPrompts({
            capProject: {
                capSearchPaths: [],
                defaultChoice: '/abs/path/to/cap/project1'
            }
        });
        capProjectPathPrompt = capPrompts.find((prompt) => prompt.name === capInternalPromptNames.capProjectPath);
        expect(await (capProjectPathPrompt!.default as Function)()).toEqual('/abs/path/to/cap/project1');

        // Validate
        expect(await (capProjectPathPrompt!.validate as Function)()).toEqual(false);
        const validateCapPathSpy = jest.spyOn(capValidators, 'validateCapPath').mockResolvedValue(true);
        expect(await (capProjectPathPrompt!.validate as Function)('/any/valid/cap/path')).toEqual(true);
        expect(validateCapPathSpy).toHaveBeenCalledWith('/any/valid/cap/path');
        validateCapPathSpy.mockClear();

        jest.spyOn(capValidators, 'validateCapPath').mockResolvedValue('not valid');
        expect(await (capProjectPathPrompt!.validate as Function)('/not/valid/cap/path')).toEqual('not valid');

        realpathSpy?.mockClear();
        // Test use of `realpath` to align drive letter casing with cds compiler facade
        if (os.platform() === 'win32') {
            validateCapPathSpy.mockResolvedValue(true);
            await (capProjectPathPrompt!.validate as Function)('c:\\any\\windows\\path');
            expect(validateCapPathSpy).toHaveBeenCalledWith('c:\\any\\windows\\path');
            expect(realpathSpy).toHaveBeenCalledWith('c:\\any\\windows\\path');
            // Check that the custom paths are set correctly using the result of a call to `realpath`
            expect(getCapCustomPaths).toHaveBeenCalledWith('C:\\any\\windows\\path');
        } else {
            // Validate should not call `realpath` on non-Windows platforms
            // Validate internal functions are already tested above
            validateCapPathSpy.mockResolvedValue(true);
            realpathSpy = jest.spyOn(fsPromises, 'realpath');
            await (capProjectPathPrompt!.validate as Function)('/any/cap/path');
            expect(realpathSpy).not.toHaveBeenCalled();
        }
    });

    test('prompt: capService', async () => {
        let capPrompts = await getLocalCapProjectPrompts();
        let capServicePrompt = capPrompts.find((prompt) => prompt.name === promptNames.capService);
        (getCapServiceChoicesMock as jest.Mock).mockClear();
        const capProject = {
            path: '/cap/path/to/project1',
            folderName: 'project1',
            app: 'app',
            srv: 'srv',
            db: 'db'
        } as CapProjectChoice['value'];

        expect(await (capServicePrompt!.when as Function)()).toEqual(false);
        // Previously set cap project (via prompt options in this case)
        expect(
            await (capServicePrompt!.when as Function)({
                capProject
            })
        ).toEqual(true);
        expect(getCapServiceChoicesMock as jest.Mock).toHaveBeenCalledWith(capProject);
        expect(((capServicePrompt as ListQuestion).choices as Function)()).toEqual(initialMockCapServicesChoices);
        expect((capServicePrompt!.default as Function)()).toEqual(0);

        // Default selection when default service provided should be the default service choice entry
        capPrompts = await getLocalCapProjectPrompts({
            capService: {
                defaultChoice: {
                    serviceName: 'CatalogService',
                    projectPath: '/cap/path/to/project1'
                }
            }
        });
        capServicePrompt = capPrompts.find((prompt) => prompt.name === promptNames.capService);
        await (capServicePrompt!.when as Function)({ capProject });
        ((capServicePrompt as ListQuestion).choices as Function)();
        expect((capServicePrompt!.default as Function)()).toEqual(1);

        // validate (only run in YUI)
        expect(await (capServicePrompt!.validate as Function)()).toBe(false);
        // previous errors (from earlier cap prompts) are reported
        errorHandler.logErrorMsgs('Something unexpected happened!');
        expect(await (capServicePrompt!.validate as Function)()).toBe('Something unexpected happened!');
        // PromptStateHelper has the correct values after successful Cap service selection
        const capService: CapService = {
            projectPath: '/some/cap/project',
            serviceName: 'capService1',
            appPath: 'app',
            capType: 'Node.js',
            serviceCdsPath: '../relative/services/path',
            urlPath: 'odatav4/service/path',
            cdsVersionInfo: mockCdsVersionInfo
        };
        expect(await (capServicePrompt!.validate as Function)(capService)).toBe(true);
        expect(PromptState.odataService).toMatchInlineSnapshot(`
            {
              "metadata": "<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="2"/>",
              "odataVersion": "4",
              "servicePath": "odatav4/service/path",
            }
        `);

        // Invalid Cap edmx returned by `getCapEdmx` is handled
        mockEdmx = undefined;
        expect(await (capServicePrompt!.validate as Function)(capService)).toEqual(
            t('prompts.validationMessages.metadataInvalid')
        );
    });

    test('hidden prompt to set state on CLI - since list validators dont run there', async () => {
        const capPrompts = await getLocalCapProjectPrompts();
        const capCliStateSetterPrompt = capPrompts.find(
            (prompt) => prompt.name === capInternalPromptNames.capCliStateSetter
        );
        expect(await (capCliStateSetterPrompt!.when as Function)()).toEqual(false);
        expect(PromptState.odataService).toEqual({});

        const capService: CapService = {
            projectPath: '/some/cap/project',
            serviceName: 'capService1',
            appPath: 'app',
            capType: 'Node.js',
            serviceCdsPath: '../relative/services/path',
            urlPath: 'odatav4/service/path',
            cdsVersionInfo: mockCdsVersionInfo
        };
        expect(await (capCliStateSetterPrompt!.when as Function)({ capService })).toEqual(false);
        expect(PromptState.odataService).toMatchInlineSnapshot(`
            {
              "metadata": "<?xml version="1.0" encoding="utf-8"?><edmx:Edmx Version="2"/>",
              "odataVersion": "4",
              "servicePath": "odatav4/service/path",
            }
        `);
    });
});
