import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { findFioriArtifacts, FoundFioriArtifacts, normalizePath } from '@sap-ux/project-access';

import {
    FeV2ListReport,
    FeV2ObjectPage,
    LinkedFeV2App,
    runFeV2Linker
} from '../../../src/project-context/linker/fe-v2';
import { LinkerContext } from '../../../src/project-context/linker/types';
import { ApplicationParser } from '../../../src/project-context/parser';

const parser = new ApplicationParser();

interface TestOptions {
    manifestChanges?: ManifestChange[];
}

interface ManifestChange {
    path: string[];
    value: unknown;
}

function applyManifestChange(manifest: any, change: ManifestChange): void {
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

describe('FE V2 Linker', () => {
    let artifacts: FoundFioriArtifacts;
    const fileCache = new Map<string, string>();
    const root = join(__dirname, '..', '..', 'data', 'v2-xml-start');
    beforeAll(async () => {
        artifacts = await findFioriArtifacts({
            wsFolders: [root],
            artifacts: ['applications', 'adaptations']
        });
        const files = [join('annotations', 'annotation.xml'), join('localService', 'metadata.xml'), 'manifest.json'];
        for (const file of files) {
            const absolutePath = normalizePath(join(root, 'webapp', file));
            const content = await readFile(absolutePath, 'utf-8');
            const uri = pathToFileURL(absolutePath).toString();
            fileCache.set(uri, content);
        }
    });

    async function setup(options?: TestOptions): Promise<LinkerContext> {
        const testCache = new Map<string, string>(fileCache);
        if (options?.manifestChanges) {
            const absolutePath = normalizePath(join(root, 'webapp', 'manifest.json'));
            const uri = pathToFileURL(absolutePath).toString();
            const manifestText = fileCache.get(uri)!;
            const manifestObject = JSON.parse(manifestText);
            for (const change of options?.manifestChanges) {
                applyManifestChange(manifestObject, change);
            }
            testCache.set(uri, JSON.stringify(manifestObject, null, 4));
        }
        const model = parser.parse('EDMXBackend', artifacts, testCache);

        const app = model.index.apps[Object.keys(model.index.apps)[0]];
        return {
            app,
            diagnostics: []
        };
    }
    function findListPage(app: LinkedFeV2App): FeV2ListReport {
        for (const page of app.pages) {
            if (
                page.componentName === 'sap.suite.ui.generic.template.AnalyticalListPage' ||
                page.componentName === 'sap.suite.ui.generic.template.ListReport'
            ) {
                return page;
            }
        }
        throw new Error('ListPage not found');
    }
    function findObjectPage(app: LinkedFeV2App, index = 0): FeV2ObjectPage {
        let i = 0;
        for (const page of app.pages) {
            if (page.componentName === 'sap.suite.ui.generic.template.ObjectPage') {
                if (i === index) {
                    return page;
                }
                i++;
            }
        }
        throw new Error('ObjectPage not found');
    }

    describe('linkTableSettings', () => {
        test('createMode setting default value', async () => {
            const context = await setup();

            const result = runFeV2Linker(context);

            const page = findObjectPage(result);
            const table = page.lookup['table'];
            expect(table).toHaveLength(1);
            expect(table![0].configuration.createMode).toBe(undefined);
            expect(table![0].resolvedConfiguration.createMode).toBe('inline');
        });

        test('createMode setting', async () => {
            const context = await setup({
                manifestChanges: [
                    {
                        path: [
                            'sap.ui.generic.app',
                            'pages',
                            'AnalyticalListPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'pages',
                            'ObjectPage|Z_SEPMRA_SO_SALESORDERANALYSIS',
                            'component',
                            'settings',
                            'sections',
                            'to_Product::com.sap.vocabularies.UI.v1.LineItem',
                            'createMode'
                        ],
                        value: 'newPage'
                    }
                ]
            });

            const result = runFeV2Linker(context);

            const page = findObjectPage(result);
            const table = page.lookup['table'];
            expect(table).toHaveLength(1);
            expect(table![0].configuration.createMode).toBe('newPage');
            expect(table![0].resolvedConfiguration.createMode).toBe('newPage');
        });

        test('createMode setting list report', async () => {
            const context = await setup();

            const result = runFeV2Linker(context);

            const page = findListPage(result);
            const table = page.lookup['table'];
            expect(table).toHaveLength(1);
            expect(table![0].configuration.createMode).toBe(undefined);
            expect(table![0].resolvedConfiguration.createMode).toBe('inline');
        });
    });
});
