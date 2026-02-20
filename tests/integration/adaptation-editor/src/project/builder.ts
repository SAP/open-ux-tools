import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Manifest } from '@sap-ux/project-access';
import { YamlDocument } from '@sap-ux/yaml';
import template from './templates/manifest-fe-v2.json';
import feV4ManifestTemplate from './templates/manifest-fe-v4.json';
import type { FIORI_ELEMENTS_V2, ADP_FIORI_ELEMENTS_V2, ADP_FIORI_ELEMENTS_V4, FIORI_ELEMENTS_V4 } from './projects';
import { existsSync } from 'node:fs';

export interface ProjectParameters {
    id: string;
    mainServiceUri: string;
    entitySet: string;
    userParams?: Record<string, string | boolean>;
}

export const ADAPTATION_EDITOR_PATH = '/adaptation-editor.html';

/**
 * Returns project parameters with default values if not provided.
 *
 * @param parameters - The project parameters provided by the user.
 * @returns Project parameters with defaults applied.
 */
function getProjectParametersWithDefaults(parameters: ProjectParameters): ProjectParameters {
    return {
        id: parameters.id,
        mainServiceUri: parameters.mainServiceUri ?? `/sap/opu/odata/sap/SERVICE/`,
        entitySet: parameters.entitySet ?? 'RootEntity',
        userParams: parameters.userParams ?? {}
    };
}

/**
 * Creates a manifest for an OData V2 project.
 *
 * @param userParameters - The project parameters provided by the user.
 * @param workerId - The unique worker ID for the project.
 * @returns A manifest object for the project.
 */
export function createV2Manifest(userParameters: ProjectParameters, workerId: string): Manifest {
    const { id, mainServiceUri, entitySet, userParams } = getProjectParametersWithDefaults(userParameters);
    const {
        qualifier = '',
        navigationProperty,
        variantManagement = true,
        analyticalTable,
        isManifestArray
    } = userParams ?? {};
    const result = structuredClone(template) as Manifest;
    result['sap.app'].id = id + '.' + workerId;
    result['sap.app'].dataSources!.mainService.uri = mainServiceUri;
    result['sap.app'].sourceTemplate!.id = 'preview-middleware-tests';
    result['sap.app'].sourceTemplate!.version = '1.0.0';
    result['sap.app'].sourceTemplate!.toolsId = id;
    const listReport = {
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
        }
    };

    const op = {
        'entitySet': entitySet,
        'defaultLayoutTypeIfExternalNavigation': 'MidColumnFullScreen',
        'component': {
            'name': 'sap.suite.ui.generic.template.ObjectPage',
            ...(navigationProperty && {
                'settings': {
                    'sections': {
                        [`${navigationProperty}::com.sap.vocabularies.UI.v1.LineItem${
                            qualifier ? `::${qualifier}` : ''
                        }`]: {
                            'tableSettings': {
                                variantManagement,
                                ...(analyticalTable && { 'type': 'AnalyticalTable' })
                            }
                        }
                    }
                }
            })
        }
    };
    if (isManifestArray) {
        result['sap.ui.generic.app']!.pages = [
            {
                ...listReport,
                'pages': [op]
            }
        ];
    } else {
        result['sap.ui.generic.app']!.pages = {
            [`ListReport|${entitySet}`]: {
                ...listReport,
                'pages': {
                    [`ObjectPage|${entitySet}`]: op
                }
            }
        };
    }

    return result;
}

/**
 * @param userParameters - The project parameters provided by the user.
 * @param workerId - The unique worker ID for the project.
 * @returns A manifest object for the project.
 */
export function createV4Manifest(userParameters: ProjectParameters, workerId: string): Manifest {
    const { id, mainServiceUri, entitySet } = getProjectParametersWithDefaults(userParameters);
    const result = structuredClone(feV4ManifestTemplate) as Manifest;
    result['sap.app'].id = id + '.' + workerId;
    result['sap.app'].dataSources!.mainService.uri = mainServiceUri;
    result['sap.app'].sourceTemplate!.id = 'preview-middleware-tests';
    result['sap.app'].sourceTemplate!.version = '1.0.0';
    result['sap.app'].sourceTemplate!.toolsId = id;
    const listTarget = `${entitySet}List`;
    const detailTarget = `${entitySet}ObjectPage`;
    result['sap.ui5']!.routing = {
        config: {
            async: true
        },
        routes: [
            {
                'pattern': ':?query:',
                'name': listTarget,
                'target': listTarget
            },
            {
                'pattern': `${entitySet}({key}):?query:`,
                'name': detailTarget,
                'target': detailTarget
            }
        ],
        targets: {
            [listTarget]: {
                'type': 'Component',
                id: listTarget,
                name: 'sap.fe.templates.ListReport',
                options: {
                    settings: {
                        contextPath: `/${entitySet}`,
                        navigation: {
                            [entitySet]: {
                                detail: {
                                    route: detailTarget
                                }
                            }
                        }
                    }
                }
            },
            [detailTarget]: {
                type: 'Component',
                id: detailTarget,
                name: 'sap.fe.templates.ObjectPage',
                options: {
                    settings: {
                        contextPath: `/${entitySet}`,
                        editableHeaderContent: false,
                        entitySet: entitySet
                    }
                }
            }
        }
    };

    return result;
}

