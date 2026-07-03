#!/usr/bin/env node

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import jsdocApi from 'jsdoc-api';
import { ToolsLogger, type Logger } from '@sap-ux/logger';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '../../..');
const API_DIR = 'packages/sap.fe.test/src/sap/fe/test/api';
const REPO_PATH = path.resolve(PACKAGE_ROOT, 'data/git_repos/sap.fe');
const OUTPUT_PATH = path.resolve(PACKAGE_ROOT, 'data_local/sap_fe_test_api.md');

// jsdoc-api doclet types we care about
interface JsDoclet {
    kind: 'class' | 'function' | 'typedef' | 'member' | 'constant';
    name: string;
    longname: string;
    memberof?: string;
    description?: string;
    access?: string;
    scope?: string;
    undocumented?: boolean;
    isEnum?: boolean;
    augments?: string[];
    params?: JsDocParam[];
    returns?: JsDocReturn[];
    properties?: JsDocProperty[];
    type?: { names: string[] };
    meta?: { filename: string };
}

interface JsDocParam {
    name: string;
    type?: { names: string[] };
    description?: string;
    optional?: boolean;
}

interface JsDocReturn {
    type?: { names: string[] };
    description?: string;
}

interface JsDocProperty {
    name: string;
    type?: { names: string[] };
    description?: string;
    optional?: boolean;
}

/**
 * Returns true if the doclet should be included in the public API output.
 */
function isPublic(d: JsDoclet): boolean {
    if (d.undocumented) {
        return false;
    }
    // typedefs and enums are public by convention; classes/functions require explicit @public
    if (d.kind === 'typedef' || d.kind === 'member' || d.kind === 'constant') {
        return true;
    }
    return d.access === 'public';
}

/**
 * Formats a list of JSDoc type names into a union type string.
 */
function formatType(names: string[] | undefined): string {
    if (!names || names.length === 0) {
        return 'any';
    }
    return names.join('|');
}

/**
 * Renders a single JSDoc parameter as a markdown list item.
 */
function renderParam(p: JsDocParam): string {
    const type = formatType(p.type?.names);
    const opt = p.optional ? ' *(optional)*' : '';
    const desc = p.description ? ` — ${p.description}` : '';
    return `- \`${p.name}\` \`{${type}}\`${opt}${desc}`;
}

/**
 * Renders the return type and description for a method.
 */
function renderReturns(returns: JsDocReturn[] | undefined): string {
    if (!returns || returns.length === 0) {
        return '';
    }
    const r = returns[0];
    const type = formatType(r.type?.names);
    const desc = r.description ? ` ${r.description}` : '';
    return `\`{${type}}\`${desc}`;
}

/**
 * Renders a class and its public instance methods as a markdown chunk.
 */
function renderClassChunk(cls: JsDoclet, methods: JsDoclet[]): string {
    const shortName = cls.name;
    const alias = cls.longname;
    const namespace = cls.memberof ?? 'sap.fe.test.api';
    const isActions = shortName.endsWith('Actions');
    const isAssertions = shortName.endsWith('Assertions');
    let kind: string;
    if (isActions) {
        kind = 'Actions';
    } else if (isAssertions) {
        kind = 'Assertions';
    } else {
        kind = 'API';
    }

    const extendsStr = cls.augments?.length ? cls.augments[0] : undefined;
    let intro = cls.description ?? `OPA5 ${kind} API for ${shortName}.`;
    if (extendsStr) {
        intro += ` Extends ${extendsStr}.`;
    }

    const tags = ['sap.fe.test', 'OPA5', 'testing', shortName.toLowerCase(), kind.toLowerCase(), namespace].join(', ');

    let out = '--------------------------------\n\n';
    out += `**TITLE**: ${alias}\n\n`;
    out += `**INTRODUCTION**: ${intro}\n\n`;
    out += `**TAGS**: ${tags}\n\n`;

    for (const method of methods) {
        const paramSig = (method.params ?? []).map((p) => (p.optional ? `[${p.name}]` : p.name)).join(', ');
        out += `**STEP**: ${method.name}(${paramSig})\n\n`;
        out += `**DESCRIPTION**: ${method.description ?? '(no description)'}\n`;

        if (method.params && method.params.length > 0) {
            out += '\nParameters:\n';
            for (const p of method.params) {
                out += renderParam(p) + '\n';
            }
        }

        const ret = renderReturns(method.returns);
        if (ret) {
            out += `\nReturns: ${ret}\n`;
        }

        out += '\n';
    }

    return out;
}

/**
 * Renders a list of typedef properties as markdown list items.
 */
function renderTypedefProperties(properties: JsDocProperty[]): string {
    let out = '\nProperties:\n';
    for (const p of properties) {
        const type = formatType(p.type?.names);
        const opt = p.optional ? ' *(optional)*' : '';
        const desc = p.description ? ` — ${p.description}` : '';
        out += `- \`${p.name}\` \`{${type}}\`${opt}${desc}\n`;
    }
    return out;
}

/**
 * Renders all typedef doclets as a single markdown chunk.
 */
