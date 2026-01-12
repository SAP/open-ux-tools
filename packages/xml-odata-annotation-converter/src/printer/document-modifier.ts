/* eslint-disable @typescript-eslint/no-use-before-define */
import type { XMLElement } from '@xml-tools/ast';
import type { Element, FormatterOptions } from '@sap-ux/odata-annotation-core';
import { EDMX_NAMESPACE_ALIAS, EDM_NAMESPACE_ALIAS, TextEdit, Position } from '@sap-ux/odata-annotation-core';
import type { PrintContext, NamespaceAliasMap } from './csdl-to-xml';
import { printCsdlNodeToXmlString } from './csdl-to-xml';
import type { doc } from 'prettier';
import { EDMX_V4_NAMESPACE, EDM_V4_NAMESPACE } from './namespaces';

export const insert =
    (options: FormatterOptions) =>
    (target: XMLElement, element: Element): TextEdit | undefined =>
        insertWithOptions(target, element, options);

export const insertWithOptions = (
    target: XMLElement,
    element: Element,
    { printWidth, tabWidth, useTabs }: FormatterOptions
): TextEdit | undefined => {
    let result;
    const prettierOptions: doc.printer.Options = {
        printWidth,
        useTabs,
        tabWidth
    };
    if (target.syntax.openBody) {
        const startColumn = target.syntax.openBody.startColumn - 1;
        const targetCursorIndentLevel = startColumn === 0 ? 0 : startColumn / tabWidth;
        const namespaces = target.namespaces && createNamespaceAliasMap(target);
        const printContext: PrintContext = {
            cursorIndentLevel: targetCursorIndentLevel + 1,
            namespaces
        };
        const textParts = ['\n', printCsdlNodeToXmlString(element, prettierOptions, printContext)];
        const text = String.prototype.concat.apply('', textParts);
        result = TextEdit.insert(
            Position.create(
                target.syntax.openBody.endLine - 1, // -1 because chevrotain is 1 based,
                target.syntax.openBody.endColumn // -1 chevrotain offset + 1 next symbol after closing bracket
            ),
            text
        );
    }
    return result;
};

const createNamespaceAliasMap = (element: XMLElement): NamespaceAliasMap =>
    Object.keys(element.namespaces).reduce((map: { [namespace: string]: string }, prefix) => {
        const namespace = element.namespaces[prefix];
        switch (namespace) {
            case EDMX_V4_NAMESPACE: {
                map[EDMX_NAMESPACE_ALIAS] = prefix;
                break;
            }
            case EDM_V4_NAMESPACE: {
                map[EDM_NAMESPACE_ALIAS] = prefix;
                break;
            }
            default:
                return map;
        }
        return map;
    }, {});
