import { promises } from 'fs';
import { join, relative } from 'path';
import type { Diagnostic, Element } from '@sap-ux/odata-annotation-core';
import * as projectAccess from '@sap-ux/project-access';
import type { AnnotationGroup, Annotation } from '@sap-ux/cds-annotation-parser';
import { deserialize } from './deserialize-ast';
import { createCdsCompilerFacadeForRoot } from '@sap/ux-cds-compiler-facade';
import type { CdsCompilerFacade, File, MetadataElementMap } from '@sap/ux-cds-compiler-facade';
import { pathToFileURL } from 'url';

export const getFileObj = async (root: string, fileUri: string): Promise<File> => {
    const fileContentBuffer = await promises.readFile(join(root, fileUri));
    const fileContent = fileContentBuffer.toString('utf-8'); // Convert Buffer to string
    return { fileUri: pathToFileURL(join(root, fileUri)).toString(), fileContent };
};

export type TestCaseName =
    | 'json'
    | 'apply'
    | 'annotation-container'
    | 'group'
    | 'top-level-line-item'
    | 'chart'
    | 'paths'
    | 'numbers'
    | 'enum'
    | 'multi-line-string'
    | 'multi-line-string-strip-indent'
    | 'top-level-empty-value'
    | 'bracket-matching'
    | 'record'
    | 'record-annotation'
    | 'flatten-headerInfo'
    | 'flatten-embedded-annotation'
    | 'flattened-property-segment'
    | 'property-annotation'
    | 'property-annotation-value-case-issue'
    | 'open-type-property'
    | 'timestamp'
    | 'side-effects-target-properties'
    | 'navigation-path'
    | 'side-effects-flat'
    | 'array-spread-operator'
    | 'nested-record-type'
    | 'expression';

const { readFile } = promises;

const ROOT = join(__dirname, 'data', 'parser');

const getDeserializer =
    <T>(fileName: string) =>
    async (name: TestCaseName): Promise<T> => {
        const path = join(ROOT, name, fileName);
        const buffer = await readFile(path, 'utf8');
        const compact = buffer.toString();
        return deserialize<T>(compact);
    };

export const getAst = getDeserializer<AnnotationGroup | Annotation>('ast.json');
export const getTerm = getDeserializer<Element>('generic.json');
export const getDiagnostics = getDeserializer<Diagnostic[]>('diagnostics.json');
export const getPaths = getDeserializer<string[]>('paths.json');

export const prepare = async (
    projectRootFolder: string,
    additionalFilesToLoad: string[] = []
): Promise<CdsCompilerFacade> => {
    const projectRoot: string = projectRootFolder;
    const roots = await projectAccess.getCdsRoots(projectRoot);
    const cdsFiles = (roots ?? [])?.map((uri) => relative(projectRoot, uri));
    let fileCache: Map<string, string> = new Map();
    if (cdsFiles) {
        const fileList = [...cdsFiles, ...additionalFilesToLoad.filter((f) => !cdsFiles.includes(f))];
        fileCache = (await Promise.all(fileList.map((f) => getFileObj(projectRoot, f)))).reduce((acc, file) => {
            acc.set(file.fileUri, file.fileContent);
            return acc;
        }, new Map<string, string>());
    }
    const cdsCompilerFacade = await createCdsCompilerFacadeForRoot(projectRoot, roots, fileCache);
    return cdsCompilerFacade;
};
