import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';

import type { RuleTester } from 'eslint';

import type { Manifest } from '@sap-ux/project-access';
import { getNodeModulesPath, normalizePath } from '@sap-ux/project-access';

import { ProjectContext } from '../src/project-context/project-context';
import { platform } from 'node:os';
import { spawnSync } from 'node:child_process';

export interface FileChange {
    filename: string;
    code: string;
}

const ROOT = join(__dirname, '..');

// XML V4
export const V4_PROJECT_PATH = join(ROOT, 'test', 'data', 'v4-xml-start');
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

// CAP
export const CAP_PROJECT_PATH = join(ROOT, 'test', 'data', 'cap-start');
export const CAP_APP_PATH = join(CAP_PROJECT_PATH, 'app', 'incidents');
export const CAP_MANIFEST_PATH = join(CAP_APP_PATH, 'webapp', 'manifest.json');
export const CAP_MANIFEST = Object.freeze(JSON.parse(readFileSync(CAP_MANIFEST_PATH, 'utf-8'))) as Manifest;
export const CAP_ANNOTATIONS_PATH = join(CAP_APP_PATH, 'annotations.cds');
export const CAP_METADATA_PATH = join(CAP_PROJECT_PATH, 'srv', 'incidentservice.cds');
export const CAP_ANNOTATIONS = readFileSync(CAP_ANNOTATIONS_PATH, 'utf-8');
export const CAP_FACETS_ANNOTATIONS = `
annotate service.Incidents with @(
    UI.Facets         : [{
        $Type : 'UI.ReferenceFacet',
        Target: 'incidentFlow/@UI.LineItem#table_section',
        Label : 'table_section',
        ID    : 'table_section',
    }, ],
);

annotate service.IncidentFlow with @(UI.LineItem #table_section: [
    {
        $Type : 'UI.DataField',
        Value : id,
        Label : 'id',
    },
    {
        $Type : 'UI.DataField',
        Value : criticality,
        Label : 'criticality',
    }
]);
`;

// XML V2
export const V2_PROJECT_PATH = join(ROOT, 'test', 'data', 'v2-xml-start');
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

const cdsModuleInstalled = (root: string): boolean => {
    const modulePath = join(root, 'node_modules');
    const result = existsSync(modulePath);
    if (result) {
        const cdsModulePath = getNodeModulesPath(root, '@sap/cds');
        if (!cdsModulePath) {
            return false;
        }
        if (existsSync(cdsModulePath)) {
            return true;
        }
        return false;
    }
    return false;
};

export function npmInstall(projectPath: string, checkCds = true): void {
    if (checkCds && cdsModuleInstalled(projectPath)) {
        console.log(`@sap/cds module found. Skipping package install in ${projectPath}.`);
        return;
    }
    console.log(`Installing packages in ${projectPath}.`);
    const cmd = platform() === 'win32' ? `npm.cmd` : 'npm';
    const npm = spawnSync(cmd, ['install', '--ignore-engines'], {
        cwd: projectPath,
        env: process.env,
        shell: true,
        stdio: 'inherit',
        timeout: 5 * 60000
    });

    if (npm.error) {
        fail(`Error: ${npm.error.message}`);
    } else if (npm.status !== 0) {
        console.log(`npm process exited with code ${npm.status}`);
    } else {
        console.log(`Package installed successfully in ${projectPath}`);
    }
}

export function setup(name: string, capAppPath?: string) {
    const lookup: Record<string, { changes: FileChange[]; filename: string }> = {};
    if (capAppPath) {
        // install relevant cds-dk for cds compilation
        npmInstall(CAP_PROJECT_PATH);
    }

    function createTestFunction<T extends { name: string; filename: string }>(prefix: string) {
        return function (testCode: T, changes: FileChange[]): T {
            const key = [name, prefix, testCode.name].join(' ');
            lookup[key] = { changes, filename: testCode.filename };
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
        const { changes = [], filename } = lookup[key] ?? [];
        const projectCwdCap = capAppPath && CAP_PROJECT_PATH;
        const projectCwdXml = filename?.includes(V4_PROJECT_PATH) ? V4_PROJECT_PATH : V2_PROJECT_PATH;
        const cwd = projectCwdCap ?? projectCwdXml;
        jest.spyOn(process, 'cwd').mockReturnValue(cwd);
        for (const change of changes) {
            const path = normalizePath(change.filename);
            const uri = pathToFileURL(path).toString();
            ProjectContext.updateFile(uri, change.code);
        }
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    return {
        createValidTest: createTestFunction<RuleTester.ValidTestCase & { name: string; filename: string }>('valid'),
        createInvalidTest: createTestFunction<RuleTester.InvalidTestCase & { name: string; filename: string }>(
            'invalid'
        )
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
