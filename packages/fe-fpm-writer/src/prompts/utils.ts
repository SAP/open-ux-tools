import type { Answers } from 'inquirer';

/**
 * Method returns value of answer by given path.
 *
 * @param answers - answers object
 * @param path - question name of path to answer
 * @returns value of answer
 */
export function getAnswer(answers: Answers, path: string): unknown {
    const keys = path.split('.');
    let current = answers;

    for (const key of keys) {
        if (typeof current !== 'object' || !(key in current)) {
            return undefined;
        }
        current = current[key];
    }

    return current;
}
