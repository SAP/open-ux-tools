import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';
import { join } from 'node:path';
import { t } from '../i18n.js';
import { DotFileExtension } from '../types.js';
import { MAX_FILE_CONTENT_LENGTH, escapeRegex, findBracedBlock, insertAfterLastImport } from './fileWritingUtils.js';

/**
 * Page entry to splice into an existing JourneyRunner.js / JourneyRunner.ts.
 *
 * The variable name and `onThe...` key emitted by the splicer always use the `Generated` suffix
 * (e.g. `TravelListGenerated`, `onTheTravelListGenerated`) so that generator-owned `.gen` page
 * entries can coexist with hand-authored pages bound to the same `targetKey`.
 */
export interface OpaPageWriteInfo {
    /** The page's targetKey; used as the base for the `onThe<targetKey>Generated` key. */
    targetKey: string;
    /** The app module path prefix (e.g. "project1/test/integration/pages") */
    appPath: string;
    /** The file name of the page object, including the `.gen` suffix (e.g. "TravelList.gen") */
    fileName: string;
    /** The file extension of the page object, including the leading dot (e.g. ".js" or ".ts") */
    dotFileExtension: string;
    /** The framework page template (`'ListReport'` or `'ObjectPage'`); only needed by the TS splicer. */
    template?: string;
    /** The app id (sap.app.id from the manifest); only needed by the TS splicer. */
    appID?: string;
    /** The component id (defined in the target section); only needed by the TS splicer. */
    componentID?: string;
    /** The entity set name (if the page uses an entitySet rather than a contextPath); only needed by the TS splicer. */
    entitySet?: string;
    /** The context path (if the page uses a contextPath rather than an entitySet); only needed by the TS splicer. */
    contextPath?: string;
}

/**
 * Returns the relative path from the test output directory to the JourneyRunner file
 * for the requested file extension.
 *
 * @param dotFileExtension - file extension ('.ts' or '.js')
 * @returns the relative path
 */
function getJourneyRunnerFilePath(dotFileExtension: DotFileExtension): string {
    return join('integration', 'pages', `JourneyRunner${dotFileExtension}`);
}

/**
 * Splice new page entries into the three locations of an existing AMD `JourneyRunner.js`:
 * the `sap.ui.define` dependency array, the function parameter list, and the `pages` object literal.
 * Pages already referenced by their `.gen` module path are skipped; all other content is preserved.
 *
 * @param fileContent - the full content of the JourneyRunner.js file
 * @param pages - pages to add
 * @returns the updated file content, or the original content unchanged if nothing was added
 */
export function splicePageIntoJourneyRunner(fileContent: string, pages: OpaPageWriteInfo[]): string {
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
    result = spliceIntoDefineArray(result, toAdd);
    result = spliceIntoFunctionParams(result, toAdd);
    result = spliceIntoJsPagesObject(result, toAdd);
    return result;
}

/**
 * Insert new entries before the closing `]` of the `sap.ui.define([...])` dependency array.
 *
 * @param content - the file content
 * @param toAdd - pages to add
 * @returns the updated content (or unchanged if the define array can't be located)
 */
function spliceIntoDefineArray(content: string, toAdd: OpaPageWriteInfo[]): string {
    const defineArrayRegex = /sap\.ui\.define\s*\(\s*\[([^\]]*)\]\s*,\s*function/d;
    const match = defineArrayRegex.exec(content);
    if (!match?.indices?.[1]) {
        return content;
    }
    const [bodyStart, bodyEnd] = match.indices[1];
    const arrayBody = content.slice(bodyStart, bodyEnd);
    const indentMatch = /^([ \t]+)"/m.exec(arrayBody);
    const indent = indentMatch ? indentMatch[1] : '\t';

    const newEntries = toAdd
        .map((page) => `${indent}"${page.appPath}/test/integration/pages/${page.fileName}",`)
        .join('\n');
    return insertBeforePosition(content, bodyEnd, newEntries);
}

/**
 * Append the new `, <Target>Generated` parameters to the JourneyRunner module factory's signature.
 *
 * @param content - the file content
 * @param toAdd - pages to add
 * @returns the updated content (or unchanged if the function signature can't be located)
 */
