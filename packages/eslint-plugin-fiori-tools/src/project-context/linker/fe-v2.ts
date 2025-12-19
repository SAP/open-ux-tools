import type { MetadataElement } from '@sap-ux/odata-annotation-core';
import type { LinkerContext } from './types';
import { getParsedServiceByName } from '../utils';
import type { ParsedService } from '../parser';

import type { AnnotationNode, SectionNode, TableNode, TableSectionNode } from './annotations';
import { collectSections, collectTables } from './annotations';

export interface LinkedFeV2App {
    type: 'fe-v2';
    pages: FeV2PageType[];
}

export interface FeV2ListReport {
    targetName: string;
    componentName: 'sap.suite.ui.generic.template.ListReport' | 'sap.suite.ui.generic.template.AnalyticalListPage';
    entitySetName: string;
    entity: MetadataElement;
    configurationPath: string[];
    settings: {};
    tables: (Table | OrphanTable)[];
    lookup: NodeLookup<Table | OrphanTable>;
}

export interface FeV2ObjectPage {
    targetName: string;
    componentName: 'sap.suite.ui.generic.template.ObjectPage';
    entitySetName: string;
    configurationPath: string[];
    entity: MetadataElement;
    settings: {};
    sections: Section[];
    lookup: NodeLookup<Table | Section>;
}

export type FeV2PageType = FeV2ListReport | FeV2ObjectPage;

export interface AnnotationBasedNode<T extends AnnotationNode, Configuration extends object = {}, Children = never>
    extends ConfigurationBase<T['type'], Configuration> {
    annotation?: T;

    children: Children[];
}

export interface ConfigurationBase<T extends string, Configuration extends object = {}> {
    type: T;
    annotation?: unknown;
    configurationPath: string[];
    configuration: Partial<Configuration>;
    resolvedConfiguration: Configuration;
    configurationPaths: {
        [K in keyof Configuration]: string[];
    };
}

export type OrphanSection = ConfigurationBase<'orphan-section', {}>;
export type TableSection = AnnotationBasedNode<TableSectionNode, {}, Table>;
export type Section = TableSection | OrphanSection;
export interface TableSettings {
    createMode: 'creationRows' | 'creationRowsHiddenInEditMode' | 'newPage' | 'inline';
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
    const linkedApp: LinkedFeV2App = {
        type: 'fe-v2',
        pages: []
    };
    const manifest = context.app.manifestObject;
    const service = getParsedServiceByName(context.app);
    if (!service) {
        return linkedApp;
    }
    const config = manifest['sap.ui.generic.app'];
    if (config) {
        for (const [name, target] of Object.entries(config?.pages ?? {})) {
            linkPage(context, service, linkedApp, ['sap.ui.generic.app', 'pages'], name, target);
        }
    }
    return linkedApp;
}

interface PageSettings {
    navigationProperty?: string;
    entitySet?: string;
    component?: {
        name?: string;
        settings?: {
            tableSettings?: TableSettings;
            sections?: {
                [sectionKey: string]: {
                    createMode?: string;
                };
            };
        };
    };
    pages?: { [name: string]: PageSettings };
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
    target: PageSettings
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

        const page: FeV2ListReport = {
            targetName: name,
            componentName,
            configurationPath: [...path, name],
            entitySetName: entitySetName,
            entity: entity,
            settings: {},
            tables: [],
            lookup: {}
        };
        linkListReportTable(page, path, table, target);
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

