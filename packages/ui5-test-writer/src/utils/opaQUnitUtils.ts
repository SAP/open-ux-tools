/**
 * Utility for reading and updating a generated opaTests.qunit.js file.
 * The file is modified in-place: only the sap.ui.require array is changed;
 * all other content (formatting, comments, whitespace) is preserved exactly.
 */

import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';

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
 */
const SAP_UI_REQUIRE_ARRAY_REGEX = /sap\.ui\.require\s*\(\s*\[([\s\S]*?)\]\s*,\s*function/;

/**
 * Splices new module paths into the sap.ui.require array of the content string.
 * Entries that are already present are skipped. All other content is preserved exactly.
 *
 * @param fileContent - the full content of the opaTests.qunit.js file
 * @param moduleNames - module paths to add (e.g. ["myApp/test/integration/SomeJourney"])
 * @returns the updated file content, or the original content unchanged if nothing was added
 */
export function spliceModulesIntoQUnitContent(fileContent: string, moduleNames: string[]): string {
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

    // Insert just before the closing `]` — find the position right after the
    // last character of the captured array body inside the full match.
    const arrayBodyStart = match.index + match[0].indexOf(match[1]);
    const insertPosition = arrayBodyStart + arrayBody.length;

    const before = fileContent.slice(0, insertPosition);
    const after = fileContent.slice(insertPosition);

    const leadingNewline = arrayBody.endsWith('\n') ? '' : '\n';
    return `${before}${leadingNewline}${newLines}\n${after}`;
}

/**
 * Regex to extract the html launch target from a `launchUrl` line of the form:
 *   sap.ui.require.toUrl('...') + '/some/path.html?params#hash'
 * Captures the path/query/hash portion after the closing `') + '`.
 */
const LAUNCH_URL_REGEX = /\.toUrl\s*\([^)]+\)\s*\+\s*'([^']+)'/;

/**
 * Reads opaTests.qunit.js from webapp/test/integration_old and extracts the html
 * launch target (path, query parameters, and hash fragment) from the launchUrl
 * line, e.g. `test/flpSandbox.html?sap-ui-xx-viewCache=false#myApp-tile`.
 * Returns undefined if the file cannot be read or the pattern is not found.
 *
 * @param basePath - project root (contains webapp/)
 * @param fs - mem-fs-editor instance used to read the file
 * @returns the html target string, or undefined if not found
 */
export function readHtmlTargetFromQUnitJs(basePath: string, fs: Editor): string | undefined {
    try {
        const filePath = join(basePath, 'webapp', 'test', 'integration_old', 'opaTests.qunit.js');
        const content = fs.read(filePath);
        const match = LAUNCH_URL_REGEX.exec(content);
        return match?.[1].replace(/^\//, '');
    } catch (error) {
        return undefined;
    }
}

/** The gitignore entry added for the moved integration test folder */
const INTEGRATION_OLD_GITIGNORE_ENTRY = '/webapp/test/integration_old';

/**
 * Appends `/webapp/test/integration_old` to the project's `.gitignore`.
 * Creates the file if it does not exist. Skips if the entry is already present.
 *
 * @param basePath - project root (contains .gitignore)
 * @param fs - mem-fs-editor instance used to read and write the file
 */
export function addIntegrationOldToGitignore(basePath: string, fs: Editor): void {
    const filePath = join(basePath, '.gitignore');
    const existing = fs.exists(filePath) ? fs.read(filePath) : '';
    const lines = existing.split('\n');
    if (lines.some((line) => line.trim() === INTEGRATION_OLD_GITIGNORE_ENTRY)) {
        return;
    }
    const updated =
        existing.endsWith('\n') || existing === ''
            ? `${existing}${INTEGRATION_OLD_GITIGNORE_ENTRY}\n`
            : `${existing}\n${INTEGRATION_OLD_GITIGNORE_ENTRY}\n`;
    fs.write(filePath, updated);
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
 */
export function addPathsToQUnitJs(filePaths: string[], projectPath: string, fs: Editor): void {
    const filePath = join(projectPath, OPA_QUNIT_FILE);
    const content = fs.read(filePath);
    const updated = spliceModulesIntoQUnitContent(content, filePaths);
    if (updated !== content) {
        fs.write(filePath, updated);
    }
}
