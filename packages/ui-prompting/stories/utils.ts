import { Answers } from 'inquirer';

const storageKey = 'storybook-answers';

export function saveValues(answers: Answers) {
    window.localStorage.setItem(storageKey, JSON.stringify(answers, undefined, 4));
}
