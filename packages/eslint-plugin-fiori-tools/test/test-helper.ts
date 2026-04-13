import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

import type { RuleTester } from 'eslint';

import type { Manifest } from '@sap-ux/project-access';
import { normalizePath } from '@sap-ux/project-access';

import { ProjectContext } from '../src/project-context/project-context';

export interface FileChange {
    filename: string;
    code: string;
}

const ROOT = join(__dirname, '..');

export const V4_MANIFEST_PATH = join(ROOT, 'test', 'data', 'v4-xml-start', 'webapp', 'manifest.json');
export const V4_MANIFEST = Object.freeze(JSON.parse(readFileSync(V4_MANIFEST_PATH, 'utf-8'))) as Manifest;
export const V4_ANNOTATIONS_PATH = join(
    ROOT,
    'test',
    'data',
    'v4-xml-start',
    'webapp',
    'annotations',
    'annotation.xml'
);
export const V4_METADATA_PATH = join(ROOT, 'test', 'data', 'v4-xml-start', 'webapp', 'localService', 'metadata.xml');
export const V4_ANNOTATIONS = readFileSync(V4_ANNOTATIONS_PATH, 'utf-8');
export const V4_FACETS_ANNOTATIONS = `
            <Annotations Target="IncidentService.Incidents">
                 <Annotation Term="UI.Facets" >
                    <Collection>
                        <Record Type="UI.ReferenceFacet">
                            <PropertyValue Property="ID" String="Products"/>
                            <PropertyValue Property="Label" String="Prducts"/>
                            <PropertyValue Property="Target" AnnotationPath="incidentFlow/@UI.LineItem"/>
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
             <Annotations Target="IncidentService.IncidentFlow">
                 <Annotation Term="UI.LineItem">
                    <Collection>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="processStep" />
                            <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High" />
                        </Record>
                        <Record Type="UI.DataField">
                            <PropertyValue Property="Value" Path="stepStatus" />
                            <Annotation Term="UI.Importance" EnumMember="UI.ImportanceType/High" />
                        </Record>
                    </Collection>
                </Annotation>
            </Annotations>
            `;
export const V4_METADATA = readFileSync(V4_ANNOTATIONS_PATH, 'utf-8');

export const V2_MANIFEST_PATH = join(ROOT, 'test', 'data', 'v2-xml-start', 'webapp', 'manifest.json');
export const V2_MANIFEST = Object.freeze(JSON.parse(readFileSync(V2_MANIFEST_PATH, 'utf-8'))) as Manifest;
export const V2_ANNOTATIONS_PATH = join(
    ROOT,
    'test',
    'data',
    'v2-xml-start',
    'webapp',
    'annotations',
    'annotation.xml'
);
export const V2_ANNOTATIONS = readFileSync(V2_ANNOTATIONS_PATH, 'utf-8');

export function setup(name: string) {
    const lookup: Record<string, FileChange[]> = {};

    function createTestFunction<T extends { name: string }>(prefix: string) {
        return function (testCode: T, changes: FileChange[]): T {
            const key = [name, prefix, testCode.name].join(' ');
            lookup[key] = changes;
            return {
                ...testCode
            };
        };
    }

    beforeEach(() => {
        const key = expect.getState().currentTestName;
        if (!key) {
            return;
        }
        const changes = lookup[key] ?? [];
        for (const change of changes) {
            const path = normalizePath(change.filename);
            const uri = pathToFileURL(path).toString();
            ProjectContext.updateFile(uri, change.code);
        }
    });

    return {
        createValidTest: createTestFunction<RuleTester.ValidTestCase & { name: string }>('valid'),
        createInvalidTest: createTestFunction<RuleTester.InvalidTestCase & { name: string }>('invalid')
    };
}

export interface ManifestChange {
    path: string[];
    value: unknown;
}

export function applyManifestChange(manifest: any, change: ManifestChange): void {
    let current = manifest;

    for (let i = 0; i < change.path.length - 1; i++) {
        const segment = change.path[i];
        if (!(segment in current)) {
            current[segment] = {};
        }
        current = current[segment];
    }
    current[change.path[change.path.length - 1]] = change.value;
}

export function applyXmlAnnotationsChange(current: string, change: string): string {
    return current.replace('</Schema>', change + '</Schema>');
}

export function getManifestAsCode(manifest: any, changes: ManifestChange[]): string {
    const clone = structuredClone(manifest);
    for (const change of changes) {
        applyManifestChange(clone, change);
    }
    return JSON.stringify(clone, undefined, 2);
}

export function getAnnotationsAsXmlCode(annotations: string, newAnnotations: string): string {
    return annotations.replace('</Schema>', `${newAnnotations}\n</Schema>`);
}
