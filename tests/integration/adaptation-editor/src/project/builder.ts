import { mkdir, readFile, rm, writeFile } from 'fs/promises';
import { join } from 'path';

import type { Manifest } from '@sap-ux/project-access';
import { YamlDocument } from '@sap-ux/yaml';
import template from './templates/manifest-fe-v2.json';
import type { FIORI_ELEMENTS_V2, ADP_FIORI_ELEMENTS_V2 } from './projects';
import { existsSync } from 'fs';

export interface ProjectParameters {
    id: string;
    mainServiceUri: string;
    entitySet: string;
}

export const ADAPTATION_EDITOR_PATH = '/adaptation-editor.html';

function getProjectParametersWithDefaults(parameters: ProjectParameters): ProjectParameters {
    return {
        id: parameters.id,
        mainServiceUri: parameters.mainServiceUri ?? `/sap/opu/odata/sap/SERVICE/`,
        entitySet: parameters.entitySet ?? 'RootEntity'
    };
}

export function createV2Manifest(userParameters: ProjectParameters, workerId: string): Manifest {
    const { id, mainServiceUri, entitySet } = getProjectParametersWithDefaults(userParameters);
    const result = structuredClone(template) as Manifest;
    result['sap.app'].id = id + '.' + workerId;
    result['sap.app'].dataSources!.mainService.uri = mainServiceUri;
    result['sap.app'].sourceTemplate!.id = 'preview-middleware-tests';
    result['sap.app'].sourceTemplate!.version = '1.0.0';
    result['sap.app'].sourceTemplate!.toolsId = id;

    result['sap.ui.generic.app']!.pages = {
        [`ListReport|${entitySet}`]: {
            'entitySet': entitySet,
            'component': {
                'name': 'sap.suite.ui.generic.template.ListReport',
                'list': true,
                'settings': {
                    'condensedTableLayout': true,
                    'smartVariantManagement': true,
                    'enableTableFilterInPageVariant': true,
                    'filterSettings': {
                        'dateSettings': {
                            'useDateRange': true
                        }
                    },
                    'tableSettings': {
                        'type': 'ResponsiveTable'
                    }
                }
            },
            'pages': {
                [`ObjectPage|${entitySet}`]: {
                    'entitySet': entitySet,
                    'defaultLayoutTypeIfExternalNavigation': 'MidColumnFullScreen',
                    'component': {
                        'name': 'sap.suite.ui.generic.template.ObjectPage'
                    }
                }
            }
        }
    };

    return result;
}

export async function createYamlFile(
    userParameters: ProjectParameters,
    ui5Version: string,
    workerId: string
): Promise<string> {
    const { id, mainServiceUri } = getProjectParametersWithDefaults(userParameters);
    const template = await readFile(join(__dirname, 'templates', 'ui5.yaml'), 'utf-8');
    const document = await YamlDocument.newInstance(template);

    document.setIn({ path: 'metadata.name', value: id + '.' + workerId });
    document.setIn({ path: 'server.customMiddleware.0.configuration.services.urlPath', value: mainServiceUri });
    document.setIn({ path: 'server.customMiddleware.3.configuration.version', value: ui5Version });

    return document.toString();
}

export function createComponent(userParameters: ProjectParameters, workerId: string): string {
    const { id } = getProjectParametersWithDefaults(userParameters);
    return `sap.ui.define(
    ["sap/suite/ui/generic/template/lib/AppComponent"],
    function (Component) {
        "use strict";

        return Component.extend("${id}.${workerId}.Component", {
            metadata: {
                manifest: "json"
            }
        });
    }
);`;
}

export function createPackageJson(id: string): string {
    return `{
    "name": "${id}",
    "version": "0.0.1",
    "private": true,
    "devDependencies": {
        "@sap-ux/ui5-middleware-fe-mockserver": "2.1.112",
        "@ui5/cli": "3"
    }
}
`;
}

export async function generateUi5Project(
    projectConfig: typeof FIORI_ELEMENTS_V2,
    workerId: string,
    ui5Version: string
): Promise<string> {
    const { id } = getProjectParametersWithDefaults(projectConfig);
    const root = join(__dirname, '..', '..', 'fixtures-copy', `${projectConfig.id}.${workerId}`);
    const yamlContent = await createYamlFile(projectConfig, ui5Version, workerId);
    const manifestContent = JSON.stringify(createV2Manifest(projectConfig, workerId), undefined, 2);

    if (!existsSync(root)) {
        await mkdir(root, { recursive: true });
    }

    if (!existsSync(join(root, 'webapp'))) {
        await mkdir(join(root, 'webapp'), { recursive: true });
    }

    if (!existsSync(join(root, 'data'))) {
        await mkdir(join(root, 'data'), { recursive: true });
    }

    await Promise.all([
        writeFile(join(root, 'ui5.yaml'), yamlContent),
        writeFile(join(root, 'package.json'), createPackageJson(id + workerId)),
        writeFile(join(root, 'webapp', 'manifest.json'), manifestContent),
        writeFile(join(root, 'webapp', 'Component.js'), createComponent(projectConfig, workerId)),
        writeFile(join(root, 'service.cds'), await readFile(join(__dirname, 'templates', 'service.cds'), 'utf-8')),
        writeFile(
            join(root, 'data', 'RootEntity.json'),
            JSON.stringify(
                [
                    {
                        'ID': 1,
                        'StringProperty': 'Hello',
                        'NumberProperty': 78.777,
                        'IntegerProperty': 89,
                        'BooleanProperty': true,
                        'Currency': 'JPY',
                        'TextProperty': 'Description'
                    }
                ],
                undefined,
                2
            )
        )
    ]);
    return root;
}

