import * as projectAccess from '@sap-ux/project-access';
import { getQuestions } from '../../../src/prompts';
import * as utility from '../../../src/prompts/utility';
import { promptNames } from '../../../src/types';
import { initI18nUi5AppInquirer } from '../../../src/i18n';

jest.mock('@sap-ux/project-input-validator', () => {
    return {
        __esModule: true,
        ...jest.requireActual('@sap-ux/project-input-validator')
    };
});

describe('getPrompts', () => {
    const mockCdsInfo = {
        isWorkspaceEnabled: false,
        hasMinCdsVersion: true,
        isCdsUi5PluginEnabled: false,
        hasCdsUi5Plugin: false
    };
    beforeAll(async () => {
        // Wait for i18n to bootstrap
        await initI18nUi5AppInquirer();
    });
    test('getQuestions, no options', () => {
        expect(getQuestions([])).toMatchInlineSnapshot(`
            [
              {
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": true,
                  "hint": "The name of the module for this application that will be loaded at runtime. This also determines the directory name of the generated application.",
                  "mandatory": true,
                },
                "message": "Module name",
                "name": "name",
                "type": "input",
                "validate": [Function],
              },
              {
                "default": [Function],
                "guiOptions": {
                  "breadcrumb": true,
                  "hint": "The title of your application that is displayed in the header of the application.",
                },
                "message": "Application title",
                "name": "title",
                "type": "input",
              },
              {
                "default": [Function],
                "guiOptions": {
                  "breadcrumb": true,
                  "hint": "A unique package name for the application module being created. It should follow the standard Java package notation.",
                },
                "message": "Application namespace",
                "name": "namespace",
                "type": "input",
                "validate": [Function],
              },
              {
                "default": [Function],
                "guiOptions": {
                  "breadcrumb": true,
                  "hint": "Project description in package.json of your project",
                },
                "message": "Description",
                "name": "description",
                "type": "input",
              },
              {
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": "Project Path",
                  "mandatory": true,
                },
                "guiType": "folder-browser",
                "message": "Project folder path",
                "name": "targetFolder",
                "type": "input",
                "validate": [Function],
              },
              {
                "choices": [Function],
                "default": [Function],
                "guiOptions": {
                  "breadcrumb": "UI5 Version",
                  "hint": "Represents the minimum version of SAPUI5 that this application requires.",
                },
                "message": "Minimum SAPUI5 version",
                "name": "ui5Version",
                "source": [Function],
                "type": "list",
                "when": [Function],
              },
              {
                "default": [Function],
                "guiOptions": {
                  "breadcrumb": "Deploy Config",
                },
                "message": [Function],
                "name": "addDeployConfig",
                "type": "confirm",
                "validate": [Function],
                "when": [Function],
              },
              {
                "default": false,
                "guiOptions": {
                  "breadcrumb": "FLP Config",
                },
                "message": [Function],
                "name": "addFlpConfig",
                "type": "confirm",
                "validate": [Function],
              },
              {
                "default": false,
                "guiOptions": {
                  "hint": "Choosing 'No' will apply defaults",
                },
                "message": "Configure advanced options",
                "name": "showAdvanced",
                "type": "confirm",
              },
              {
                "choices": [Function],
                "default": [Function],
                "guiOptions": {
                  "applyDefaultWhenDirty": true,
                  "breadcrumb": true,
                },
                "message": "UI5 theme",
                "name": "ui5Theme",
                "type": "list",
              },
              {
                "default": false,
                "guiOptions": {
                  "breadcrumb": "Eslint",
                },
                "message": "Add Eslint configuration to the project",
                "name": "enableEslint",
                "type": "confirm",
              },
              {
                "default": false,
                "guiOptions": {
                  "breadcrumb": "Code Assist",
                },
                "message": "Add code assist libraries to your project",
                "name": "enableCodeAssist",
                "type": "confirm",
                "when": [Function],
              },
              {
                "default": false,
                "guiOptions": {
                  "breadcrumb": "Skip Annotations",
                },
                "message": "Skip generation of associated annotations.cds file",
                "name": "skipAnnotations",
                "type": "confirm",
              },
              {
                "default": false,
                "guiOptions": {
                  "breadcrumb": "Enable NPM Workspaces",
                },
                "message": "Generation of this application can update the CAP project to use NPM workspaces and an associated CDS plugin library (cds-plugin-ui5). Do you want to enable this feature? (Note: this is requirement for generating with TypeScript)",
                "name": "enableNPMWorkspaces",
                "type": "confirm",
                "when": [Function],
              },
              {
                "default": false,
                "guiOptions": {
                  "breadcrumb": true,
                },
                "message": "Enable TypeScript",
                "name": "enableTypeScript",
                "type": "confirm",
                "when": [Function],
              },
            ]
        `);
    });

    test('getQuestions, parameter `isCap` specified', () => {
        // Prompt: `targetFolder` should not returned for CAP projects
        expect(getQuestions([], undefined, undefined, mockCdsInfo)).not.toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.targetFolder })])
        );

        // Prompt: `targetFolder` should only be returned for non-CAP projects
        expect(getQuestions([])).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.targetFolder })])
        );
    });

    test('getQuestions, prompt: `name`, conditional validator', () => {
        jest.spyOn(utility, 'pathExists').mockReturnValue(true);
        // Test default when `isCLi` === true
        let questions = getQuestions([], {
            [promptNames.targetFolder]: {
                default: '/cap/specific/target/path'
            }
        });
        expect(
            (questions.find((question) => question.name === promptNames.name)?.validate as Function)('project1', {})
        ).toMatchInlineSnapshot(`"A module with this name already exists in the folder: /cap/specific/target/path"`);

        // Test default when CAP project info provided
        questions = getQuestions(
            [],
            {
                [promptNames.targetFolder]: {
                    default: '/cap/specific/target/path1'
                }
            },
            false,
            mockCdsInfo
        );
        expect(
            (questions.find((question) => question.name === promptNames.name)?.validate as Function)('project1', {})
        ).toMatchInlineSnapshot(`"A module with this name already exists in the folder: /cap/specific/target/path1"`);

        // Non-Cli usage (YUI)
        questions = getQuestions(
            [],
            {
                [promptNames.targetFolder]: {
                    default: '/cap/specific/target/path1'
                }
            },
            false
        );
        expect(
            (questions.find((question) => question.name === promptNames.name)?.validate as Function)('project1', {})
        ).toMatchInlineSnapshot(`true`);

        expect(
            (questions.find((question) => question.name === promptNames.name)?.default as Function)({})
        ).toMatchInlineSnapshot(`"project1"`);
    });

    test('getQuestions, prompt: `addDeployConfig` conditions and message based on mta.yaml discovery', async () => {
        const mockMtaPath = undefined;
        const getMtaPathSpy = jest.spyOn(projectAccess, 'getMtaPath').mockResolvedValue(mockMtaPath);

        // 'addDeployConfig' is always returned based on static inputs, it is the 'when' condition that determines its presence
        let questions = getQuestions([], undefined, undefined, mockCdsInfo);
        expect(questions).toEqual(
            expect.arrayContaining([expect.objectContaining({ name: promptNames.addDeployConfig })])
        );
        // Mta path is calculated by the when condition which is executed before the message function
        expect(
            await (questions.find((question) => question.name === promptNames.addDeployConfig)?.when as Function)()
        ).toMatchInlineSnapshot(`false`);
        expect(
            (questions.find((question) => question.name === promptNames.addDeployConfig)?.message as Function)()
        ).toMatchInlineSnapshot(`"Add deployment configuration"`);

        getMtaPathSpy.mockResolvedValue({ mtaPath: 'any/path', hasRoot: false });
        questions = getQuestions([], undefined, undefined, mockCdsInfo);
        expect(
            await (questions.find((question) => question.name === promptNames.addDeployConfig)?.when as Function)()
        ).toMatchInlineSnapshot(`true`);
        expect(
            (questions.find((question) => question.name === promptNames.addDeployConfig)?.message as Function)()
        ).toMatchInlineSnapshot(`"Add deployment configuration to MTA project (any/path)"`);

        getMtaPathSpy.mockRestore();
    });
});
