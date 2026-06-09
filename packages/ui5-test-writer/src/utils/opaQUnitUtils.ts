/**
 * Utility for reading and updating a generated opaTests.qunit.js file.
 * The file is modified in-place: only the sap.ui.require array is changed;
 * all other content (formatting, comments, whitespace) is preserved exactly.
 */

import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';
import { readHashFromFlpSandbox } from './flpSandboxUtils.js';
import { t } from '../i18n.js';

/** Relative path from the test output directory to opaTests.qunit.js */
const OPA_QUNIT_FILE = join('integration', 'opaTests.qunit.js');

/**
 * The regex matches the opening bracket of the sap.ui.require array and
 * captures everything up to (but not including) the closing bracket followed
 * by `], function`.  This lets us splice new entries in without disturbing
 * any other part of the file.
 *
 * Matches:
 *   sap.ui.require(\n  [\n    "a",\n    "b",\n  ], function
 *                           ^^^^^^^^^^^^^^^^^
 *                           captured as group 1
 *
 * The `d` flag enables `match.indices` so we can read the capture group's
 * exact start/end positions without fragile string searching.
 */
const SAP_UI_REQUIRE_ARRAY_REGEX = /sap\.ui\.require\s*\(\s*\[([^\]]*)\]\s*,\s*function/d;

/** ReDoS mitigation: files larger than this are returned unchanged rather than matched with regex. */
const MAX_FILE_CONTENT_LENGTH = 10000;

/**
 * Splices new module paths into the sap.ui.require array of the content string.
 * Entries that are already present are skipped. All other content is preserved exactly.
 *
 * Note: files exceeding MAX_FILE_CONTENT_LENGTH characters are returned unchanged to prevent
 * ReDoS on crafted inputs. Valid generated files are well within this limit.
 *
 * @param fileContent - the full content of the opaTests.qunit.js file
 * @param moduleNames - module paths to add (e.g. ["myApp/test/integration/SomeJourney"])
 * @returns the updated file content, or the original content unchanged if nothing was added
 */
export function spliceModulesIntoQUnitContent(fileContent: string, moduleNames: string[]): string {
    if (fileContent.length > MAX_FILE_CONTENT_LENGTH) {
        return fileContent;
    }
    const match = SAP_UI_REQUIRE_ARRAY_REGEX.exec(fileContent);
    if (!match) {
        return fileContent;
    }

    const arrayBody = match[1]; // everything between `[` and `]`

    // Collect existing quoted entries so we don't add duplicates
    const existingEntries = new Set<string>();
    const entryRegex = /"([^"]+)"/g;
    let entryMatch: RegExpExecArray | null;
    while ((entryMatch = entryRegex.exec(arrayBody)) !== null) {
        existingEntries.add(entryMatch[1]);
    }

    const toAdd = moduleNames.filter((name) => !existingEntries.has(name));
    if (toAdd.length === 0) {
        return fileContent;
    }

    // Detect the indentation used by the existing entries (e.g. four spaces)
    const indentMatch = /^([ \t]+)"/m.exec(arrayBody);
    const indent = indentMatch ? indentMatch[1] : '    ';

    // Build the lines to insert, each terminated with a trailing comma
    const newLines = toAdd.map((name) => `${indent}"${name}",`).join('\n');

    // Insert just before the closing `]` using the capture group's end index.
    const insertPosition = match.indices?.[1]?.[1];
    if (insertPosition === undefined) {
        return fileContent;
    }

    // Ensure the last existing entry ends with a comma before inserting after it.
    const trimmedBefore = fileContent.slice(0, insertPosition).trimEnd();
    const needsComma = !trimmedBefore.endsWith(',');
    const commaFix = needsComma ? ',' : '';
    const trailingWhitespace = fileContent.slice(trimmedBefore.length, insertPosition);
    const after = fileContent.slice(insertPosition);

    return `${trimmedBefore}${commaFix}\n${newLines}\n${trailingWhitespace}${after}`;
}

/**
 * Regex to extract the html launch target from a `launchUrl` line of the form:
 *   sap.ui.require.toUrl('...') + '/some/path.html?params#hash'
 * Captures the path/query/hash portion after the closing `') + '`.
 */
const LAUNCH_URL_REGEX = /\.toUrl\s*\([^)]+\)\s*\+\s*'([^']+)'/;

/**
 * Reads opaTests.qunit.js from webapp/test/integration and extracts the html
 * launch target (path, query parameters, and hash fragment) from the launchUrl
 * line, e.g. `test/flpSandbox.html?sap-ui-xx-viewCache=false#myApp-tile`.
 * Returns undefined if the file cannot be read or the pattern is not found.
 *
 * @param testPath - path to the test output directory (`.../webapp/test`)
 * @param fs - mem-fs-editor instance used to read the file
 * @returns the html target string, or undefined if not found
 */
export function readHtmlTargetFromQUnitJs(testPath: string, fs: Editor): string | undefined {
    try {
        const integrationDir = join(testPath, 'integration');
        let filePath = join(integrationDir, 'opaTests.qunit.js');
        if (!fs.exists(filePath)) {
            filePath = join(integrationDir, 'Opa.qunit.js');
        }
        const content = fs.read(filePath);
        const match = LAUNCH_URL_REGEX.exec(content);
        const launchUrl = match?.[1].replace(/^\//, '');
        if (!launchUrl) {
            return undefined;
        }

        // If the launch URL already contains a hash fragment, use it as-is
        if (launchUrl.includes('#')) {
            return launchUrl;
        }

        // No hash fragment — read the referenced HTML file to extract the
        // application key from the sap-ushell-config applications object
        const htmlPath = launchUrl.split('?')[0];
        const hash = readHashFromFlpSandbox(htmlPath, join(testPath, '..'), fs);
        return hash ? `${launchUrl}#${hash}` : launchUrl;
    } catch {
        return undefined;
    }
}

/**
 * Reads opaTests.qunit.js from the project, adds module paths to the
 * sap.ui.require array, and writes the updated content back.
 * Entries that are already present are skipped.
 * All other file content is preserved exactly.
 *
 * @param filePaths - module paths to add (e.g. ["myApp/test/integration/SomeJourney"])
 * @param projectPath - path to the test output directory (`.../webapp/test`)
 * @param fs - mem-fs-editor instance used to read and write the file
 * @param log - optional logger instance used to surface warnings when the file
 *   cannot be read or updated
 */
export function addPathsToQUnitJs(filePaths: string[], projectPath: string, fs: Editor, log?: Logger): void {
    try {
        const filePath = join(projectPath, OPA_QUNIT_FILE);
        const content = fs.read(filePath);
        const updated = spliceModulesIntoQUnitContent(content, filePaths);
        if (updated !== content) {
            fs.write(filePath, updated);
        }
    } catch {
        log?.warn(t('warn.cannotUpdateOpaTestsQunit'));
    }
}
