import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';
import { join } from 'node:path';
import { t } from '../i18n.js';

/**
 * Page entry to splice into an existing JourneyRunner.js.
 */
export interface JourneyRunnerPage {
    /** The page's targetKey, used as both the variable name and `onThe<targetKey>` key */
    targetKey: string;
    /** The app module path prefix (e.g. "project1/test/integration/pages") */
    appPath: string;
    /** The file name of the page object, including the suffix (e.g. "ListReportPage.gen") */
    fileName: string;
    /** The file extension of the page object (e.g. ".js") */
    fileExtension: string;
}

/** Relative path from the test output directory to JourneyRunner.js */
const JOURNEY_RUNNER_FILE = join('integration', 'pages', 'JourneyRunner.js');
/** ReDoS mitigation: files larger than this are returned unchanged rather than matched with regex. */
const MAX_FILE_CONTENT_LENGTH = 10000;

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
        const modulePath = `${page.appPath}/test/integration/pages/${page.fileName}`;
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
            .map((page) => `${indent}"${page.appPath}/test/integration/pages/${page.fileName}",`)
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
        const newParams = toAdd.map((page) => `, ${page.targetKey}Generated`).join('');
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
            .map((page) => `${pageIndent}onThe${page.targetKey}Generated: ${page.targetKey}Generated,`)
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
 * @param log - optional logger instance used to surface warnings when the file
 *   cannot be read or updated
 */
export function addPagesToJourneyRunner(
    pages: JourneyRunnerPage[],
    testOutDirPath: string,
    fs: Editor,
    log?: Logger
): void {
    try {
        const filePath = join(testOutDirPath, JOURNEY_RUNNER_FILE);
        const content = fs.read(filePath);
        const updated = splicePageIntoJourneyRunner(content, pages);
        if (updated !== content) {
            fs.write(filePath, updated);
        }
    } catch {
        log?.warn(t('warn.cannotUpdateJourneyRunner'));
    }
}