        const page: FeV2ObjectPage = {
            targetName: name,
            componentName,
            configurationPath: [...path, name],
            entitySetName: entitySetName,
            entity: entity,
            settings: {},
            sections: [],
            lookup: {}
        };
        linkObjectPageSections(page, path, entity, mainService, sections, target);
        linkedApp.pages.push(page);
    }
    const pages = target.pages ?? {};
    for (const [key, child] of Object.entries(pages)) {
        linkPage(context, service, linkedApp, [...path, 'pages'], key, child);
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
    configuration: PageSettings
): void {
    const controls: Record<string, Table | OrphanTable> = {};

    for (const table of tables) {
        const configurationKey = table.annotationPath
            .split('/')
            .map((segment) => segment.replace('@', ''))
            .join('::');

        const linkedTable: Table = {
            type: table.type,
            annotation: table,
            configurationPath: [...pathToPage, 'component', 'settings'],
            configuration: {},
            resolvedConfiguration: {
                createMode: 'inline'
            },
            configurationPaths: {
                createMode: ['createMode']
            },
            children: []
        };
        controls[`${linkedTable.type}|${configurationKey}`] = linkedTable;
    }

    const configurations = configuration.component?.settings?.sections ?? {};
    for (const [sectionKey, sectionConfig] of Object.entries(configurations)) {
        const tableControl = controls[`table|${sectionKey}`];
        if (tableControl) {
            if (tableControl.type === 'table') {
                if (sectionConfig.createMode !== undefined) {
                    const value = getCreationRowsValue(sectionConfig.createMode);
                    if (value) {
                        tableControl.configuration.createMode = value;
                        tableControl.resolvedConfiguration.createMode = value;
                    } else {
                        // TODO: report invalid value
                    }
                }
            }
        } else {
            // no annotation definition found for this table, but configuration exists
            const orphanedSection: OrphanTable = {
                type: 'orphan-table',
                configurationPath: [...pathToPage, 'component', 'settings'],
                configuration: {},
                resolvedConfiguration: {
                    createMode: 'inline'
                },
                configurationPaths: {
                    createMode: ['createMode']
                }
            };
            controls[`${orphanedSection.type}|${sectionKey}`] = orphanedSection;
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
    configuration: PageSettings
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
                configurationPath: [...pathToPage, 'component', 'settings', 'sections', configurationKey],
                configuration: {},
                resolvedConfiguration: {},
                configurationPaths: {},
                children: []
            };
            controls[`${section.type}|${configurationKey}`] = linkedSection;
            const linkedTable: Table = {
                type: table.type,
                annotation: table,
                configurationPath: [...pathToPage, 'component', 'settings', 'sections', configurationKey],
                configuration: {},
                resolvedConfiguration: {
                    createMode: 'inline'
                },
                configurationPaths: {
                    createMode: ['createMode']
                },
                children: []
            };
            linkedSection.children.push(linkedTable);
            controls[`${linkedTable.type}|${configurationKey}`] = linkedTable;
        }
    }

    const configurations = configuration.component?.settings?.sections ?? {};
    for (const [sectionKey, sectionConfig] of Object.entries(configurations)) {
        const sectionControl = controls[`table-section|${sectionKey}`];
        if (sectionControl) {
            if (sectionControl.type === 'table-section') {
                const tableControl = sectionControl.children[0];
                if (tableControl.type === 'table') {
                    if (sectionConfig.createMode !== undefined) {
                        const value = getCreationRowsValue(sectionConfig.createMode);
                        if (value) {
                            tableControl.configuration.createMode = value;
                            tableControl.resolvedConfiguration.createMode = value;
                        } else {
                            // TODO: report invalid value
                        }
                    }
                }
            }
        } else {
            // no annotation definition found for this section, but configuration exists
            const orphanedSection: OrphanSection = {
                type: 'orphan-section',
                configurationPath: [...pathToPage, 'component', 'settings', 'sections', sectionKey],
                configuration: {},
                resolvedConfiguration: {},
                configurationPaths: {}
            };
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
 * @param value
 */
function getCreationRowsValue(value: string): TableSettings['createMode'] | undefined {
    switch (value) {
        case 'creationRows':
        case 'creationRowsHiddenInEditMode':
        case 'newPage':
        case 'inline':
            return value;
        default:
            return undefined;
    }
}
