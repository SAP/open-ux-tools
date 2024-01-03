import { promises } from 'fs';
import { join, relative } from 'path';
import { default as cds } from '@sap/cds';
import type { Diagnostic, Element } from '@sap-ux/odata-annotation-core';
import * as projectAccess from '@sap-ux/project-access';
import type { AnnotationGroup, Annotation } from '@sap/ux-cds-annotation-parser';
import { getFileObj } from './testUtils/file-access';
import { deserialize } from './deserialize-ast';
import { getCdsArtifacts } from '@sap/ux-cds-compiler-facade';
import type { CdsArtifactsType, File } from '@sap/ux-cds-compiler-facade';

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
    cdsServiceName: string,
    additionalFilesToLoad: string[] = []
): Promise<{
    projectRoot: string;
    cdsArtifacts: CdsArtifactsType;
    fileCache: Map<string, File>;
}> => {
    const projectRoot: string = projectRootFolder;
    const project = {
        root: projectRoot
    };
    const roots = await projectAccess.getCdsRoots(projectRoot);
    const resolvedRoots = cds.resolve(roots ?? []);
    const cdsFiles = resolvedRoots?.map((uri) => relative(projectRoot, uri));
    let fileCache: Map<string, File> = new Map();
    if (cdsFiles) {
        const fileList = [...cdsFiles, ...additionalFilesToLoad.filter((f) => !cdsFiles.includes(f))];
        fileCache = (await Promise.all(fileList.map((f) => getFileObj(projectRoot, f)))).reduce((acc, file) => {
            acc.set(file.fileUri, file);
            return acc;
        }, new Map<string, File>());
    }
    const cdsArtifacts = await getCdsArtifacts(project as unknown as any, cdsServiceName, roots, fileCache);
    //setProjectFileSequence(projectProvider, cdsArtifacts.fileSequence, cdsServiceName, cdsAppName);

    return { projectRoot, cdsArtifacts, fileCache };
};

// const setProjectFileSequence = (
//     provider: projectAccess.ProjectProvider,
//     fileSequence: string[],
//     cdsServiceName: string,
//     cdsAppName: string
// ): void => {
//     const project = provider.project;
//     project.apps[cdsAppName] = project.apps[cdsAppName] || {
//         manifest: '',
//         changes: '',
//         mainService: '',
//         services: {}
//     };
//     project.apps[cdsAppName].services[cdsServiceName] = project.apps[cdsAppName].services[cdsServiceName] || {};
//     project.apps[cdsAppName].annotations = {};
//     project.apps[cdsAppName].annotations[cdsServiceName] = fileSequence; // all cds files can contain annotations
// };
