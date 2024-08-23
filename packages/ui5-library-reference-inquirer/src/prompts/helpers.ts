import type { UI5LibraryReferencePromptOptions, UI5LibraryReferenceQuestion, promptNames } from '../types';

/**
 * Will remove prompts from the specified prompts based on prompt options
 * Removing prompts is preferable to using `when()` to prevent continuous re-evaluation.
 *
 * @param prompts Keyed prompts object containing all possible prompts
 * @param promptOptions prompt options
 * @returns the updated questions
 */
export function hidePrompts(
    prompts: Record<promptNames, UI5LibraryReferenceQuestion>,
    promptOptions?: UI5LibraryReferencePromptOptions
): UI5LibraryReferenceQuestion[] {
    const questions: UI5LibraryReferenceQuestion[] = [];
    if (promptOptions) {
        Object.keys(prompts).forEach((key) => {
            const promptKey = key as keyof typeof promptNames;
            if (!promptOptions?.[promptKey]?.hide) {
                questions.push(prompts[promptKey]);
            }
        });
    } else {
        questions.push(...Object.values(prompts));
    }
    return questions;
}
