import type { MetadataElement } from '@sap-ux/odata-annotation-core';
import type { LinkerContext } from './types';
import { getParsedServiceByName } from '../utils';
import type { ParsedService } from '../parser';

import type { AnnotationNode, SectionNode, TableNode, TableSectionNode } from './annotations';
import { collectSections, collectTables } from './annotations';

export interface ApplicationSetting {
    createMode: string;
}
export interface PageSetting {
    createMode: string;
}

export interface LinkedFeV2App extends ConfigurationBase<'fe-v2', ApplicationSetting> {
    pages: FeV2PageType[];
}

export interface FeV2ListReport extends ConfigurationBase<'list-report-page', PageSetting> {
    targetName: string;
    componentName: 'sap.suite.ui.generic.template.ListReport' | 'sap.suite.ui.generic.template.AnalyticalListPage';
    entitySetName: string;
    entity: MetadataElement;
    tables: (Table | OrphanTable)[];
    lookup: NodeLookup<Table | OrphanTable>;
}

export interface FeV2ObjectPage extends ConfigurationBase<'object-page', PageSetting> {
    targetName: string;
    componentName: 'sap.suite.ui.generic.template.ObjectPage';
    entitySetName: string;
    entity: MetadataElement;
    sections: Section[];
    lookup: NodeLookup<Table | Section>;
}

export type FeV2PageType = FeV2ListReport | FeV2ObjectPage;

export interface AnnotationBasedNode<T extends AnnotationNode, Configuration extends object = {}, Children = never>
    extends ConfigurationBase<T['type'], Configuration> {
    annotation?: T;

    children: Children[];
}

const createModeValues = ['creationRows', 'creationRowsHiddenInEditMode', 'newPage'];
const tableTypeValues = ['Table', 'ResponsiveTable', 'AnalyticalTable', 'GridTable'];

export interface ConfigurationBase<T extends string, Configuration extends object = {}> {
    type: T;
    annotation?: unknown;
    configuration: {
        [K in keyof Configuration]: {
            /**
             * All possible supported configuration values. Empty means dynamic value resolved by framework at runtime.
             */
            values: Configuration[K][];
            /**
             * Actual value as defined in the manifest file.
             */
            valueInFile?: Configuration[K];
            /**
             * Absolute path in manifest where this configuration is defined or parent if configuration is not defined
             */
            configurationPath: string[];
        };
    };
}

export type OrphanSection = ConfigurationBase<'orphan-section', TableSettings>;
export type TableSection = AnnotationBasedNode<TableSectionNode, {}, Table>;
export type Section = TableSection | OrphanSection;

export interface TableSettings {
    createMode: string;
    tableType: string;
}

export type OrphanTable = ConfigurationBase<'orphan-table', TableSettings>;
export type Table = AnnotationBasedNode<TableNode, TableSettings>;

export type Node = Section | Table | OrphanTable;
export type NodeLookup<T extends Node> = {
    [K in T['type']]?: Extract<T, { type: K }>[];
};

/**
 *
 * @param context
 */
export function runFeV2Linker(context: LinkerContext): LinkedFeV2App {
    const manifest = context.app.manifestObject;
    const config = manifest['sap.ui.generic.app'];
    const linkedApp = linkApplicationSettings(config ?? {});
    const service = getParsedServiceByName(context.app);
    if (!service) {
        return linkedApp;
    }
    if (config) {
        for (const [name, target] of Object.entries(config?.pages ?? {})) {
            linkPage(context, service, linkedApp, ['sap.ui.generic.app', 'pages'], name, target);
        }
    }
    return linkedApp;
}

interface ManifestPageSettings {
    navigationProperty?: string;
    entitySet?: string;
    component?: {
        name?: string;
        settings?: {
            createMode?: string;
            tableSettings?: {
                createMode?: string;
                type?: string;
            };
            sections?: {
                [sectionKey: string]: {
                    createMode?: string;
                    tableSettings?: {
                        type?: string;
                    };
                };
            };
        };
    };
    pages?: { [name: string]: ManifestPageSettings };
}

interface ManifestApplicationSettings {
    settings?: {
        tableSettings?: TableSettings;
    };
}

/**
 *
 * @param context
 * @param service
 * @param linkedApp
 * @param path
 * @param name
 * @param target
 */
