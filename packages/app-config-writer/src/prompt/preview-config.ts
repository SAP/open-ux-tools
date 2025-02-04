import { prompt, type PromptObject, type Answers } from 'prompts';

/**
 * Prompt if the conversion should be done in simulation.
 *
 * @returns Indicator if the conversion should be simulated.
 */
export async function simulatePrompt(): Promise<boolean> {
    const PROMPT_NAME = 'simulate';
    const question: PromptObject = {
        type: 'confirm',
        name: PROMPT_NAME,
        initial: true,
        message: `The converter renames the local HTML files, deletes the JavaScript and TypeScript files used for the existing preview functionality, and configures virtual endpoints instead.
Do you want to simulate the conversion?`
    };
    const answer = (await prompt([question])) as Answers<typeof PROMPT_NAME>;
    return (
        answer.simulate ?? (await Promise.reject(new Error('An error has occurred. The conversion has been canceled.')))
    ); //in case of doubt, reject
}

/**
 * Prompt if the conversion should include the test runners.
 *
 * @returns Indicator if the conversion should include test runners.
 */
export async function includeTestRunnersPrompt(): Promise<boolean> {
    const PROMPT_NAME = 'includeTests';
    const question: PromptObject = {
        type: 'confirm',
        name: PROMPT_NAME,
        initial: false,
        message: 'Do you want to convert the test runners?'
    };
    const answer = (await prompt([question])) as Answers<typeof PROMPT_NAME>;
    return (
        answer.includeTests ??
        (await Promise.reject(new Error('An error has occurred. The conversion has been canceled.')))
    ); //in case of doubt, reject
}