export interface AdpProjectParameters {
    id: string;
}

function getAdpProjectParametersWithDefaults(parameters: AdpProjectParameters): AdpProjectParameters {
    return {
        id: parameters.id
        // mainServiceUri: parameters.mainServiceUri ?? `/sap/opu/odata/sap/SERVICE/`,
        // entitySet: parameters.entitySet ?? 'RootEntity'
    };
}

async function createAdpYamlFile(
    userParameters: AdpProjectParameters,
    ui5Version: string,
    backendUrl: string,
    mainServiceUri: string,
    livereloadPort: number
): Promise<string> {
    const { id } = getAdpProjectParametersWithDefaults(userParameters);
    const template = await readFile(join(__dirname, 'templates', 'adp.yaml'), 'utf-8');
    const document = await YamlDocument.newInstance(template);

    document.setIn({ path: 'metadata.name', value: id });
    document.setIn({ path: 'server.customMiddleware.0.configuration.services.urlPath', value: mainServiceUri });
    document.setIn({
        path: 'server.customMiddleware.1.configuration.port',
        value: livereloadPort,
        createIntermediateKeys: true
    });
    document.setIn({ path: 'server.customMiddleware.2.configuration.adp.target.url', value: backendUrl });
    // document.setIn({ path: 'server.customMiddleware.2.configuration.adp.target.url', value: backendUrl });
    document.setIn({ path: 'server.customMiddleware.3.configuration.version', value: ui5Version });

    return document.toString();
}

export async function createAppDescriptorVariant(
    userParameters: AdpProjectParameters,
    reference: string
): Promise<object> {
    const { id } = getAdpProjectParametersWithDefaults(userParameters);
    const text = await readFile(join(__dirname, 'templates', 'manifest.appdescr_variant'), 'utf-8');
    const result = JSON.parse(text) as Record<string, any>;
    result.reference = reference;
    result.id = id;
    result.namespace = `${reference}/${id}/`;

    return result;
}

export async function generateAdpProject(
    projectConfig: typeof ADP_FIORI_ELEMENTS_V2,
    workerId: string,
    ui5Version: string,
    backendUrl: string,
    livereloadPort: number
): Promise<string> {
    const { id } = getAdpProjectParametersWithDefaults(projectConfig);
    const root = join(__dirname, '..', '..', 'fixtures-copy', `${projectConfig.id}.${workerId}`);
    const yamlContent = await createAdpYamlFile(
        projectConfig,
        ui5Version,
        backendUrl,
        projectConfig.baseApp.mainServiceUri,
        livereloadPort
    );
    const appDescriptorVariant = JSON.stringify(
        await createAppDescriptorVariant(projectConfig, projectConfig.baseApp.id + '.' + workerId),
        undefined,
        2
    );

    if (!existsSync(root)) {
        await mkdir(root, { recursive: true });
    }

    if (!existsSync(join(root, 'webapp'))) {
        await mkdir(join(root, 'webapp'), { recursive: true });
    }

    if (!existsSync(join(root, 'data'))) {
        await mkdir(join(root, 'data'), { recursive: true });
    }
    if (existsSync(join(root, 'webapp', 'changes'))) {
        await rm(join(root, 'webapp', 'changes'), { recursive: true });
    }

    await Promise.all([
        writeFile(join(root, 'ui5.yaml'), yamlContent),
        writeFile(join(root, 'package.json'), createPackageJson(id + '.' + workerId)),
        writeFile(join(root, 'webapp', 'manifest.appdescr_variant'), appDescriptorVariant),
        writeFile(join(root, 'service.cds'), await readFile(join(__dirname, 'templates', 'service.cds'), 'utf-8')),
        writeFile(
            join(root, 'data', 'RootEntity.json'),
            JSON.stringify(
                [
                    {
                        'ID': 1,
                        'StringProperty': 'Hello',
                        'NumberProperty': 78.777,
                        'IntegerProperty': 89,
                        'BooleanProperty': true,
                        'Currency': 'JPY',
                        'TextProperty': 'Description',
                        'DateProperty': '/Date(1746057600000)/'
                    }
                ],
                undefined,
                2
            )
        )
    ]);
    return root;
}
