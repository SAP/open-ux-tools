/**
 * Utility for reading and updating a generated opaTests.qunit.js file.
 * The file is modified in-place: only the sap.ui.require array is changed;
 * all other content (formatting, comments, whitespace) is preserved exactly.
 */

import { join } from 'node:path';
import type { Editor } from 'mem-fs-editor';
import { readHashFromFlpSandbox } from './flpSandboxUtils';
import { getAllUi5YamlFileNames, readUi5Yaml } from '@sap-ux/project-access';

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
 * Reads opaTests.qunit.js from webapp/test/integration_old and extracts the html
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
        const integrationOldDir = join(testPath, 'integration_old');
        let filePath = join(integrationOldDir, 'opaTests.qunit.js');
        if (!fs.exists(filePath)) {
            filePath = join(integrationOldDir, 'Opa.qunit.js');
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

/** The gitignore entry added for the moved integration test folder */
const INTEGRATION_OLD_GITIGNORE_ENTRY = '/webapp/test/integration_old';

/**
 * Appends `/webapp/test/integration_old` to the project's `.gitignore`.
 * Creates the file if it does not exist. Skips if the entry is already present.
 *
 * @param basePath - project root (contains .gitignore)
 * @param fs - mem-fs-editor instance used to read and write the file
 */
export async function addIntegrationOldToGitignore(basePath: string, fs: Editor): Promise<void> {
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
    try {
        const filePath = join(projectPath, OPA_QUNIT_FILE);
        const content = fs.read(filePath);
        const updated = spliceModulesIntoQUnitContent(content, filePaths);
        if (updated !== content) {
            fs.write(filePath, updated);
        }
    } catch {
        // If the file doesn't exist or can't be read, do nothing
    }
}

/** Relative path from the test output directory to JourneyRunner.js */
const JOURNEY_RUNNER_FILE = join('integration', 'pages', 'JourneyRunner.js');

/**
 * Page entry to splice into an existing JourneyRunner.js.
 */
export interface JourneyRunnerPage {
    /** The page's targetKey, used as both the variable name and `onThe<targetKey>` key */
    targetKey: string;
    /** The app module path prefix (e.g. "project1/test/integration/pages") */
    appPath: string;
}

/**
 * Splices new page entries into the three locations of an existing JourneyRunner.js:
 * - the sap.ui.define dependency array
 * - the function parameter list
 * - the pages object literal
 *
 * Pages already present (detected by their module path in the define array) are skipped.
 * All other content — formatting, comments, whitespace — is preserved exactly.
 *
 * Note: files exceeding MAX_FILE_CONTENT_LENGTH characters are returned unchanged to prevent
 * ReDoS on crafted inputs. Valid generated files are well within this limit.
 *
 * @param fileContent - the full content of the JourneyRunner.js file
 * @param pages - pages to add
 * @returns the updated file content, or the original content unchanged if nothing was added
 */
export function splicePageIntoJourneyRunner(fileContent: string, pages: JourneyRunnerPage[]): string {
    if (fileContent.length > MAX_FILE_CONTENT_LENGTH) {
        return fileContent;
    }
    // Determine which pages are not yet present by checking the define array
    const toAdd = pages.filter((page) => {
        const modulePath = `${page.appPath}/test/integration/pages/${page.targetKey}`;
        return !fileContent.includes(`"${modulePath}"`);
    });

    if (toAdd.length === 0) {
        return fileContent;
    }

    let result = fileContent;

    // 1. Splice into the sap.ui.define([...]) array.
    //    Captures everything between the opening `[` and the closing `]` before `, function`.
    const defineArrayRegex = /sap\.ui\.define\s*\(\s*\[([^\]]*)\]\s*,\s*function/d;
    const defineMatch = defineArrayRegex.exec(result);
    if (defineMatch?.indices?.[1]) {
        const [bodyStart, bodyEnd] = defineMatch.indices[1];
        const arrayBody = result.slice(bodyStart, bodyEnd);

        // Detect indentation from the first existing module entry line
        const indentMatch = /^([ \t]+)"/m.exec(arrayBody);
        const indent = indentMatch ? indentMatch[1] : '\t';

        const newEntries = toAdd
            .map((page) => `${indent}"${page.appPath}/test/integration/pages/${page.targetKey}",`)
            .join('\n');

        // Ensure the last existing entry ends with a comma before we insert after it.
        // The trimmed body ends at bodyEnd; look back from there for the last non-whitespace char.
        const trimmedEnd = result.slice(0, bodyEnd).trimEnd();
        const needsComma = !trimmedEnd.endsWith(',');
        const commaFix = needsComma ? ',' : '';
        const trailingWhitespace = result.slice(trimmedEnd.length, bodyEnd);
        result = `${trimmedEnd}${commaFix}\n${newEntries}` + `${trailingWhitespace}${result.slice(bodyEnd)}`;
    }

    // 2. Splice into the function parameter list: `function (JourneyRunner, A, B)`.
    //    Captures everything between `(` and `)` of the function signature.
    const funcParamRegex = /\]\s*,\s*function\s*\(([^)]*)\)\s*\{/d;
    const funcMatch = funcParamRegex.exec(result);
    if (funcMatch?.indices?.[1]) {
        const [, paramEnd] = funcMatch.indices[1];
        const newParams = toAdd.map((page) => `, ${page.targetKey}`).join('');
        result = `${result.slice(0, paramEnd)}${newParams}${result.slice(paramEnd)}`;
    }

    // 3. Splice into the pages object: `pages: { onTheFoo: Foo, ... }`.
    //    Captures everything between `pages: {` and the closing `}`.
    const pagesObjectRegex = /pages\s*:\s*\{([^}]*)\}/d;
    const pagesMatch = pagesObjectRegex.exec(result);
    if (pagesMatch?.indices?.[1]) {
        const [, pagesBodyEnd] = pagesMatch.indices[1];
        const pagesBody = result.slice(pagesMatch.indices[1][0], pagesBodyEnd);

        // Detect indentation from the first existing page entry
        const pageIndentMatch = /^([ \t]+)on/m.exec(pagesBody);
        const pageIndent = pageIndentMatch ? pageIndentMatch[1] : '\t\t\t';

        const newPageEntries = toAdd
            .map((page) => `${pageIndent}onThe${page.targetKey}: ${page.targetKey},`)
            .join('\n');

        // Ensure the last existing entry ends with a comma before we insert after it.
        const trimmedPagesEnd = result.slice(0, pagesBodyEnd).trimEnd();
        const needsComma = !trimmedPagesEnd.endsWith(',');
        const commaFix = needsComma ? ',' : '';
        const trailingWhitespace = result.slice(trimmedPagesEnd.length, pagesBodyEnd);
        result =
            `${trimmedPagesEnd}${commaFix}\n${newPageEntries}` + `${trailingWhitespace}${result.slice(pagesBodyEnd)}`;
    }

    return result;
}

