// provides a "language" according to the eslint documentation (see https://eslint.org/docs/latest/extend/languages) to deal with fiori elements apps
// in contrast to usual eslint languages, this one does not deal only with one file but with a set of files belonging to one app (e.g. manifest.json, annotations, ...)

import { pathToFileURL } from 'node:url';
import type { File, Language, LanguageContext, LanguageOptions, OkParseResult, ParseResult } from '@eslint/core';

import type { AnyNode, DocumentNode } from '@humanwhocodes/momoa';
import { visitorKeys as jsonVisitorKeys, parse as parseJson } from '@humanwhocodes/momoa';

import type { DocumentCstNode } from '@xml-tools/parser';
import { parse as parseXml } from '@xml-tools/parser';
import { buildAst } from '@xml-tools/ast';
import type { XMLAstNode, XMLDocument, XMLToken } from '@xml-tools/ast';
import type { AnnotationFile, AnyNode as AnyAnnotationNode } from '@sap-ux/odata-annotation-core';
import { ANNOTATION_FILE_TYPE } from '@sap-ux/odata-annotation-core';
import { normalizePath } from '@sap-ux/project-access';

import { FioriJSONSourceCode } from './json/source-code';
import { FioriXMLSourceCode, visitorKeys as xmlVisitorKeys } from './xml/source-code';
import { ProjectContext } from '../project-context/project-context';
import { FioriAnnotationSourceCode, visitorKeys as annotationVisitorKeys } from './annotations/source-code';
import { DiagnosticCache } from './diagnostic-cache';

export type FioriLanguageOptions = {};
export type FioriSourceCode = FioriJSONSourceCode | FioriXMLSourceCode | FioriAnnotationSourceCode;
export type RootNode = DocumentNode | XMLDocument;
export type Node = AnyNode | XMLAstNode | XMLToken | AnyAnnotationNode;

export type FioriParseResultAst = {
    context: ProjectContext;

    document:
        | {
              type: 'json';
              root: DocumentNode;
          }
        | {
              type: 'xml';
              root: XMLDocument;
          }
        | {
              type: 'annotation';
              root: AnnotationFile;
          };
};

/**
 *
 */
export class FioriLanguage
    implements
        Language<{
            LangOptions: FioriLanguageOptions;
            Code: FioriSourceCode;
            RootNode: FioriParseResultAst;
            Node: Node;
        }>
{
    fileType = 'text' as const;
    lineStart = 1 as const;
    columnStart = 1 as const;
    nodeTypeKey = 'type';

    constructor() {}
    /**
     *
     * @param _languageOptions
     */
    validateLanguageOptions(_languageOptions: FioriLanguageOptions): void {}

    visitorKeys = { ...xmlVisitorKeys, ...Object.fromEntries([...jsonVisitorKeys]), ...annotationVisitorKeys };

    /**
     *
     * @param file
     * @param _context
     * @returns
     */
    parse(file: File, _context: LanguageContext<FioriLanguageOptions>): ParseResult<FioriParseResultAst> {
        const text = typeof file.body === 'string' ? file.body : new TextDecoder().decode(file.body);
        const path = normalizePath(file.path);
        const uri = pathToFileURL(path).toString();
        // currently this does not work well in ESLint extension,
        // because it triggers this on window focus change and cache is cleared even though file hasn't change
        // similar problem is also with project context update in general
        DiagnosticCache.clear(uri);
        const projectContext = ProjectContext.updateFile(uri, text);
        const document = projectContext.index.documents[uri];
        if (!document) {
            if (path.endsWith('.xml')) {
                try {
                    const { cst, tokenVector } = parseXml(text);
                    const ast = buildAst(cst as DocumentCstNode, tokenVector);
                    return {
                        ok: true,
                        ast: {
                            context: projectContext,
                            document: {
                                type: 'xml',
                                root: ast
                            }
                        }
                    };
                } catch (e) {
                    return {
                        ok: false,
                        errors: [
                            {
                                line: 0,
                                column: 0,
                                message: `Failed to parse XML file ${path}: ${(e as Error).message}`
                            }
                        ]
                    };
                }
            }
            if (path.endsWith('.json')) {
                return {
                    ok: true,
                    ast: {
                        context: projectContext,
                        document: {
                            type: 'json',
                            root: parseJson(text, {
                                mode: 'json',
                                ranges: true,
                                tokens: true,
                                allowTrailingCommas: false
                            })
                        }
                    }
                };
            }
            if (path.endsWith('.cds')) {
                // TODO: add warning for orphaned cds files
                // we're not checking files that are not part of a fiori app, but we don't want to throw either?
                // other option is to let user add such files to ignore list in eslint config
                return {
                    ok: true,
                    ast: {
                        context: projectContext,
                        document: {
                            type: 'annotation',
                            root: {
                                type: 'annotation-file',
                                references: [],
                                targets: [],
                                uri
                            }
                        }
                    }
                };
            }
            return {
                ok: false,
                errors: [
                    {
                        line: 0,
                        column: 0,
                        message: `File ${path} is not part of a Fiori project or could not be indexed.`
                    }
                ]
            };
        }
        if (document.type === 'Document') {
            return {
                ok: true,
                ast: {
                    context: projectContext,
                    document: {
                        type: 'json',
                        root: document
                    }
                }
            };
        } else if (document.type === 'XMLDocument') {
            return {
                ok: true,
                ast: {
                    context: projectContext,
                    document: {
                        type: 'xml',
                        root: document
                    }
                }
            };
        } else if (document.type === ANNOTATION_FILE_TYPE) {
            return {
                ok: true,
                ast: {
                    context: projectContext,
                    document: {
                        type: 'annotation',
                        root: document
                    }
                }
            };
        }
        throw new Error('Unsupported document type');
    }

    /**
     * Creates SourceCode object that ESLint uses to work with a file.
     *
     * @param file - The file to create SourceCode for.
     * @param parseResult - The result of parsing the file.
     * @returns A SourceCode instance.
     */
    createSourceCode(file: File, parseResult: OkParseResult<FioriParseResultAst>): FioriSourceCode {
        const text = typeof file.body === 'string' ? file.body : new TextDecoder().decode(file.body);
        const document = parseResult.ast.document;
        if (document.type === 'json') {
            // Return a minimal SourceCode object as a placeholder
            return new FioriJSONSourceCode({
                text,
                ast: document.root,
                projectContext: parseResult.ast.context
            });
        } else if (document.type === 'xml') {
            return new FioriXMLSourceCode({
                text,
                ast: document.root,
                projectContext: parseResult.ast.context
            });
        } else if (document.type === 'annotation') {
            return new FioriAnnotationSourceCode({
                text,
                ast: document.root,
                projectContext: parseResult.ast.context
            });
        }
        throw new Error('Unsupported parse result AST type');
    }

    defaultLanguageOptions?: LanguageOptions | undefined;

    //matchesSelectorClass(className: string, node: unknown, ancestry: unknown[]): boolean {}

    //normalizeLanguageOptions(languageOptions: LanguageOptions): LanguageOptions {}
}
