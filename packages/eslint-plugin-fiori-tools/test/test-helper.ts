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
export const V4_ANNOTATIONS = readFileSync(V4_ANNOTATIONS_PATH, 'utf-8');

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
            const path = normalizePath(join(ROOT, change.filename));
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

let id = 0;
export function getManifestAsCode(manifest: any, change: ManifestChange): string {
    const clone = structuredClone(manifest);
    applyManifestChange(clone, change);
    // force eslint to treat each manifest as unique test case
    id++;
    clone['__test_id'] = `test-id-${id}`;
    return JSON.stringify(clone, undefined, 2);
}

export function getAnnotationsAsXmlCode(annotations: string, newAnnotations: string): string {
    return annotations.replace('</Schema>', `${newAnnotations}\n</Schema>`);
}