/**
 * Creates a YAML file for the project.
 *
 * @param userParameters - The project parameters provided by the user.
 * @param ui5Version - The UI5 version to be used.
 * @param templateName - The name of the template file to be used.
 * @param workerId - The unique worker ID for the project.
 * @param odataVersion - version of odata.
 * @returns A string representation of the YAML file content.
 */
export async function createYamlFile(
    userParameters: ProjectParameters,
    ui5Version: string,
    templateName: string,
    workerId: string,
    odataVersion: 'fe-v4' | 'fe-v2' | 'ui5' = 'fe-v2'
): Promise<string> {
    const { id, mainServiceUri } = getProjectParametersWithDefaults(userParameters);
    const template = await readFile(join(__dirname, 'templates', templateName), 'utf-8');
    const document = await YamlDocument.newInstance(template);

    document.setIn({ path: 'metadata.name', value: id + '.' + workerId });
    if (odataVersion === 'fe-v4') {
        document.setIn({
            path: 'server.customMiddleware.0.configuration.metadataProcessor.options.odataVersion',
            value: 'v4'
        });
    }
    document.setIn({ path: 'server.customMiddleware.0.configuration.services.urlPath', value: mainServiceUri });
    document.setIn({ path: 'server.customMiddleware.3.configuration.version', value: ui5Version });

    return document.toString();
}

/**
 * Creates a UI5 component definition.
 *
 * @param userParameters - The project parameters provided by the user.
 * @param workerId - The unique worker ID for the project.
 * @returns A string representation of the UI5 component definition.
 */
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

/**
 * @param userParameters - The project parameters provided by the user.
 * @param workerId - The unique worker ID for the project.
 * @returns A string representation of the UI5 component definition.
 */
export function createV4Component(userParameters: ProjectParameters, workerId: string): string {
    const { id } = getProjectParametersWithDefaults(userParameters);
    return `sap.ui.define(["sap/fe/core/AppComponent"], function (Component) {
        "use strict";
        return Component.extend("${id}.${workerId}.Component", {
            metadata: {
                manifest: "json"
            }
        });
    }
);`;
}

/**
 * Creates a package.json file for the project.
 *
 * @param id - The project ID.
 * @returns A string representation of the package.json file content.
 */
export function createPackageJson(id: string): string {
    return `{
    "name": "${id}",
    "version": "0.0.1",
    "private": true,
    "devDependencies": {
        "@sap-ux/ui5-middleware-fe-mockserver": "2.1.112",
        "@ui5/cli": "4"
    }
}
`;
}

/**
 * @param projectConfig - The project configuration.
 * @param workerId - The unique worker ID for the project.
 * @param ui5Version - The UI5 version to be used.
 * @returns The root path of the generated project.
 */
