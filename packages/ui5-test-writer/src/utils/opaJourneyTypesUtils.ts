import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';
import { join } from 'node:path';
import { t } from '../i18n.js';
import type { JourneyRunnerPage } from './journeyRunnerUtils.js';
import { MAX_FILE_CONTENT_LENGTH, escapeRegex } from './fileWritingUtils.js';

/** Relative path from the test output directory to OpaJourneyTypes.d.ts */
const OPA_JOURNEY_TYPES_FILE = join('integration', 'types', 'OpaJourneyTypes.d.ts');

/** Frameworks the splicer knows how to render entries for. */
const SUPPORTED_FRAMEWORKS = new Set(['ListReport', 'ObjectPage']);

/**
 * Filter `pages` down to those whose generator-owned custom-actions/assertions import
 * is not yet present (matched against `../pages/<fileName>` with the `.gen` suffix).
 *
 * @param fileContent - the existing OpaJourneyTypes.d.ts content
 * @param pages - candidate pages to splice in
 * @returns the subset of pages that need to be added
 */
function findPagesToAdd(fileContent: string, pages: JourneyRunnerPage[]): JourneyRunnerPage[] {
    return pages.filter((page) => {
        const importPattern = new RegExp(String.raw`from\s+"\.\./pages/${escapeRegex(page.fileName)}"`);
        return !importPattern.test(fileContent);
    });
}

/**
 * Return the index immediately after the last `import ... from "..."` line in `content`,
 * or `-1` if the content has no `import` lines.
 *
 * @param content - the file content to scan
 * @returns the index immediately after the last import line, or -1 if none found
 */
function findLastImportEnd(content: string): number {
    const importLineRegex = /^import\b[^\n]*?\bfrom[ \t]+["'][^"']+["'];?[ \t]*$/gm;
    let lastImportEnd = -1;
    let importMatch: RegExpExecArray | null;
    while ((importMatch = importLineRegex.exec(content)) !== null) {
        lastImportEnd = importMatch.index + importMatch[0].length;
    }
    return lastImportEnd;
}

/**
 * Insert `newImportLines` after the last existing `import` line in `content`.
 * Returns `content` unchanged if it has no `import` lines.
 *
 * @param content - the file content
 * @param newImportLines - the import lines to insert (no leading newline)
 * @returns the updated content
 */
function insertAfterLastImport(content: string, newImportLines: string[]): string {
    if (newImportLines.length === 0) {
        return content;
    }
    const lastImportEnd = findLastImportEnd(content);
    if (lastImportEnd < 0) {
        return content;
    }
    const newImports = newImportLines.map((line) => `\n${line}`).join('');
    return `${content.slice(0, lastImportEnd)}${newImports}${content.slice(lastImportEnd)}`;
}

/**
 * Build the framework-import lines (ListReport / ObjectPage / TemplatePage) that need to be
 * added to the file, skipping any already imported.
 *
 * @param fileContent - the existing OpaJourneyTypes.d.ts content
 * @param pages - the new pages being added
 * @returns the list of framework-import lines to insert
 */
function buildMissingFrameworkImports(fileContent: string, pages: JourneyRunnerPage[]): string[] {
    const lines: string[] = [];
    const templates = new Set(
        pages.map((page) => page.template).filter((template): template is string => Boolean(template))
    );
    if (templates.has('ListReport') && !fileContent.includes('from "sap/fe/test/ListReport"')) {
        lines.push(
            `import type { actions as ListReportActions, assertions as ListReportAssertions } from "sap/fe/test/ListReport";`
        );
    }
    if (templates.has('ObjectPage') && !fileContent.includes('from "sap/fe/test/ObjectPage"')) {
        lines.push(
            `import type { actions as ObjectPageActions, assertions as ObjectPageAssertions } from "sap/fe/test/ObjectPage";`
        );
    }
    if (
        (templates.has('ListReport') || templates.has('ObjectPage')) &&
        !fileContent.includes('from "sap/fe/test/TemplatePage"')
    ) {
        lines.push(
            `import type { actions as TemplatePageActions, assertions as TemplatePageAssertions } from "sap/fe/test/TemplatePage";`
        );
    }
    return lines;
}

/**
 * Build the per-page import line for a page's generator-owned custom actions/assertions.
 *
 * @param page - the page to render
 * @returns the import line
 */
function buildPageCustomImportLine(page: JourneyRunnerPage): string {
    return (
        `import type { actions as ${page.targetKey}GeneratedCustomActions, ` +
        `assertions as ${page.targetKey}GeneratedCustomAssertions } from "../pages/${page.fileName}";`
    );
}

/**
 * Build the new entry to insert into the `When`/`Then` type union for a single page.
 *
 * @param page - the page to render
 * @param mode - whether to render the entry for the `When` (actions) or `Then` (assertions) union
 * @param indent - leading whitespace for the new line
 * @returns the source line, or undefined if the page's framework is not supported
 */
function buildPageUnionEntry(
    page: JourneyRunnerPage,
    mode: 'actions' | 'assertions',
    indent: string
): string | undefined {
    if (!page.template || !SUPPORTED_FRAMEWORKS.has(page.template)) {
        return undefined;
    }
    const frameworkSuffix = mode === 'actions' ? 'Actions' : 'Assertions';
    const customSuffix = mode === 'actions' ? 'CustomActions' : 'CustomAssertions';
    return (
        `${indent}onThe${page.targetKey}Generated: Opa5 & ${page.template}${frameworkSuffix} & TemplatePage${frameworkSuffix} & ` +
        `typeof ${page.targetKey}Generated${customSuffix};`
    );
}

