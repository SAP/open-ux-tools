import type { PromptQuestion } from '../../src';

export const questions: { [key: string]: PromptQuestion } = {
    input: {
        type: 'input',
        name: 'testInput',
        guiOptions: {
            mandatory: undefined,
            placeholder: undefined,
            groupId: 'group0'
        },
        default: undefined
    },
    staticList: {
        type: 'list',
        name: 'testStaticList',
        choices: [],
        message: 'testStaticListLabel',
        guiOptions: {
            mandatory: undefined,
            placeholder: undefined,
            groupId: 'group0',
            dependantPromptNames: [],
            selectType: 'static'
        },
        default: undefined
    },
    dynamicList: {
        type: 'list',
        name: 'testDynamicList',
        choices: [],
        message: 'testDynamicListLabel',
        guiOptions: {
            mandatory: undefined,
            placeholder: undefined,
            groupId: 'group1',
            selectType: 'dynamic',
            dependantPromptNames: []
        },
        default: undefined
    },
    checkbox: {
        type: 'checkbox',
        name: 'testCheckbox',
        choices: [],
        message: 'testCheckboxLabel',
        guiOptions: {
            mandatory: undefined,
            placeholder: undefined,
            groupId: 'group1'
        },
        default: undefined
    }
};
