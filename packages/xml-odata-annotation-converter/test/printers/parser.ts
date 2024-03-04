import type { IToken } from 'chevrotain';
import type { XMLDocument } from '@xml-tools/ast';
import { buildAst } from '@xml-tools/ast';
import type { DocumentCstNode } from '@xml-tools/parser';
import { parse as parseInternal } from '@xml-tools/parser';

export const parse = (text: string): { ast: XMLDocument; cst: DocumentCstNode; tokenVector: IToken[] } => {
    const { cst, tokenVector } = parseInternal(text);
    const ast = buildAst(cst as DocumentCstNode, tokenVector);
    return {
        ast,
        cst: cst as DocumentCstNode,
        tokenVector
    };
};
