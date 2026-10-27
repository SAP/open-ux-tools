#!/usr/bin/env node

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ToolsLogger, type Logger } from '@sap-ux/logger';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '../..');
const SAP_FE_REPO = path.resolve(PACKAGE_ROOT, 'data/git_repos/sap.fe');
const MACROS_SRC_DIR = 'packages/sap.fe.macros/src/sap/fe/macros';
const SECTION_SEPARATOR = '--------------------------------\n\n';
const OUTPUT_PATH = path.resolve(PACKAGE_ROOT, 'data_local/bb_macro_api.md');

/** One entry in the list of source files to parse. */
interface MacroSourceFile {
    /** Path relative to MACROS_SRC_DIR */
    relPath: string;
    /** Fully-qualified UI5 class alias, e.g. "sap.fe.macros.FilterBar" */
    alias: string;
}

const SOURCE_FILES: MacroSourceFile[] = [
    { relPath: 'FilterBar.ts', alias: 'sap.fe.macros.FilterBar' },
    { relPath: 'Table.ts', alias: 'sap.fe.macros.Table' },
    { relPath: 'Field.ts', alias: 'sap.fe.macros.Field' },
    { relPath: 'FormElement.ts', alias: 'sap.fe.macros.FormElement' },
    { relPath: 'filterBar/FilterField.ts', alias: 'sap.fe.macros.filterBar.FilterField' },
    { relPath: 'table/Column.ts', alias: 'sap.fe.macros.table.Column' },
    { relPath: 'table/Action.ts', alias: 'sap.fe.macros.table.Action' },
    { relPath: 'richtexteditor/ButtonGroup.ts', alias: 'sap.fe.macros.richtexteditor.ButtonGroup' }
];

/** A single @public decorator-annotated member (property, event, or aggregation). */
interface ParsedMacroMember {
    kind: 'property' | 'event' | 'aggregation';
    name: string;
    /** Decorator-declared type, e.g. "string", "boolean", "sap.fe.macros.table.Action" */
    type: string;
    required: boolean;
    description: string;
    expectedAnnotations?: string;
    sinceVersion?: string;
    /** Present when @deprecated appears in the JSDoc; contains the description if provided. */
    deprecated?: string;
}

/** Parsed representation of one macro source file. */
interface ParsedMacro {
    alias: string;
    classDescription: string;
    members: ParsedMacroMember[];
}

/**
 * Extracts the JSDoc block immediately preceding a given character position.
 *
 * @param src - Full source text
 * @param pos - Character index to look back from
 * @returns The inner text of the JSDoc block (without delimiters), or empty string
 */
function extractPrecedingJsDoc(src: string, pos: number): string {
    const before = src.slice(0, pos).trimEnd();
    if (!before.endsWith('*/')) {
        return '';
    }
    const closeIdx = before.lastIndexOf('*/');
    const openIdx = before.lastIndexOf('/**', closeIdx);
    if (openIdx === -1) {
        return '';
    }
    const raw = before.slice(openIdx + 3, closeIdx);
    return raw
        .split('\n')
        .map((line) => line.replace(/^\s*\*\s?/, '').trimEnd())
        .filter(
            (line, idx, arr) => !(idx === 0 && line.trim() === '') && !(idx === arr.length - 1 && line.trim() === '')
        )
        .join('\n')
        .trim();
}

/**
 * Extracts a named JSDoc tag value, e.g. `@since 1.90.0` → `"1.90.0"`.
 *
 * @param jsDoc - The JSDoc text to search
 * @param tag - The tag name without the `@` prefix
 * @returns The tag value, or undefined if absent
 */
function extractJsDocTag(jsDoc: string, tag: string): string | undefined {
    const regex = new RegExp(`@${tag}\\s+([^\\n@]+)`, 'i');
    const match = regex.exec(jsDoc);
    return match ? match[1].trim() : undefined;
}

/**
 * Returns the `@deprecated` description from a JSDoc block, or undefined if not present.
 * Handles both `@deprecated <text>` and the non-standard `@deprecatedsince <version>` forms.
 *
 * @param jsDoc - The JSDoc text
 */
