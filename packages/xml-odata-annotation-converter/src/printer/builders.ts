export type Document = string | Concat | Indent | Line;

export interface Concat {
    type: 'concat';
    parts: Document[];
}

export interface Indent {
    type: 'indent';
    content: Document;
}

export interface Line {
    type: 'line';
    hard: boolean;
}

export interface Options {
    /**
     * Specify the number of spaces per indentation-level.
     */
    tabWidth: number;
}
export interface IndentInfo {
    value: string;
    length: number;
    level: number;
}

export const line: Line = { type: 'line', hard: false };
export const hardline: Line = { type: 'line', hard: true };

export function concat(parts: Document[]): Concat {
    return { type: 'concat', parts };
}

export function indent(content: Document): Indent {
    return { type: 'indent', content };
}

const TRAILING_WHITESPACE_PATTERN = /\n[\t ]*$/;
export function printDocumentToString(document: Document, options: Options): string {
    const commands: [IndentInfo, Document][] = [[{ length: 0, value: '', level: 0 }, document]];
    const fragments: string[] = [];
    while (commands.length > 0) {
        const command = commands.pop();
        if (command?.length) {
            const [indent, doc] = command;
            if (typeof doc === 'string') {
                processStringDoc(fragments, indent, doc);
            } else {
                processComplexDoc(fragments, commands, options, indent, doc);
            }
        }
    }

    return fragments.join('');
}

function processStringDoc(fragments: string[], indent: IndentInfo, doc: string): void {
    // trim trailing whitespace of previous line
    if (doc) {
        if (fragments.length === 0) {
            fragments.push(indent.value);
        }
        if (TRAILING_WHITESPACE_PATTERN.test(fragments[fragments.length - 1]) && doc.startsWith(indent.value)) {
            fragments[fragments.length - 1] = fragments[fragments.length - 1].replace(
                TRAILING_WHITESPACE_PATTERN,
                '\n'
            );
        }
        fragments.push(doc);
    }
}

const newLine = '\n';
const whitespace = ' ';

function processComplexDoc(
    fragments: string[],
    commands: [IndentInfo, Document][],
    options: Options,
    indent: IndentInfo,
    doc: Concat | Indent | Line
): void {
    switch (doc.type) {
        case 'concat': {
            for (let i = doc.parts.length - 1; i >= 0; i--) {
                commands.push([indent, doc.parts[i]]);
            }
            break;
        }
        case 'indent': {
            commands.push([addIndent(indent, options), doc.content]);
            break;
        }
        case 'line': {
            // trim trailing whitespace of previous line
            if (TRAILING_WHITESPACE_PATTERN.test(fragments[fragments.length - 1])) {
                fragments[fragments.length - 1] = fragments[fragments.length - 1].replace(
                    TRAILING_WHITESPACE_PATTERN,
                    '\n'
                );
            }
            if (doc.hard) {
                fragments.push(newLine + indent.value);
            } else {
                fragments.push(whitespace);
            }
            break;
        }
        default:
    }
}

function addIndent(indent: IndentInfo, options: Options): IndentInfo {
    return generateIndent(indent, 1, options);
}
function generateIndent(indent: IndentInfo, change: number, options: Options): IndentInfo {
    const level = indent.level + change;
    let value = '';
    let length = 0;

    for (let i = 0; i < level; i++) {
        value += ' '.repeat(options.tabWidth);
        length += options.tabWidth;
    }

    return { value, length, level };
}
