
import { extendWithOptions } from '@sap-ux/inquirer-common';
import { promptNames, type UI5LibraryReferencePromptOptions } from '../../../src/types';

describe('Prompt helpers', () => {
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
