import type { MetadataElement } from '@sap-ux/odata-annotation-core';
import type { ParsedService } from '../parser';
import type { LinkerContext } from './types';
import { getParsedServiceByName } from '../utils';
import type { AnnotationNode, SectionNode, TableNode, TableSectionNode } from './annotations';
import { collectTables, collectSections } from './annotations';

export interface LinkedFeV4App {
    type: 'fe-v4';
    pages: FeV4PageType[];
}

export interface FeV4ListReport extends ConfigurationBase<'list-report-page'> {
    targetName: string;
    componentName: 'sap.fe.templates.ListReport';
    contextPath: string;
    entity: MetadataElement;
    tables: (Table | OrphanTable)[];
    lookup: NodeLookup<Table | OrphanTable>;
}

export interface FeV4ObjectPage extends ConfigurationBase<'object-page'> {
    targetName: string;
    componentName: 'sap.fe.templates.ObjectPage';
    contextPath: string;
    entity: MetadataElement;
    sections: Section[];
    lookup: NodeLookup<Table | Section>;
}

export type FeV4PageType = FeV4ListReport | FeV4ObjectPage;

export interface AnnotationBasedNode<T extends AnnotationNode, Configuration extends object = {}, Children = never>
    extends ConfigurationBase<T['type'], Configuration> {
    annotation?: T;

    children: Children[];
}

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
export type OrphanSection = ConfigurationBase<'orphan-section', {}>;
export type TableSection = AnnotationBasedNode<TableSectionNode, {}, Table>;
export type Section = TableSection | OrphanSection;
export interface TableSettings {
    tableType: string;
    widthIncludingColumnHeader: boolean;
    disableCopyToClipboard: boolean;
}

export type OrphanTable = ConfigurationBase<'orphan-table', TableSettings>;
export type Table = AnnotationBasedNode<TableNode, TableSettings>;

const tableTypeValues = ['ResponsiveTable', 'GridTable', 'AnalyticalTable', 'TreeTable'];

/**
 *
 * @param configurationKey
 * @param pathToPage
 * @param table
 * @returns
 */
function createTable(configurationKey: string, pathToPage: string[], table?: TableNode): Table | OrphanTable {
    const base: Omit<Table, 'type' | 'children'> = {
        // configurationPath: ['options', 'settings', 'controlConfiguration', configurationKey],
        configuration: {
            tableType: {
                configurationPath: [
                    ...pathToPage,
                    'options',
                    'settings',
                    'controlConfiguration',
                    configurationKey,
                    'tableSettings',
                    'type'
                ],
                values: tableTypeValues
            },
            widthIncludingColumnHeader: {
                configurationPath: [
                    ...pathToPage,
                    'options',
                    'settings',
                    'controlConfiguration',
                    configurationKey,
                    'tableSettings',
                    'widthIncludingColumnHeader'
                ],
                values: [true, false]
            },
            disableCopyToClipboard: {
                configurationPath: [
                    ...pathToPage,
                    'options',
                    'settings',
                    'controlConfiguration',
                    configurationKey,
                    'tableSettings',
                    'disableCopyToClipboard'
                ],
                values: [true, false]
            }
        }
    };
    if (!table) {
        return {
            type: 'orphan-table',
            ...base
        };
    }
    return {
        type: table.type,
        annotation: table,
        ...base,
        children: []
    };
}

export type Node = Section | Table | OrphanTable;
export type NodeLookup<T extends Node> = {
    [K in T['type']]?: Extract<T, { type: K }>[];
};

/**
 *
 * @param context
 */
