import { promises, readdirSync, stat, statSync } from 'fs';
import { join, dirname } from 'path';
import { platform } from 'os';
import type { IToken, CstNode, CstNodeLocation, CstElement } from 'chevrotain';
import type { DeclarationCstNode } from '../../src/parser/parser';
import type { Annotation, AnnotationGroup } from '../../src/transformer/annotationAstNodes';
import { hasNaNOrUndefined } from '../../src/utils';
import { deserialize } from './deserialize-ast';

const { readFile } = promises;

export const getBase = () => join(__dirname, '..', 'data');

const getFileContent = async (filePath: string) => {
    const buffer = await readFile(filePath, 'utf8');
    return buffer.toString();
};

export const getAssignment = async (testCasePath: string) => {
    const path = join(getBase(), testCasePath, 'assignment.txt');
    return getFileContent(path);
};

export const getCst = async (testCasePath: string): Promise<DeclarationCstNode> => {
    const path = join(getBase(), testCasePath, 'cst.json');
    const content = await getFileContent(path);
    return deserialize<DeclarationCstNode>(content);
};

export const getAst = async (testCasePath: string): Promise<Annotation | AnnotationGroup | undefined> => {
    const path = join(getBase(), testCasePath, 'ast.json');
    const content = await getFileContent(path);
    if (content === 'undefined\n') {
        return undefined;
    }
    return deserialize<Annotation | AnnotationGroup>(content);
};

const isCstNode = (node: CstNode | IToken): node is CstNode => {
    return (node as CstNode).children !== undefined;
};
const reduceLocationInfo = (location?: CstNodeLocation): void => {
    if (location) {
        if (hasNaNOrUndefined(location.startOffset)) {
            location.startOffset = -1;
        }

        if (hasNaNOrUndefined(location.endOffset)) {
            location.endOffset = -1;
        }
        //@ts-ignore
        delete location.startLine;
        delete location.endLine;
        delete location.startColumn;
        delete location.endColumn;
    }
};

const reduceTokenInfo = (token: IToken): void => {
    if (hasNaNOrUndefined(token.startOffset)) {
        token.startOffset = -1;
    }

    if (hasNaNOrUndefined(token.endOffset)) {
        token.endOffset = -1;
    }
    /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
    (token as any).tokenTypeName = token.tokenType.name;
    delete token.startLine;
    delete token.endLine;
    delete token.startColumn;
    delete token.endColumn;
    //@ts-ignore
    delete token.tokenTypeIdx;
    //@ts-ignore
    delete token.tokenType;
};
export const transformCstForAssertion = (node: CstNode | IToken): void => {
    if (isCstNode(node)) {
        reduceLocationInfo(node.location);
        const allChildren = Object.keys(node.children).reduce(
            (acc: CstElement[], child) => [...acc, ...(node.children[child] ?? [])],
            []
        );
        for (const child of allChildren) {
            transformCstForAssertion(child);
        }
    } else if (typeof node.image === 'string') {
        reduceTokenInfo(node);
    } else {
        throw Error('None Exhaustive Match');
    }
};

export const getAllNormalizeFolderPath = (base = getBase(), allFolderPath: string[] = []): string[] => {
    const fileOrFolder = readdirSync(base);
    fileOrFolder.forEach(function (item: string) {
        const itemPath = join(base, item);
        if (statSync(itemPath).isDirectory()) {
            allFolderPath = getAllNormalizeFolderPath(itemPath, allFolderPath);
        } else {
            if (itemPath.endsWith('.txt')) {
                const dirPath = dirname(itemPath);
                const relativeLike = dirPath.split(getBase())[1];
                const normalizedPath = relativeLike.replace(platform() === 'win32' ? /\\/g : /\//g, '/');
                allFolderPath.push(normalizedPath);
            }
        }
    });

    return allFolderPath;
};

export const doesExits = (path) => {
    return new Promise((resolve) => {
        stat(path, (err) => {
            if (err) {
                resolve(false);
            }
            resolve(true);
        });
    });
};
