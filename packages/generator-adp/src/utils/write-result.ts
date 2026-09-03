import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Absolute path of the file the SAP Business Application Studio orchestrator polls for
 * headless generation results. Each result is stored under the correlation `id` supplied
 * in the generator JSON input.
 */
export const RESULT_FILE_PATH = '/home/user/tmpProjectTemplate.json';

/**
 * Writes the outcome of a headless generation run to the orchestrator result file, keyed by
 * the correlation `id` from the JSON input. Existing entries are preserved; a missing or
 * malformed result file is treated as empty. The result file is a best-effort side channel:
 * a write failure is swallowed so it never masks the actual generation outcome.
 *
 * @param {string} id - The correlation key supplied by the orchestrator in the JSON input.
 * @param {string} result - The generated project path on success, or `Failure: <message>` on error.
 */
export function writeResult(id: string, result: string): void {
    let fileContent: Record<string, string> = {};

    if (existsSync(RESULT_FILE_PATH)) {
        try {
            const parsed: unknown = JSON.parse(readFileSync(RESULT_FILE_PATH, 'utf-8'));
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                // Safe after the runtime object check; the file only ever holds a flat id -> result map.
                fileContent = parsed as Record<string, string>;
            }
        } catch {
            fileContent = {};
        }
    }

    fileContent[id] = result;
    try {
        writeFileSync(RESULT_FILE_PATH, JSON.stringify(fileContent));
    } catch {
        // Best-effort side channel; never let a failed result write break generation.
    }
}