export function runFeV4Linker(context: LinkerContext): LinkedFeV4App {
    const linkedApp: LinkedFeV4App = {
        type: 'fe-v4',
        pages: []
    };
    const manifest = context.app.manifestObject;
    const routingTargets = manifest['sap.ui5']?.routing?.targets;
    if (routingTargets) {
        for (const [name, target] of Object.entries(routingTargets)) {
            const settings = target.options?.settings;
            const contextPath =
                target.options?.settings?.contextPath ??
                (target.options?.settings?.entitySet ? `/${target.options.settings.entitySet}` : undefined);
            if (!contextPath) {
                continue;
            }

            const mainService = getParsedServiceByName(context.app);
            if (!mainService) {
                continue;
            }
            const entity = getEntity(settings, mainService);
            if (!entity) {
                continue;
            }
            const path = ['sap.ui5', 'routing', 'targets'];
            if (target.name === 'sap.fe.templates.ListReport') {
                linkListReport(context, mainService, linkedApp, path, name, contextPath, entity, target);
            } else if (target.name === 'sap.fe.templates.ObjectPage') {
                if (!entity.structuredType) {
                    continue;
                }
                const sections = collectSections('v4', entity.structuredType, mainService);

                const page: FeV4ObjectPage = {
                    type: 'object-page',
                    targetName: name,
                    componentName: target.name,
                    contextPath,
                    entity: entity,
                    configuration: {},
                    sections: [],
                    lookup: {}
                };
                linkObjectPageSections(page, path, name, entity, mainService, sections, target);
                linkedApp.pages.push(page);
            }
        }
    }
    return linkedApp;
}

interface Target {
    options?: {
        settings?: {
            entitySet?: string;
            contextPath?: string;

            controlConfiguration?: { [key: string]: TableConfiguration };
        };
    };
}

interface TableConfiguration {
    tableSettings?: {
        type?: string;
        widthIncludingColumnHeader?: boolean;
        disableCopyToClipboard?: boolean;
    };
}

/**
 *
 * @param context
 * @param service
 * @param linkedApp
 * @param path
 * @param name
 * @param contextPath
 * @param entity
 * @param target
 */
function linkListReport(
    context: LinkerContext,
    service: ParsedService,
    linkedApp: LinkedFeV4App,
    path: string[],
    name: string,
    contextPath: string,
    entity: MetadataElement,
    target: Target
): void {
    const entityType = entity?.structuredType;

    if (!entityType) {
        return;
    }

    const mainService = getParsedServiceByName(context.app);
    if (!mainService) {
        return;
    }
    const tables = collectTables('v4', entityType, mainService);

    const page: FeV4ListReport = {
        type: 'list-report-page',
        targetName: name,
        componentName: 'sap.fe.templates.ListReport',
        contextPath,
        entity: entity,
        configuration: {},
        tables: [],
        lookup: {}
    };
    linkListReportTable(page, [...path, name], tables, target);
    linkedApp.pages.push(page);
}

/**
 *
 * @param page
 * @param pathToPage
 * @param tables
 * @param configuration
 */