function extractDeprecatedDescription(jsDoc: string): string | undefined {
    if (!/@deprecated/i.test(jsDoc)) {
        return undefined;
    }
    const match = /@deprecatedsince\s+([^\n@]+)/i.exec(jsDoc) ?? /@deprecated\s+([^\n@]+)/i.exec(jsDoc);
    return match ? match[1].trim() : 'deprecated';
}

/**
 * Strips all JSDoc tag lines (@public, @private, @since, @deprecated, @alias, etc.)
 * from a JSDoc string, leaving only the prose description.
 *
 * @param jsDoc - Raw JSDoc inner text
 */
function removeJsDocTags(jsDoc: string): string {
    return jsDoc
        .split('\n')
        .filter((line) => !/^\s*@\w+/.test(line))
        .join('\n')
        .trim();
}

/**
 * Parses the `expectedAnnotations` array from a decorator argument string.
 * Example input: `{ type: "string", expectedAnnotations: ["com.sap.vocabularies.UI.v1.LineItem"] }`
 *
 * @param decoratorArgs - The raw text between the decorator parentheses
 * @returns Comma-separated annotation names, or undefined if absent or empty
 */
function parseExpectedAnnotations(decoratorArgs: string): string | undefined {
    const match = /expectedAnnotations\s*:\s*\[([^\]]*)]/.exec(decoratorArgs);
    if (!match || match[1].trim() === '') {
        return undefined;
    }
    return match[1]
        .split(',')
        .map((s) => s.trim().replace(/['"]/g, ''))
        .filter(Boolean)
        .join(', ');
}

/**
 * Parses the `type` string from a `@property` or `@aggregation` decorator argument.
 *
 * @param decoratorArgs - The raw text between the decorator parentheses
 */
function parseDecoratorType(decoratorArgs: string): string {
    const match = /\btype\s*:\s*["']([^"']+)["']/.exec(decoratorArgs);
    return match ? match[1] : 'any';
}

/**
 * Returns true if `required: true` is set in the decorator arguments.
 *
 * @param decoratorArgs - The raw text between the decorator parentheses
 */
function parseIsRequired(decoratorArgs: string): boolean {
    return /\brequired\s*:\s*true\b/.test(decoratorArgs);
}

/**
 * Parses a TypeScript source file and returns all @public @property / @event / @aggregation members.
 *
 * @param src - Full source file text
 * @param alias - The UI5 class alias for this file
 */
function parseMacroSourceFile(src: string, alias: string): ParsedMacro {
    // Class-level JSDoc sits immediately before @defineUI5Class(...)
    let classDescription = '';
    const defineMatch = /@defineUI5Class\s*\(/.exec(src);
    if (defineMatch) {
        classDescription = removeJsDocTags(extractPrecedingJsDoc(src, defineMatch.index));
    }

    const members: ParsedMacroMember[] = [];
    const decoratorRegex = /@(property|event|aggregation)\s*\(/g;
    let match: RegExpExecArray | null;

    while ((match = decoratorRegex.exec(src)) !== null) {
        const kind = match[1] as 'property' | 'event' | 'aggregation';

        // Walk forward from the opening `(` to find its matching `)`
        const openParenIdx = match.index + match[0].length - 1;
        let parenDepth = 0;
        let closeParenIdx = -1;
        for (let i = openParenIdx; i < src.length; i++) {
            if (src[i] === '(') {
                parenDepth++;
            } else if (src[i] === ')') {
                parenDepth--;
                if (parenDepth === 0) {
                    closeParenIdx = i;
                    break;
                }
            }
        }
        if (closeParenIdx === -1) {
            continue;
        }

        const decoratorArgs = src.slice(openParenIdx + 1, closeParenIdx);

        // The member name is the first identifier after the decorator (skipping access modifiers)
        const afterDecorator = src.slice(closeParenIdx + 1);
        const nameMatch = /^\s*(?:public\s+)?(?:readonly\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)/.exec(afterDecorator);
        if (!nameMatch) {
            continue;
        }
        const memberName = nameMatch[1];

        const jsDoc = extractPrecedingJsDoc(src, match.index);
        if (!/@public\b/.test(jsDoc)) {
            continue;
        }

        members.push({
            kind,
            name: memberName,
            type: kind === 'event' ? 'event' : parseDecoratorType(decoratorArgs),
            required: kind === 'property' ? parseIsRequired(decoratorArgs) : false,
            description: removeJsDocTags(jsDoc),
            expectedAnnotations: kind === 'property' ? parseExpectedAnnotations(decoratorArgs) : undefined,
            sinceVersion: extractJsDocTag(jsDoc, 'since'),
            deprecated: extractDeprecatedDescription(jsDoc)
        });
    }

    return { alias, classDescription, members };
}

/**
 * Returns the XML tag short name for a UI5 class alias.
 * Example: "sap.fe.macros.table.Column" → "Column"
 *
 * @param alias - Fully-qualified UI5 class alias
 */
function xmlTagName(alias: string): string {
    return alias.split('.').at(-1) ?? alias;
}

/**
 * Renders a ParsedMacro as a single markdown chunk in the standard embeddings format.
 *
 * @param parsedMacro - The parsed class data
 */
function renderMacroChunk(parsedMacro: ParsedMacro): string {
    const { alias, classDescription, members } = parsedMacro;
    const tag = xmlTagName(alias);
    const propertyNames = members.map((m) => m.name);
    const tags = [alias, tag, 'building block', 'macro', ...propertyNames].join(', ');

    let out = SECTION_SEPARATOR;
    out += `**TITLE**: ${alias} — Building Block API\n\n`;
    out += `**TAGS**: ${tags}\n\n`;
    out += `**INTRODUCTION**: ${classDescription || `Building block API for ${alias}.`}\n\n`;

    for (const member of members) {
        const requiredLabel = member.required ? 'required' : 'optional';
        out += `### ${member.name} (${member.type}) [${requiredLabel}]\n`;
        out += `${member.description || '(no description)'}\n`;
        if (member.expectedAnnotations) {
            out += `expectedAnnotations: ${member.expectedAnnotations}\n`;
        }
        if (member.sinceVersion) {
            out += `@since ${member.sinceVersion}\n`;
        }
        if (member.deprecated) {
            out += `@deprecated ${member.deprecated}\n`;
        }
        out += '\n';
    }

    return out;
}

class FeMacrosDocBuilder {
    private readonly logger: Logger;

    constructor() {
        this.logger = new ToolsLogger();
    }

    /**
     * Parses sap.fe.macros decorator metadata and writes a markdown documentation file.
     * Skips silently if the sap.fe git repository has not been cloned locally.
     */
    async build(): Promise<void> {
        this.logger.info('Building sap.fe.macros building block API documentation...');

        const macrosSrcPath = path.join(SAP_FE_REPO, MACROS_SRC_DIR);
        try {
            await fs.access(macrosSrcPath);
        } catch (err) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === 'ENOENT') {
                this.logger.warn(
                    `sap.fe repo not found at ${SAP_FE_REPO}, skipping sap.fe.macros building block API doc generation.`
                );
                return;
            }
            throw err;
        }

        let markdown = '\n';
        let chunkCount = 0;

        for (const sourceFile of SOURCE_FILES) {
            const filePath = path.join(macrosSrcPath, sourceFile.relPath);
            let src: string;
            try {
                src = await fs.readFile(filePath, 'utf-8');
            } catch (err) {
                const code = (err as NodeJS.ErrnoException).code;
                if (code === 'ENOENT') {
                    this.logger.warn(`Source file not found, skipping: ${filePath}`);
                    continue;
                }
                throw err;
            }

            const parsedMacro = parseMacroSourceFile(src, sourceFile.alias);

            if (parsedMacro.members.length === 0) {
                this.logger.warn(`No @public members found in ${sourceFile.relPath}, skipping`);
                continue;
            }

            markdown += renderMacroChunk(parsedMacro);
            chunkCount++;
            this.logger.info(`  Parsed ${sourceFile.alias}: ${parsedMacro.members.length} public members`);
        }

        markdown += SECTION_SEPARATOR;

        await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
        await fs.writeFile(OUTPUT_PATH, markdown, 'utf-8');

        this.logger.info(`Done. ${chunkCount} class chunks written.`);
        this.logger.info(`Output: ${OUTPUT_PATH}`);
    }
}

const isMainModule = fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
    const builder = new FeMacrosDocBuilder();
    try {
        await builder.build();
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Build failed: ${msg}\n`);
        process.exit(1);
    }
}

export { FeMacrosDocBuilder };