function linkPage(
    context: LinkerContext,
    service: ParsedService,
    linkedApp: LinkedFeV2App,
    path: string[],
    name: string,
    target: ManifestPageSettings
): void {
    const componentName = target?.component?.name;
    if (
        componentName === 'sap.suite.ui.generic.template.ListReport' ||
        componentName === 'sap.suite.ui.generic.template.AnalyticalListPage'
    ) {
        const entitySetName = target.entitySet;
        if (!entitySetName) {
            return;
        }
        const entity = service.index.entitySets[entitySetName];
        const entityType = entity?.structuredType;

        if (!entity || !entityType) {
            return;
        }

        const mainService = getParsedServiceByName(context.app);
        if (!mainService) {
            return;
        }
        const table = collectTables('v2', entityType, mainService);
        const createMode = target.component?.settings?.createMode;
        const page: FeV2ListReport = {
            type: 'list-report-page',
            targetName: name,
            componentName,
            configuration: {
                createMode: {
                    values: createModeValues,
                    configurationPath: [...path, name, 'component', 'settings']
                }
            },
            entitySetName: entitySetName,
            entity: entity,
            tables: [],
            lookup: {}
        };
        if (createMode) {
            page.configuration.createMode.configurationPath.push('createMode');
            page.configuration.createMode.valueInFile = createMode;
        }
        linkListReportTable(page, [...path, name], table, target);
        linkedApp.pages.push(page);
    } else if (componentName === 'sap.suite.ui.generic.template.ObjectPage') {
        const entitySetName = target.entitySet;
        if (!entitySetName) {
            return;
        }
        const entity = service.index.entitySets[entitySetName];
        const entityType = entity?.structuredType;

        if (!entity || !entityType) {
            return;
        }

        const mainService = getParsedServiceByName(context.app);
        if (!mainService) {
            return;
        }

        const sections = collectSections('v2', entityType, mainService);
        const createMode = target.component?.settings?.createMode;
        const page: FeV2ObjectPage = {
            type: 'object-page',
            targetName: name,
            componentName,
            configuration: {
                createMode: {
                    values: createModeValues,
                    configurationPath: [...path, name, 'component', 'settings']
                }
            },
            entitySetName: entitySetName,
            entity: entity,
            sections: [],
            lookup: {}
        };
        if (createMode) {
            page.configuration.createMode.configurationPath.push('createMode');
            page.configuration.createMode.valueInFile = createMode;
        }

        linkObjectPageSections(page, [...path, name], entity, mainService, sections, target);
        linkedApp.pages.push(page);
    }
    const pages = target.pages ?? {};
    for (const [key, child] of Object.entries(pages)) {
        linkPage(context, service, linkedApp, [...path, name, 'pages'], key, child);
    }
}

/**
 *
 * @param page
 * @param pathToPage
 * @param tables
 * @param configuration
 */
function linkListReportTable(
    page: FeV2ListReport,
    pathToPage: string[],
    tables: TableNode[],
    configuration: ManifestPageSettings
): void {
    const controls: Record<string, Table | OrphanTable> = {};

    for (const table of tables) {
        const configurationKey = table.annotationPath
            .split('/')
            .map((segment) => segment.replace('@', ''))
            .join('::');

        const tableSettingsConfig = configuration.component?.settings?.tableSettings ?? {};
        const createMode = tableSettingsConfig.createMode;
        const tableType = tableSettingsConfig.type;
        const linkedTable: Table = {
            type: table.type,
            annotation: table,
            configuration: {
                createMode: {
                    values: createModeValues,
                    configurationPath: [...pathToPage, 'component', 'settings', 'tableSettings']
                },
                tableType: {
                    values: tableTypeValues,
                    configurationPath: [...pathToPage, 'component', 'settings', 'tableSettings']
                }
            },
            children: []
        };
        if (createMode) {
            linkedTable.configuration.createMode.configurationPath.push('createMode');
            linkedTable.configuration.createMode.valueInFile = createMode;
        }
        if (tableType) {
            linkedTable.configuration.tableType.configurationPath.push('type');
            linkedTable.configuration.tableType.valueInFile = tableType;
        }
        controls[`${linkedTable.type}|${configurationKey}`] = linkedTable;
    }

    const configurations = configuration.component?.settings?.sections ?? {};
    for (const [sectionKey, sectionConfig] of Object.entries(configurations)) {
        const tableControl = controls[`table|${sectionKey}`];
        const createMode = sectionConfig.createMode;
        const tableType = sectionConfig.tableSettings?.type;
        if (!tableControl) {
            // no annotation definition found for this table, but configuration exists
            const orphanedSection: OrphanTable = {
                type: 'orphan-table',
                // configurationPath: [...pathToPage, 'component', 'settings'],
                configuration: {
                    createMode: {
                        values: createModeValues,
                        configurationPath: [
                            ...pathToPage,
                            'component',
                            'settings',
                            'sections',
                            sectionKey,
                            'tableSettings'
                        ]
                    },
                    tableType: {
                        values: tableTypeValues,
                        configurationPath: [
                            ...pathToPage,
                            'component',
                            'settings',
                            'sections',
                            sectionKey,
                            'tableSettings'
                        ]
                    }
                }
            };
            controls[`${orphanedSection.type}|${sectionKey}`] = orphanedSection;
            if (createMode) {
                orphanedSection.configuration.createMode.configurationPath.push('createMode');
                orphanedSection.configuration.createMode.valueInFile = createMode;
            }
            if (tableType) {
                orphanedSection.configuration.tableType.configurationPath.push('type');
                orphanedSection.configuration.tableType.valueInFile = tableType;
            }
        }
    }
    for (const control of Object.values(controls)) {
        page.lookup[control.type] ??= [];
        (page.lookup[control.type]! as Extract<Table | OrphanTable, { type: typeof control.type }>[])!.push(control);
    }
}

