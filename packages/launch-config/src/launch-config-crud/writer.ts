import { create as createStorage } from 'mem-fs';
import { create } from 'mem-fs-editor';
import type { JSONPath, ModificationOptions } from 'jsonc-parser';
import { applyEdits, modify } from 'jsonc-parser';
import type { Editor } from 'mem-fs-editor';

/**
 * Writes changes for 'launch.json'.
 *
 * @param content content to be added to the JSON file at location specified by JSONPath.
 * @param filePath path to the json file.
 * @param jsonPath The {@linkcode JSONPath} of the value to change. The path represents either to the document root, a property or an array item.
 * @param options Options {@linkcode ModificationOptions} used by {@linkcode modify} when computing the modification edit operations. Default formattingOptions are used if not provided.
 * @param fs - optional, the memfs editor instance.
 * @returns void.
 */
export async function updateLaunchJSON(
    content: object | string | number | undefined,
    filePath: string,
    jsonPath: JSONPath,
    options: ModificationOptions = {},
    fs?: Editor
): Promise<void> {
    if (!fs) {
        fs = create(createStorage());
    }
    const jsonString = fs.read(filePath);
    if (!options.formattingOptions) {
        options.formattingOptions = {
            tabSize: 4,
            insertSpaces: true
        };
    }
    // make edits and apply them
    const edits = modify(jsonString, jsonPath, content, options);
    const updated = applyEdits(jsonString, edits);
    // write changes to file
    fs.write(filePath, updated);
}
