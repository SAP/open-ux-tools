import type { AssertionValueFunctionContext, AssertionValueFunctionResult } from 'promptfoo';
import { statSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'path';

/**
 * Validates the project structure after app generation to ensure proper file creation.
 *
 * This function checks that:
 * - Exactly one new app folder exists in the project's app directory (excluding 'managetravels')
 * - The new app folder contains required files: package.json, annotations.cds, and webapp folder
 *
 * @param _output - The output from the test
 * @param context - The assertion context containing test variables
 * @param context.vars - Variables from the test context
 * @param context.vars.PROJECT_PATH - Path to the project root directory
 * @returns Promise resolving to assertion result with pass/fail status, score, and reason
 * @returns {AssertionValueFunctionResult} Result object containing:
 *   - pass: boolean indicating if validation passed
 *   - score: number (1 for pass, 0 for fail)
 *   - reason: string explaining the validation result``
 */
export async function validate(
    _output: string,
    context: AssertionValueFunctionContext
): Promise<AssertionValueFunctionResult> {
    const projectPath = context.vars['PROJECT_PATH'];
    if (!projectPath) {
        return {
            pass: false,
            score: 0,
            reason: 'PROJECT_PATH variable is not set in the test context.'
        };
    }
    if (typeof projectPath !== 'string') {
        return {
            pass: false,
            score: 0,
            reason: 'PROJECT_PATH variable is not a string.'
        };
    }
    const appDir = projectPath;
    const apps = readdirSync(appDir).filter((dir) => {
        return statSync(join(appDir, dir)).isDirectory();
    });
    if (apps.length !== 1) {
        return {
            pass: false,
            score: 0,
            reason: `Expected exactly one new app folder, but found ${apps.length}.`
        };
    }
    const newAppFolder = join(appDir, apps[0]);
    const expectedFiles = ['package.json', 'webapp'];
    for (const file of expectedFiles) {
        const filePath = join(newAppFolder, file);
        if (!existsSync(filePath)) {
            return {
                pass: false,
                score: 0,
                reason: `Expected file or folder '${file}' does not exist in the new app folder.`
            };
        }
    }
    return {
        pass: true,
        score: 1,
        reason: _output
    };
}
