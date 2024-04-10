import { join } from 'path';
import {
    checkDependencies,
    extendWithOptions,
    getLibraryChoices,
    getProjectChoices
} from '../../../src/prompts/helpers';
import * as manifestJson from '../samples/libs/se.mi.plm.attachmentservice/src/sap/se/mi/plm/lib/attachmentservice/manifest.json';
import type { Manifest } from '@sap-ux/project-access';
import { promptNames, type ReuseLib, type UI5LibraryReferencePromptOptions } from '../../../src/types';
import * as dependencyUtils from '@sap-ux/project-access/dist/project/dependencies';

describe('Prompt helpers', () => {
    test('should return library choices', async () => {
        const libChoices = await getLibraryChoices([
            {
                projectRoot: join(__dirname, '../samples/libs/se.mi.plm.attachmentservice'),
                manifestPath: join(
                    __dirname,
                    '../samples/libs/se.mi.plm.attachmentservice/src/sap/se/mi/plm/lib/attachmentservice/manifest.json'
                ),
                manifest: manifestJson as Manifest,
                libraryPath: join(
                    __dirname,
                    '../samples/libs/se.mi.plm.attachmentservice/src/sap/se/mi/plm/lib/attachmentservice/.library'
                )
            }
        ]);
        expect(libChoices).toHaveLength(4);
    });

    test('should return project choices', async () => {
        const appResults = [
            {
                appRoot: join(__dirname, '../samples/project1'),
                projectRoot: join(__dirname, '../samples/project1'),
                manifestPath: join(__dirname, '../samples/project1/webapp/manifest.json'),
                manifest: {} as Manifest
            }
        ];

        const projectChoices = await getProjectChoices(appResults);

        expect(projectChoices).toHaveLength(1);
    });

    test('should return empty array of project choices', async () => {
        jest.spyOn(dependencyUtils, 'hasDependency').mockImplementationOnce(() => {
            throw new Error('Error reading package.json file.');
        });
        const appResults = [
            {
                appRoot: join(__dirname, '../samples/project1'),
                projectRoot: join(__dirname, '../samples/project1'),
                manifestPath: join(__dirname, '../samples/project1/webapp/manifest.json'),
                manifest: {} as Manifest
            }
        ];

        const projectChoices = await getProjectChoices(appResults);

        expect(projectChoices).toHaveLength(0);
    });

    test('should return project choices', async () => {
        const appResults = [
            {
                appRoot: join(__dirname, '../samples/project1'),
                projectRoot: join(__dirname, '../samples/project1'),
                manifestPath: join(__dirname, '../samples/project1/webapp/manifest.json'),
                manifest: {} as Manifest
            }
        ];

        const projectChoices = await getProjectChoices(appResults);

        expect(projectChoices).toHaveLength(1);
    });

    test('should return missing dependencies', async () => {
        const reuseLibAnswers = [
            {
                name: 'lib1',
                dependencies: ['dep1', 'dep2', 'dep3']
            }
        ] as ReuseLib[];
        const allReuseLibs = [
            {
                name: 'dep1'
            },
            {
                name: 'dep3'
            }
        ] as ReuseLib[];
        const missingDeps = checkDependencies(reuseLibAnswers, allReuseLibs);
        expect(missingDeps).toEqual('dep2');
    });

    test('extendWithOptions, `validate` prompt option specified', () => {
        const questionA = {
            type: 'input',
            name: promptNames.source,
            message: 'Message',
            default: false
        };

        let promptOptions = {
            [promptNames.source]: {
                validate: (val: string) => (!val ? 'bad input' : true)
            }
        } as UI5LibraryReferencePromptOptions;

        let extQuestions = extendWithOptions([questionA], promptOptions);
        const sourceQuestion = extQuestions.find((question) => question.name === promptNames.source);

        // No validate in original question, should apply extension
        const sourceQuestionValidate = sourceQuestion?.validate as Function;
        expect(sourceQuestionValidate(undefined)).toEqual('bad input');
        expect(sourceQuestionValidate('good')).toEqual(true);

        // Test that original validator is still applied
        const questionB = {
            type: 'input',
            name: promptNames.targetProjectFolder,
            message: 'Message',
            default: false,
            validate: (val: string) => (val === 'bad input B' ? `Input: "${val}" is invalid` : true)
        };

        promptOptions = {
            [promptNames.targetProjectFolder]: {
                validate: (val: string) => (!val ? 'bad input' : true)
            }
        } as UI5LibraryReferencePromptOptions;

        extQuestions = extendWithOptions([questionB], promptOptions);
        const targetProjectFolderQuestion = extQuestions.find(
            (question) => question.name === promptNames.targetProjectFolder
        );

        // Both original and extended validation is applied
        const targetProjectFolderQuestionValidate = targetProjectFolderQuestion?.validate as Function;
        expect(targetProjectFolderQuestionValidate(undefined)).toEqual('bad input');
        expect(targetProjectFolderQuestionValidate('bad input B')).toEqual('Input: "bad input B" is invalid');
        expect(targetProjectFolderQuestionValidate('good')).toEqual(true);
    });
});
