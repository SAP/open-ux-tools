import { error, type Result, success } from './result';
import { z } from 'zod';

/**
 * Validates the given data against the provided Zod schema.
 *
 * @param data The data to validate.
 * @param schema The Zod schema to validate against.
 * @returns A result object containing the validated data or an error message summarizing the validation issues.
 */
export function validate<T>(data: unknown, schema: z.ZodType<T>): Result<T> {
    const result = schema.safeParse(data);
    if (!result.success) {
        // compact representation of the error, including the error message and the path to the error
        const messages = result.error.issues.map((issue) => {
            const pathString = issue.path.map((key) => `[${JSON.stringify(key)}]`).join('');
            return `Error at ${pathString}: ${issue.message}`;
        });

        return error(messages.join('\n'));
    }
    return success(result.data);
}