/**
 * Reads JourneyRunner.js from the project, adds new page entries to all three
 * locations (define array, function params, pages object), and writes the updated
 * content back. Pages already present are skipped.
 *
 * @param pages - pages to add
 * @param testOutDirPath - path to the test output directory (`.../webapp/test`)
 * @param fs - mem-fs-editor instance used to read and write the file
 */
export function addPagesToJourneyRunner(pages: JourneyRunnerPage[], testOutDirPath: string, fs: Editor): void {
    try {
        const filePath = join(testOutDirPath, JOURNEY_RUNNER_FILE);
        const content = fs.read(filePath);
        const updated = splicePageIntoJourneyRunner(content, pages);
        if (updated !== content) {
            fs.write(filePath, updated);
        }
    } catch {
        // If the file doesn't exist or can't be read, do nothing
    }
}

/** Shape of one entry in the `test` array of a `fiori-tools-preview` middleware configuration */
interface PreviewTestEntry {
    framework?: string;
    path?: string;
}

/** Shape of the `fiori-tools-preview` middleware configuration relevant to OPA5 detection */
interface PreviewMiddlewareConfig {
    test?: PreviewTestEntry[];
}

/**
 * Returns true if any UI5 yaml file in the project contains a `fiori-tools-preview`
 * middleware whose `test` array includes an entry with `framework: OPA5`.
 *
 * @param basePath - project root directory
 * @returns true when OPA5 is configured in a preview middleware, false otherwise
 */
export async function hasVirtualOPA5(basePath: string): Promise<boolean> {
    const yamlFileNames = await getAllUi5YamlFileNames(basePath);
    for (const fileName of yamlFileNames) {
        try {
            const ui5Config = await readUi5Yaml(basePath, fileName);
            const previewMiddleware = ui5Config.findCustomMiddleware<PreviewMiddlewareConfig>('fiori-tools-preview');
            const testEntries = previewMiddleware?.configuration?.test;
            if (testEntries?.some((entry) => entry.framework === 'OPA5')) {
                return true;
            }
        } catch {
            // Skip yaml files that cannot be read
        }
    }
    return false;
}