function spliceIntoFunctionParams(content: string, toAdd: OpaPageWriteInfo[]): string {
    const funcParamRegex = /\]\s*,\s*function\s*\(([^)]*)\)\s*\{/d;
    const match = funcParamRegex.exec(content);
    if (!match?.indices?.[1]) {
        return content;
    }
    const [, paramEnd] = match.indices[1];
    const newParams = toAdd.map((page) => `, ${page.targetKey}Generated`).join('');
    return `${content.slice(0, paramEnd)}${newParams}${content.slice(paramEnd)}`;
}

/**
 * Insert new `onThe<Target>Generated: <Target>Generated,` entries into the AMD `pages: { ... }`
 * object literal, using brace counting to handle nested braces in user hand-edits.
 *
 * @param content - the file content
 * @param toAdd - pages to add
 * @returns the updated content (or unchanged if the pages object can't be located)
 */
function spliceIntoJsPagesObject(content: string, toAdd: OpaPageWriteInfo[]): string {
    const block = findBracedBlock(content, /pages\s*:\s*\{/);
    if (!block) {
        return content;
    }
    const { openBraceIdx, closeBraceIdx } = block;
    const pagesBody = content.slice(openBraceIdx + 1, closeBraceIdx);
    const pageIndentMatch = /^([ \t]+)on/m.exec(pagesBody);
    const pageIndent = pageIndentMatch ? pageIndentMatch[1] : '\t\t\t';

    const newPageEntries = toAdd
        .map((page) => `${pageIndent}onThe${page.targetKey}Generated: ${page.targetKey}Generated,`)
        .join('\n');
    return insertBeforePosition(content, closeBraceIdx, newPageEntries);
}

/**
 * Insert `newEntries` immediately before `position` in `content`, preserving the trailing
 * whitespace at `position` and ensuring the preceding token ends with a comma.
 *
 * @param content - the file content
 * @param position - the index to insert before
 * @param newEntries - the new lines (no leading newline) to insert
 * @returns the updated content
 */
function insertBeforePosition(content: string, position: number, newEntries: string): string {
    const trimmedEnd = content.slice(0, position).trimEnd();
    const commaFix = trimmedEnd.endsWith(',') ? '' : ',';
    const trailingWhitespace = content.slice(trimmedEnd.length, position);
    return `${trimmedEnd}${commaFix}\n${newEntries}${trailingWhitespace}${content.slice(position)}`;
}

/**
 * Read the JourneyRunner from disk, splice new page entries into it, and write the result back.
 * Pages already present are skipped. Dispatches between the AMD (`.js`) and ES module (`.ts`) splicers.
 *
 * @param pages - pages to add
 * @param testOutDirPath - path to the test output directory (`.../webapp/test`)
 * @param fs - mem-fs-editor instance used to read and write the file
 * @param dotFileExtension - file extension of the JourneyRunner ('.ts' or '.js'); defaults to '.js'
 * @param log - optional logger instance used to surface warnings when the file
 *   cannot be read or updated
 * @returns true if the file was written, false otherwise
 */
export function addPagesToJourneyRunner(
    pages: OpaPageWriteInfo[],
    testOutDirPath: string,
    fs: Editor,
    dotFileExtension: DotFileExtension = DotFileExtension.JS,
    log?: Logger
): boolean {
    if (pages.length === 0) {
        return false;
    }
    try {
        const filePath = join(testOutDirPath, getJourneyRunnerFilePath(dotFileExtension));
        const content = fs.read(filePath);
        if (content.length > MAX_FILE_CONTENT_LENGTH) {
            log?.warn(t('warn.cannotUpdateJourneyRunner'));
            return false;
        }
        const splice =
            dotFileExtension === DotFileExtension.TS ? splicePageIntoJourneyRunnerTs : splicePageIntoJourneyRunner;
        const updated = splice(content, pages);
        if (updated !== content) {
            fs.write(filePath, updated);
            return true;
        }
    } catch {
        log?.warn(t('warn.cannotUpdateJourneyRunner'));
    }
    return false;
}

/**
 * Filter `pages` down to those whose `Custom<targetKey>Generated` import line is not yet present.
 * The import path matched is `./<fileName>` (with the `.gen` suffix), so user-authored bindings
 * to `./<targetKey>` are correctly treated as different.
 *
 * @param fileContent - the existing JourneyRunner.ts content
 * @param pages - candidate pages to splice in
 * @returns the subset of pages that need to be added
 */
function findPagesToAdd(fileContent: string, pages: OpaPageWriteInfo[]): OpaPageWriteInfo[] {
    return pages.filter((page) => {
        const importPattern = new RegExp(String.raw`from\s+"\./${escapeRegex(page.fileName)}"`);
        return !importPattern.test(fileContent);
    });
}

/**
 * Build the source-code block for a single new entry in the `pages: { ... }` object literal.
 *
 * @param page - the page to render
 * @param pageIndent - leading whitespace for the entry's outer line
 * @param innerIndent - leading whitespace for the entry's nested lines
 * @returns the multi-line source block
 */
function buildPageEntry(page: OpaPageWriteInfo, pageIndent: string, innerIndent: string): string {
    const framework = page.template ?? 'ListReport';
    const innerProps: string[] = [
        `${innerIndent}    appId: "${page.appID ?? ''}"`,
        `${innerIndent}    componentId: "${page.componentID ?? ''}"`,
        `${innerIndent}    entitySet: "${page.entitySet ?? ''}"`,
        `${innerIndent}    contextPath: "${page.contextPath ?? ''}"`
    ];
    return [
        `${pageIndent}onThe${page.targetKey}Generated: new ${framework}(`,
        `${innerIndent}{`,
        innerProps.join(',\n'),
        `${innerIndent}},`,
        `${innerIndent}Custom${page.targetKey}Generated`,
        `${pageIndent})`
    ].join('\n');
}

/**
 * Insert new page entries inside the `pages: { ... }` object literal of `content`.
 * Returns `content` unchanged if it has no `pages: {` block.
 *
 * @param content - the file content
 * @param toAdd - the pages to add
 * @returns the updated content
 */
function insertIntoPagesObject(content: string, toAdd: OpaPageWriteInfo[]): string {
    const block = findBracedBlock(content, /pages\s*:\s*\{/);
    if (!block) {
        return content;
    }
    const { openBraceIdx, closeBraceIdx } = block;
    const pagesBody = content.slice(openBraceIdx + 1, closeBraceIdx);

    // Detect indentation from the first existing page entry
    const pageIndentMatch = /^([ \t]+)on/m.exec(pagesBody);
    const pageIndent = pageIndentMatch ? pageIndentMatch[1] : '        ';
    const innerIndent = pageIndent + '    ';

    const newPageEntries = toAdd.map((page) => buildPageEntry(page, pageIndent, innerIndent)).join(',\n');

    // Ensure the last existing entry ends with a comma before we insert after it.
    const trimmedPagesEnd = content.slice(0, closeBraceIdx).trimEnd();
    const needsComma = !trimmedPagesEnd.endsWith(',') && !trimmedPagesEnd.endsWith('{');
    const commaFix = needsComma ? ',' : '';
    const trailingWhitespace = content.slice(trimmedPagesEnd.length, closeBraceIdx);
    return `${trimmedPagesEnd}${commaFix}\n${newPageEntries}${trailingWhitespace}${content.slice(closeBraceIdx)}`;
}

/**
 * Splice new page entries into an existing TypeScript `JourneyRunner.ts` by adding the
 * required `Custom<targetKey>Generated` imports and an entry inside `pages: { ... }`.
 * Pages already imported are skipped; all other content is preserved.
 *
 * @param fileContent - the full content of the JourneyRunner.ts file
 * @param pages - pages to add
 * @returns the updated file content, or the original content unchanged if nothing was added
 */
export function splicePageIntoJourneyRunnerTs(fileContent: string, pages: OpaPageWriteInfo[]): string {
    if (fileContent.length > MAX_FILE_CONTENT_LENGTH) {
        return fileContent;
    }
    const toAdd = findPagesToAdd(fileContent, pages);
    if (toAdd.length === 0) {
        return fileContent;
    }

    // Determine which framework imports (ListReport / ObjectPage) are missing and need to be added.
    const frameworkTemplates = Array.from(
        new Set(toAdd.map((page) => page.template).filter((template): template is string => Boolean(template)))
    );
    const missingFrameworkImports = frameworkTemplates.filter(
        (template) => !fileContent.includes(`from "sap/fe/test/${template}"`)
    );

    const newImportLines = [
        ...missingFrameworkImports.map((template) => `import ${template} from "sap/fe/test/${template}";`),
        ...toAdd.map((page) => `import Custom${page.targetKey}Generated from "./${page.fileName}";`)
    ];

    const withImports = insertAfterLastImport(fileContent, newImportLines);
    return insertIntoPagesObject(withImports, toAdd);
}