export async function generateFeV4Project(
    projectConfig: typeof FIORI_ELEMENTS_V4,
    workerId: string,
    ui5Version: string
): Promise<string> {
    const { id } = getProjectParametersWithDefaults(projectConfig);
    const root = join(__dirname, '..', '..', 'fixtures-copy', `${projectConfig.id}.${workerId}`);
    const yamlContent = await createYamlFile(projectConfig, ui5Version, 'ui5.yaml', workerId, 'fe-v4');
    const manifestContent = JSON.stringify(createV4Manifest(projectConfig, workerId), undefined, 2);

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
        writeFile(join(root, 'webapp', 'Component.js'), createV4Component(projectConfig, workerId)),
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

/**
 * Generates a UI5 project with the given configuration.
 *
 * @param projectConfig - The project configuration.
 * @param workerId - The unique worker ID for the project.
 * @param ui5Version - The UI5 version to be used.
 * @returns The root path of the generated project.
 */
export async function generateUi5Project(
    projectConfig: typeof FIORI_ELEMENTS_V2,
    workerId: string,
    ui5Version: string
): Promise<string> {
    const { id } = getProjectParametersWithDefaults(projectConfig);
    const root = join(__dirname, '..', '..', 'fixtures-copy', `${projectConfig.id}.${workerId}`);
    const yamlContent = await createYamlFile(projectConfig, ui5Version, 'ui5.yaml', workerId);
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
        ),
        writeFile(
            join(root, 'data', 'FirstAssociatedEntity.json'),
            JSON.stringify(
                [
                    {
                        'ID': 100,
                        'root_ID': 1,
                        'StringProperty': 'Hello JPY',
                        'NumberProperty': 78.777,
                        'IntegerProperty': 89,
                        'BooleanProperty': true,
                        'Currency': 'JPY',
                        'TextProperty': 'Description'
                    },
                    {
                        'ID': 101,
                        'root_ID': 1,
                        'StringProperty': 'Hello AED',
                        'NumberProperty': 78.777,
                        'IntegerProperty': 89,
                        'BooleanProperty': true,
                        'Currency': 'AED',
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

/**
 * Returns ADP project parameters with default values if not provided.
 *
 * @param parameters - The ADP project parameters provided by the user.
 * @returns ADP project parameters with defaults applied.
 */
function getAdpProjectParametersWithDefaults(parameters: AdpProjectParameters): AdpProjectParameters {
    return {
        id: parameters.id
    };
}

/**
 * Creates a YAML file for an ADP project.
 *
 * @param userParameters - The ADP project parameters provided by the user.
 * @param ui5Version - The UI5 version to be used.
 * @param odataVersion - The OData version to be used.
 * @param backendUrl - The backend URL for the ADP project.
 * @param mainServiceUri - The main service URI for the ADP project.
 * @param livereloadPort - The livereload port for the ADP project.
 * @returns A string representation of the YAML file content.
 */
async function createAdpYamlFile(
    userParameters: AdpProjectParameters,
    ui5Version: string,
    odataVersion: 'v2' | 'v4',
    backendUrl: string,
    mainServiceUri: string,
    livereloadPort: number
): Promise<string> {
    const { id } = getAdpProjectParametersWithDefaults(userParameters);
    const template = await readFile(join(__dirname, 'templates', 'adp.yaml'), 'utf-8');
    const document = await YamlDocument.newInstance(template);

    document.setIn({ path: 'metadata.name', value: id });
    document.setIn({
        path: 'server.customMiddleware.0.configuration.metadataProcessor.options.odataVersion',
        value: odataVersion
    });
    document.setIn({ path: 'server.customMiddleware.0.configuration.services.urlPath', value: mainServiceUri });
    document.setIn({
        path: 'server.customMiddleware.1.configuration.port',
        value: livereloadPort,
        createIntermediateKeys: true
    });
    document.setIn({ path: 'server.customMiddleware.2.configuration.adp.target.url', value: backendUrl });
    document.setIn({ path: 'server.customMiddleware.3.configuration.version', value: ui5Version });

    return document.toString();
}

/**
 * Creates an app descriptor variant for an ADP project.
 *
 * @param userParameters - The ADP project parameters provided by the user.
 * @param reference - The reference ID for the base app.
 * @returns An object representing the app descriptor variant.
 */
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

/**
 * Generates an ADP project with the given configuration.
 *
 * @param projectConfig - The ADP project configuration.
 * @param workerId - The unique worker ID for the project.
 * @param ui5Version - The UI5 version to be used.
 * @param backendUrl - The backend URL for the ADP project.
 * @param livereloadPort - The livereload port for the ADP project.
 * @returns The root path of the generated ADP project.
 */
export async function generateAdpProject(
    projectConfig: typeof ADP_FIORI_ELEMENTS_V2 | typeof ADP_FIORI_ELEMENTS_V4,
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
        projectConfig.baseApp.kind === 'fe-v4' ? 'v4' : 'v2',
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
        ),
        writeFile(
            join(root, 'data', 'FirstAssociatedEntity.json'),
            JSON.stringify(
                [
                    {
                        'ID': 100,
                        'root_ID': 1,
                        'StringProperty': 'Hello JPY',
                        'NumberProperty': 78.777,
                        'IntegerProperty': 89,
                        'BooleanProperty': true,
                        'Currency': 'JPY',
                        'TextProperty': 'Description'
                    },
                    {
                        'ID': 101,
                        'root_ID': 1,
                        'StringProperty': 'Hello AED',
                        'NumberProperty': 78.777,
                        'IntegerProperty': 89,
                        'BooleanProperty': true,
                        'Currency': 'AED',
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