function renderTypedefsChunk(typedefs: JsDoclet[]): string {
    if (typedefs.length === 0) {
        return '';
    }

    let out = '--------------------------------\n\n';
    out += `**TITLE**: sap.fe.test.api Type Definitions\n\n`;
    out += `**INTRODUCTION**: TypeScript/JSDoc type definitions used as identifiers and parameters across the sap.fe.test OPA5 API.\n\n`;
    out += `**TAGS**: sap.fe.test, OPA5, testing, types, identifiers, typescript\n\n`;

    for (const td of typedefs) {
        out += `**STEP**: ${td.name} (${td.longname})\n\n`;
        out += `**DESCRIPTION**: ${td.description ?? td.name}\n`;
        if (td.properties && td.properties.length > 0) {
            out += renderTypedefProperties(td.properties);
        }
        out += '\n';
    }

    return out;
}

/**
 * Renders all enum doclets and their members as a single markdown chunk.
 */
function renderEnumsChunk(enums: JsDoclet[], members: JsDoclet[]): string {
    if (enums.length === 0) {
        return '';
    }

    let out = '--------------------------------\n\n';
    out += `**TITLE**: sap.fe.test.api Enumerations\n\n`;
    out += `**INTRODUCTION**: Enumeration types used in the sap.fe.test OPA5 API, such as dialog types and edit states.\n\n`;
    out += `**TAGS**: sap.fe.test, OPA5, testing, enum, constants\n\n`;

    for (const en of enums) {
        out += `**STEP**: ${en.name} (${en.longname})\n\n`;
        out += `**DESCRIPTION**: ${en.description ?? en.name}\n`;

        const enumMembers = members.filter((m) => m.memberof === en.longname);
        if (enumMembers.length > 0) {
            out += '\nValues:\n';
            for (const m of enumMembers) {
                const desc = m.description ? ` — ${m.description}` : '';
                out += `- \`${m.name}\`${desc}\n`;
            }
        }
        out += '\n';
    }

    return out;
}

class FeTestApiDocBuilder {
    private readonly logger: Logger;

    constructor() {
        this.logger = new ToolsLogger();
    }

    /**
     * Returns paths to all JS/TS files directly under the API directory.
     */
    private async getApiFiles(): Promise<string[]> {
        const apiDir = path.join(REPO_PATH, API_DIR);
        const entries = await fs.readdir(apiDir, { withFileTypes: true });
        return entries
            .filter((e) => e.isFile() && (e.name.endsWith('.js') || e.name.endsWith('.ts')))
            .map((e) => path.join(apiDir, e.name));
    }

    /**
     * Parses the sap.fe.test API source files and writes a markdown output file.
     * Skips silently if the sap.fe git repository has not been cloned locally.
     */
    async build(): Promise<void> {
        this.logger.info('Building sap.fe.test API documentation...');

        const apiDir = path.join(REPO_PATH, API_DIR);
        try {
            await fs.access(apiDir);
        } catch {
            this.logger.warn(`sap.fe repo not found at ${REPO_PATH}, skipping sap.fe.test API doc generation.`);
            return;
        }

        const files = await this.getApiFiles();
        this.logger.info(`Found ${files.length} files in api/`);

        const doclets = (await jsdocApi.explain({ files, cache: false })) as JsDoclet[];
        const publicDoclets = doclets.filter(isPublic);

        // Group by kind
        const classes = publicDoclets.filter((d) => d.kind === 'class');
        const methods = publicDoclets.filter((d) => d.kind === 'function' && d.scope === 'instance');
        const typedefs = publicDoclets.filter((d) => d.kind === 'typedef');
        // Enum containers: kind=member with isEnum=true
        const enums = publicDoclets.filter((d) => d.kind === 'member' && d.isEnum === true);
        // Enum value members: public constants whose memberof is an enum longname
        const enumLongnames = new Set(enums.map((e) => e.longname));
        const enumMembers = publicDoclets.filter(
            (d) => d.kind === 'constant' && d.memberof && enumLongnames.has(d.memberof)
        );

        this.logger.info(
            `Parsed: ${classes.length} classes, ${methods.length} public methods, ${typedefs.length} typedefs`
        );

        // Sort classes by longname for stable output
        classes.sort((a, b) => a.longname.localeCompare(b.longname));

        let markdown = '\n';
        let classChunks = 0;

        for (const cls of classes) {
            const classMethods = methods.filter((m) => m.memberof === cls.longname);
            if (classMethods.length === 0) {
                continue;
            }
            markdown += renderClassChunk(cls, classMethods);
            classChunks++;
        }

        markdown += renderTypedefsChunk(typedefs);
        markdown += renderEnumsChunk(enums, enumMembers);
        markdown += '--------------------------------\n';

        await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
        await fs.writeFile(OUTPUT_PATH, markdown, 'utf-8');

        this.logger.info(`Done. ${classChunks} class chunks, ${typedefs.length} typedefs, ${enums.length} enums`);
        this.logger.info(`Output: ${OUTPUT_PATH}`);
    }
}

const isMainModule = fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
    const builder = new FeTestApiDocBuilder();
    try {
        await builder.build();
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Build failed: ${msg}\n`);
        process.exit(1);
    }
}

export { FeTestApiDocBuilder };
