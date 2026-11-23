import type { ProjectContext } from '../../../src/project-context/project-context.js';
import { FioriI18nSourceCode, parseI18nToAst } from '../../../src/language/i18n/source-code.js';
import { STEP_PHASE } from '../../../src/language/i18n/traversal-step.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const DUMMY_PROJECT_CONTEXT: ProjectContext = {} as any;
const DUMMY_URI = 'file:///project/webapp/i18n/i18n.properties';

const SAMPLE_TEXT = [
    '# Application texts',
    '',
    'appTitle=My Application',
    '!skip this',
    'appDescription=An SAP Fiori app.'
].join('\n');

describe('FioriI18nSourceCode', () => {
    it('should create an instance with correct text, ast and projectContext', () => {
        const ast = parseI18nToAst(SAMPLE_TEXT);
        const sourceCode = new FioriI18nSourceCode({
            text: SAMPLE_TEXT,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: DUMMY_URI
        });

        expect(sourceCode.text).toBe(SAMPLE_TEXT);
        expect(sourceCode.ast).toBe(ast);
        expect(sourceCode.projectContext).toBe(DUMMY_PROJECT_CONTEXT);
        expect(sourceCode.uri).toBe(DUMMY_URI);
    });

    it('should parse entries and skip comments and empty lines', () => {
        const ast = parseI18nToAst(SAMPLE_TEXT);
        expect(ast.type).toBe('i18n-document');
        expect(ast.entries).toHaveLength(2);
        expect(ast.entries[0]).toMatchObject({
            type: 'i18n-entry',
            key: {
                range: {
                    end: {
                        column: 8,
                        line: 3
                    },
                    start: {
                        column: 1,
                        line: 3
                    }
                },
                value: 'appTitle'
            },
            value: {
                range: {
                    end: {
                        column: 24,
                        line: 3
                    },
                    start: {
                        column: 10,
                        line: 3
                    }
                },
                value: 'My Application'
            }
        });
        expect(ast.entries[1]).toMatchObject({
            type: 'i18n-entry',
            key: {
                range: {
                    end: {
                        column: 14,
                        line: 5
                    },
                    start: {
                        column: 1,
                        line: 5
                    }
                },
                value: 'appDescription'
            },
            value: {
                range: {
                    end: {
                        column: 33,
                        line: 5
                    },
                    start: {
                        column: 16,
                        line: 5
                    }
                },
                value: 'An SAP Fiori app.'
            }
        });
    });

    it('should record correct line numbers on entries', () => {
        const ast = parseI18nToAst(SAMPLE_TEXT);
        // SAMPLE_TEXT: line 1 = comment, line 2 = empty, line 3 = appTitle, line 5 = appDescription
        expect(ast.entries[0].value.range.start.line).toBe(3);
        expect(ast.entries[1].value.range.start.line).toBe(5);
    });

    it('should return correct location for an entry node', () => {
        const ast = parseI18nToAst(SAMPLE_TEXT);
        const sourceCode = new FioriI18nSourceCode({
            text: SAMPLE_TEXT,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: DUMMY_URI
        });

        const loc = sourceCode.getLoc(ast.entries[0]);
        expect(loc.start.line).toBe(3);
        expect(loc.start.column).toBe(10);
    });

    it('should return correct location for the document node', () => {
        const ast = parseI18nToAst(SAMPLE_TEXT);
        const sourceCode = new FioriI18nSourceCode({
            text: SAMPLE_TEXT,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: DUMMY_URI
        });

        const loc = sourceCode.getLoc(ast);
        expect(loc.start.line).toBe(1);
    });

    it('should traverse the i18n AST in ENTER/EXIT order', () => {
        const ast = parseI18nToAst(SAMPLE_TEXT);
        const sourceCode = new FioriI18nSourceCode({
            text: SAMPLE_TEXT,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: DUMMY_URI
        });

        const steps = Array.from(sourceCode.traverse());
        const enterTypes = steps.filter((step) => step.phase === STEP_PHASE.ENTER).map((step) => step.target.type);

        expect(enterTypes).toEqual(['i18n-document', 'i18n-entry', 'i18n-entry']);
    });

    it('should produce ENTER and EXIT steps for every node', () => {
        const ast = parseI18nToAst(SAMPLE_TEXT);
        const sourceCode = new FioriI18nSourceCode({
            text: SAMPLE_TEXT,
            ast,
            projectContext: DUMMY_PROJECT_CONTEXT,
            uri: DUMMY_URI
        });

        const steps = Array.from(sourceCode.traverse());
        const enterCount = steps.filter((s) => s.phase === STEP_PHASE.ENTER).length;
        const exitCount = steps.filter((s) => s.phase === STEP_PHASE.EXIT).length;

        expect(enterCount).toBe(exitCount);
        // 1 document + 2 entries
        expect(enterCount).toBe(3);
    });

    it('should handle empty .properties file', () => {
        const ast = parseI18nToAst('');
        expect(ast.entries).toHaveLength(0);
        expect(ast.type).toBe('i18n-document');
    });

    it('should strip leading whitespace after = and adjust column offset', () => {
        // "key =  value" — 1 trailing space before =, 2 spaces before "value"
        const ast = parseI18nToAst('key =  value');
        expect(ast.entries).toHaveLength(1);
        const entry = ast.entries[0];
        // key: trimmed.slice(0,4)="key ", trimEnd()="key", keyTrailingSpaces=1 → end col = 0+4-1=3
        expect(entry.key.value).toBe('key');
        expect(entry.key.range.start.column).toBe(1);
        expect(entry.key.range.end.column).toBe(3);
        // value: valueStartIdx=5, valueOffset=2 → start col = 0+5+2+1=8, end = 8+5=13
        expect(entry.value.value).toBe('value');
        expect(entry.value.range.start.column).toBe(8);
        expect(entry.value.range.end.column).toBe(13);
    });

    it('should account for leading whitespace before a key', () => {
        // "       formsSection=forms , section" — 7 leading spaces (as in SAP i18n files)
        const ast = parseI18nToAst('       formsSection=forms , section');
        expect(ast.entries).toHaveLength(1);
        const entry = ast.entries[0];
        expect(entry.key.value).toBe('formsSection');
        // leadingSpaces=7 → start col = 7+1=8, eqIdx=12, no trailing spaces → end col = 7+12=19
        expect(entry.key.range.start.column).toBe(8);
        expect(entry.key.range.end.column).toBe(19);
        expect(entry.value.value).toBe('forms , section');
        // valueStartIdx=13, valueOffset=0 → start col = 7+13+0+1=21, end = 21+15=36
        expect(entry.value.range.start.column).toBe(21);
        expect(entry.value.range.end.column).toBe(36);
    });

    it('should skip SAP annotation comment and correctly parse indented key on next line', () => {
        const text = ['#XFLD,50: Label for a section', '       formsSection=forms , section'].join('\n');
        const ast = parseI18nToAst(text);
        expect(ast.entries).toHaveLength(1);
        const entry = ast.entries[0];
        // comment on line 1 is skipped; entry is on line 2
        expect(entry.key.range.start.line).toBe(2);
        expect(entry.key.value).toBe('formsSection');
        expect(entry.key.range.start.column).toBe(8);
        expect(entry.key.range.end.column).toBe(19);
        expect(entry.value.value).toBe('forms , section');
        expect(entry.value.range.start.column).toBe(21);
        expect(entry.value.range.end.column).toBe(36);
    });
});