/**
 * Insert new `onThe<targetKey>Generated` member lines into the named exported type union,
 * preserving the indentation of the first existing member.
 *
 * @param content - the file content
 * @param exportName - the type union to update (`When` or `Then`)
 * @param newEntries - the new union member lines to insert
 * @returns the updated content (or unchanged if the type union or its closing brace can't be found)
 */
function insertIntoTypeUnion(content: string, exportName: 'When' | 'Then', newEntries: string[]): string {
    if (newEntries.length === 0) {
        return content;
    }
    const headerRegex = new RegExp(String.raw`export\s+type\s+${exportName}\b[^=]*=\s*[^{]*\{`);
    const headerMatch = headerRegex.exec(content);
    if (!headerMatch) {
        return content;
    }
    const openBraceIdx = content.indexOf('{', headerMatch.index + headerMatch[0].length - 1);
    if (openBraceIdx < 0) {
        return content;
    }
    const closeBraceIdx = findMatchingClosingBrace(content, openBraceIdx);
    if (closeBraceIdx >= content.length) {
        return content;
    }
    const body = content.slice(openBraceIdx + 1, closeBraceIdx);
    const indentMatch = /^([ \t]+)\S/m.exec(body);
    const indent = indentMatch ? indentMatch[1] : '    ';
    const insertion = newEntries.map((line) => line.replace(/^\s*/, indent)).join('\n');

    // Insert before the closing brace, with a leading newline so the new lines sit on their own.
    const head = content.slice(0, closeBraceIdx);
    const tail = content.slice(closeBraceIdx);
    return `${head.trimEnd()}\n${insertion}\n${tail}`;
}

/**
 * Walk forward from `openBraceIdx` and return the index of the matching closing `}`,
 * accounting for nested braces inside member type expressions.
 *
 * @param content - the file content
 * @param openBraceIdx - the index of the `{` that opens the block
 * @returns the index of the matching closing `}` (or `content.length` if unterminated)
 */
function findMatchingClosingBrace(content: string, openBraceIdx: number): number {
    let depth = 1;
    let index = openBraceIdx + 1;
    while (index < content.length && depth > 0) {
        const character = content[index];
        if (character === '{') {
            depth++;
        } else if (character === '}') {
            depth--;
        }
        if (depth === 0) {
            break;
        }
        index++;
    }
    return index;
}

/**
 * Splice new journey entries into an existing `OpaJourneyTypes.d.ts`: framework imports,
 * per-page custom actions/assertions imports, and `onThe<targetKey>Generated` members in
 * the `When` and `Then` unions. Pages already imported are skipped; all other content is preserved.
 *
 * @param fileContent - the full content of the OpaJourneyTypes.d.ts file
 * @param pages - pages to add
 * @returns the updated file content, or the original content unchanged if nothing was added
 */
export function spliceJourneysIntoOpaJourneyTypes(fileContent: string, pages: JourneyRunnerPage[]): string {
    if (fileContent.length > MAX_FILE_CONTENT_LENGTH) {
        return fileContent;
    }
    const toAdd = findPagesToAdd(fileContent, pages);
    if (toAdd.length === 0) {
        return fileContent;
    }

    const newImportLines = [
        ...buildMissingFrameworkImports(fileContent, toAdd),
        ...toAdd
            .filter((page) => page.template && SUPPORTED_FRAMEWORKS.has(page.template))
            .map((page) => buildPageCustomImportLine(page))
    ];

    const whenEntries = toAdd
        .map((page) => buildPageUnionEntry(page, 'actions', ''))
        .filter((entry): entry is string => entry !== undefined);
    const thenEntries = toAdd
        .map((page) => buildPageUnionEntry(page, 'assertions', ''))
        .filter((entry): entry is string => entry !== undefined);

    let result = insertAfterLastImport(fileContent, newImportLines);
    result = insertIntoTypeUnion(result, 'When', whenEntries);
    result = insertIntoTypeUnion(result, 'Then', thenEntries);
    return result;
}

/**
 * Read `OpaJourneyTypes.d.ts` from the project, splice entries for new pages, and write
 * the result back. Pages already present are skipped. If the file does not exist or
 * cannot be read, logs a warning and returns without writing.
 *
 * @param pages - pages whose journeys should be reflected in OpaJourneyTypes.d.ts
 * @param testOutDirPath - path to the test output directory (`.../webapp/test`)
 * @param fs - mem-fs-editor instance used to read and write the file
 * @param log - optional logger instance used to surface warnings when the file
 *   cannot be read or updated
 */
export function addJourneysToOpaJourneyTypes(
    pages: JourneyRunnerPage[],
    testOutDirPath: string,
    fs: Editor,
    log?: Logger
): void {
    if (pages.length === 0) {
        return;
    }
    try {
        const filePath = join(testOutDirPath, OPA_JOURNEY_TYPES_FILE);
        const content = fs.read(filePath);
        const updated = spliceJourneysIntoOpaJourneyTypes(content, pages);
        if (updated !== content) {
            fs.write(filePath, updated);
        }
    } catch {
        log?.warn(t('warn.cannotUpdateOpaJourneyTypes'));
    }
}
