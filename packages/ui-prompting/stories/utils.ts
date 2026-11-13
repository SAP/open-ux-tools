import type { Answers } from '@sap-ux/inquirer-common';

const storageKey = 'storybook-answers';

export function saveValues(answers: Answers) {
    window.localStorage.setItem(storageKey, JSON.stringify(answers, undefined, 4));
}

export function useStorage(): [(answers: Answers) => void] {
    return [saveValues];
}