/**
 *
 * @param page
 * @param pathToPage
 * @param entity
 * @param service
 * @param sections
 * @param configuration
 */
function linkObjectPageSections(
    page: FeV2ObjectPage,
    pathToPage: string[],
    entity: MetadataElement,
    service: ParsedService,
    sections: SectionNode[],
    configuration: ManifestPageSettings
): void {
    const controls: Record<string, Section | Table> = {};

    for (const section of sections) {
        if (section.type === 'table-section') {
            const table = section.children[0];
            if (table.type !== 'table') {
                continue;
            }
            const configurationKey = table.annotationPath
                .split('/')
                .map((segment) => segment.replace('@', ''))
                .join('::');
            const linkedSection: TableSection = {
                type: section.type,
                annotation: section,
                configuration: {},
                children: []
            };
            controls[`${section.type}|${configurationKey}`] = linkedSection;
            let createMode: string | undefined;
            let tableType: string | undefined;
            let sectionEntityKey = '';
            for (const [key, value] of Object.entries(configuration.component?.settings?.sections ?? {})) {
                if (value.createMode !== undefined) {
                    sectionEntityKey = key;
                    createMode = value.createMode;
                }
                if (value.tableSettings?.type !== undefined) {
                    sectionEntityKey = key;
                    tableType = value.tableSettings.type;
                }
            }
            const linkedTable: Table = {
                type: table.type,
                annotation: table,
                configuration: {
                    createMode: {
                        values: createModeValues,
                        configurationPath: [...pathToPage, 'component', 'settings', 'sections']
                    },
                    tableType: {
                        values: tableTypeValues,
                        configurationPath: [...pathToPage, 'component', 'settings', 'sections']
                    }
                },
                children: []
            };
            if (createMode) {
                linkedTable.configuration.createMode.configurationPath.push(sectionEntityKey, 'createMode');
                linkedTable.configuration.createMode.valueInFile = createMode;
            }
            if (tableType) {
                linkedTable.configuration.tableType.configurationPath.push(sectionEntityKey, 'tableSettings', 'type');
                linkedTable.configuration.tableType.valueInFile = tableType;
            }
            linkedSection.children.push(linkedTable);
            controls[`${linkedTable.type}|${configurationKey}`] = linkedTable;
        }
    }

    const configurations = configuration.component?.settings?.sections ?? {};
    for (const [sectionKey, sectionConfig] of Object.entries(configurations)) {
        const sectionControl = controls[`table-section|${sectionKey}`];
        if (!sectionControl) {
            // no annotation definition found for this section, but configuration exists

            let createMode: string | undefined;
            let tableType: string | undefined;
            // let sectionEntityKey = '';
            if (sectionConfig.createMode !== undefined) {
                // sectionEntityKey = sectionKey;
                createMode = sectionConfig.createMode;
            }
            if (sectionConfig.tableSettings?.type !== undefined) {
                // sectionEntityKey = sectionKey;
                tableType = sectionConfig.tableSettings.type;
            }

            const orphanedSection: OrphanSection = {
                type: 'orphan-section',
                configuration: {
                    createMode: {
                        values: createModeValues,
                        configurationPath: [...pathToPage, 'component', 'settings', 'sections', sectionKey]
                    },
                    tableType: {
                        values: tableTypeValues,
                        configurationPath: [
                            ...pathToPage,
                            'component',
                            'settings',
                            'sections',
                            sectionKey,
                            'tableSettings'
                        ]
                    }
                }
            };
            if (createMode) {
                orphanedSection.configuration.createMode.configurationPath.push('createMode');
                orphanedSection.configuration.createMode.valueInFile = createMode;
            }
            if (tableType) {
                orphanedSection.configuration.tableType.configurationPath.push('type');
                orphanedSection.configuration.tableType.valueInFile = tableType;
            }
            controls[`${orphanedSection.type}|${sectionKey}|`] = orphanedSection;
        }
    }
    for (const control of Object.values(controls)) {
        if (control.type === 'table-section') {
            page.sections.push(control);
        }
        page.lookup[control.type] ??= [];
        (page.lookup[control.type]! as Extract<Section | Table, { type: typeof control.type }>[]).push(control);
    }
}

/**
 *
 * @param config
 */
function linkApplicationSettings(config: ManifestApplicationSettings): LinkedFeV2App {
    const createMode = config.settings?.tableSettings?.createMode;
    const linkedApp: LinkedFeV2App = {
        type: 'fe-v2',
        pages: [],
        configuration: {
            createMode: {
                values: createModeValues,
                configurationPath: ['sap.ui.generic.app', 'settings', 'tableSettings']
            }
        }
    };
    if (createMode) {
        linkedApp.configuration.createMode.configurationPath.push('createMode');
        linkedApp.configuration.createMode.valueInFile = createMode;
    }
    return linkedApp;
}