function linkListReportTable(
    page: FeV4ListReport,
    pathToPage: string[],
    tables: TableNode[],
    configuration: Target
): void {
    const controls: Record<string, Table | OrphanTable> = {};

    for (const table of tables) {
        const configurationKey = table.annotationPath;
        const linkedTable = createTable(configurationKey, pathToPage, table);
        controls[`${linkedTable.type}|${configurationKey}`] = linkedTable;
    }

    const configurations = configuration.options?.settings?.controlConfiguration ?? {};
    for (const [controlKey, controlConfiguration] of Object.entries(configurations)) {
        const tableControl = controls[`table|${controlKey}`];
        if (tableControl) {
            if (tableControl.type === 'table') {
                tableControl.configuration.tableType.valueInFile = controlConfiguration.tableSettings?.type;
                const columnHeaderValue = controlConfiguration.tableSettings?.widthIncludingColumnHeader;
                tableControl.configuration.widthIncludingColumnHeader.valueInFile = columnHeaderValue;
                const value = controlConfiguration.tableSettings?.disableCopyToClipboard;
                tableControl.configuration.disableCopyToClipboard.valueInFile = value;
            }
        } else {
            // no annotation definition found for this table, but configuration exists
            const orphanedSection = createTable(controlKey, pathToPage);
            controls[`${orphanedSection.type}|${controlKey}`] = orphanedSection;
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
 * @param pageName
 * @param entity
 * @param service
 * @param sections
 * @param configuration
 */
function linkObjectPageSections(
    page: FeV4ObjectPage,
    pathToPage: string[],
    pageName: string,
    entity: MetadataElement,
    service: ParsedService,
    sections: SectionNode[],
    configuration: Target
): void {
    const controls: Record<string, Section | Table> = {};

    for (const section of sections) {
        if (section.type === 'table-section') {
            const table = section.children[0];
            if (table.type !== 'table') {
                continue;
            }
            const configurationKey = table.annotationPath;
            const linkedSection: TableSection = {
                type: section.type,
                annotation: section,
                configuration: {},
                children: []
            };
            controls[`${section.type}|${configurationKey}`] = linkedSection;
            const linkedTable = createTable(configurationKey, [...pathToPage, pageName], table);
            if (linkedTable.type === 'table') {
                linkedSection.children.push(linkedTable);
                controls[`${linkedTable.type}|${configurationKey}`] = linkedTable;
            }
        }
    }

    const configurations = configuration.options?.settings?.controlConfiguration ?? {};
    for (const [controlKey, controlConfiguration] of Object.entries(configurations)) {
        const sectionControl = controls[`table-section|${controlKey}`];
        if (sectionControl) {
            if (sectionControl.type === 'table-section') {
                const tableControl = sectionControl.children[0];
                if (tableControl.type === 'table') {
                    tableControl.configuration.tableType.valueInFile = controlConfiguration.tableSettings?.type;
                    const value = controlConfiguration.tableSettings?.widthIncludingColumnHeader;
                    tableControl.configuration.widthIncludingColumnHeader.valueInFile = value;
                    const disableCopyValue = controlConfiguration.tableSettings?.disableCopyToClipboard;
                    tableControl.configuration.disableCopyToClipboard.valueInFile = disableCopyValue;
                }
            }
        } else {
            // no annotation definition found for this section, but configuration exists
            const orphanedSection: OrphanSection = {
                type: 'orphan-section',
                configuration: {}
            };
            controls[`${orphanedSection.type}|${controlKey}|`] = orphanedSection;
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

interface PageSettings {
    contextPath?: string;
    entitySet?: string;
}

/**
 *
 * @param settings
 * @param service
 */
function getEntity(settings: PageSettings, service: ParsedService): MetadataElement | undefined {
    if (settings.contextPath) {
        return getEntityForContextPath(settings.contextPath, service);
    }
    if (settings.entitySet) {
        return service.index.entitySets[settings.entitySet];
    }
    return undefined;
}

/**
 *
 * @param contextPath
 * @param service
 */
function getEntityForContextPath(contextPath: string, service: ParsedService): MetadataElement | undefined {
    if (!contextPath.startsWith('/')) {
        return;
    }
    const path = contextPath.substring(1);
    const [entityName, ...segments] = path.split('/');
    if (!entityName) {
        return;
    }
    const entity = service.index.entitySets[entityName];
    if (!entity) {
        return undefined;
    }
    const entityType = resolveNavigationProperties(entity, segments);

    if (!entityType) {
        const entityStructureType = service.index.entitySets[entityName]?.structuredType;
        if (!entityStructureType) {
            return;
        }
        const pageEntityType = service.artifacts.metadataService.getMetadataElement(entityStructureType);
        if (!pageEntityType) {
            return;
        }
        return resolveNavigationProperties(pageEntityType, segments);
    }

    return entityType;
}

/**
 *
 * @param root
 * @param segments
 */
function resolveNavigationProperties(root: MetadataElement, segments: string[]): MetadataElement | undefined {
    if (segments.length === 0) {
        return root;
    }
    let current = root;
    for (const segment of segments) {
        let found = false;
        for (const child of current.content) {
            if (child.name === segment) {
                current = child;
                found = true;
                break;
            }
        }
        if (!found) {
            return undefined;
        }
    }
    return current;
}
