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
        message: `The converter will rename the HTML files and delete the JS and TS files used for the existing preview functionality and configure virtual endpoints instead.
Do you want to simulate the conversion first?`
    };
    const answer = (await prompt([question])) as Answers<typeof PROMPT_NAME>;
    return answer.simulate ?? (await Promise.reject()); //in case of doubt, reject
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
        message: 'Do you want to convert Test Runners as well??'
    };
    const answer = (await prompt([question])) as Answers<typeof PROMPT_NAME>;
    return answer.includeTests ?? (await Promise.reject()); //in case of doubt, reject
}
