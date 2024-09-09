import { promises } from 'fs';
import { join } from 'path';
import type { Diagnostic, Element } from '@sap-ux/odata-annotation-core';
import type { AnnotationGroup, Annotation } from '@sap-ux/cds-annotation-parser';
import { deserialize } from './deserialize-ast';
import { createCdsCompilerFacadeForRoot, getCdsFiles } from '@sap/ux-cds-compiler-facade';
import type { CdsCompilerFacade } from '@sap/ux-cds-compiler-facade';

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

export const getCDSCompilerFacade = async (projectRootFolder: string): Promise<CdsCompilerFacade> => {
    const files = await getCdsFiles(projectRootFolder);
    return createCdsCompilerFacadeForRoot(projectRootFolder, files);
};
