import React from 'react';
import { Questions } from '../src/components';
import type { PromptQuestion, PromptsGroup } from '../src';
import { PromptsLayoutType } from '../src';
import { initIcons } from '@sap-ux/ui-components';
import { useStorage } from './utils';

export default { title: 'Misc/Examples' };

initIcons();

const choices = ['test1', 'test2'];

const groupIds = {
    group1: 'group1',
    group2: 'group2'
};
const questions: PromptQuestion[] = [
    {
        message: 'First',
        name: 'first.test1',
        type: 'input',
        guiOptions: {
            groupId: groupIds.group1
        }
    },
    {
        message: 'Second',
        name: 'first.test2',
        type: 'list',
        choices,
        guiOptions: {
            groupId: groupIds.group1
        }
    },
    {
        message: 'Third',
        name: 'first.test3',
        type: 'checkbox',
        choices,
        guiOptions: {
            groupId: groupIds.group1
        }
    },
    {
        message: 'First',
        name: 'second.test1',
        type: 'input',
        guiOptions: {
            groupId: groupIds.group2
        }
    },
    {
        message: 'Second',
        name: 'second.test2',
        type: 'list',
        choices,
        guiOptions: {
            groupId: groupIds.group2
        }
    },
    {
        message: 'Third',
        name: 'second.test3',
        type: 'checkbox',
        choices,
        guiOptions: {
            groupId: groupIds.group2
        }
    }
];

const groupsData: PromptsGroup[] = [
    {
        id: 'group1',
        title: 'First group',
        description: ['Group `one` description 1', 'Group `one` description 2']
    },
    {
        id: 'group2',
        title: 'Second group',
        description: ['Group `two` description 1', 'Group `two` description 2']
    }
];

export const groups = (): JSX.Element => {
    const [saveValues] = useStorage();
    return (
        <Questions
            questions={questions}
            layoutType={PromptsLayoutType.MultiColumn}
            showDescriptions={true}
            groups={groupsData}
            onChange={(newAnswers) => {
                saveValues(newAnswers);
            }}
        />
    );
};
