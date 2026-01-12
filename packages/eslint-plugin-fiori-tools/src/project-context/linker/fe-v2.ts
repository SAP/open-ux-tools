import type { MetadataElement } from '@sap-ux/odata-annotation-core';
import type { LinkerContext } from './types';
import { getParsedServiceByName } from '../utils';
import type { ParsedService } from '../parser';

import type { AnnotationNode, TableNode, TableSectionNode } from './annotations';
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

/**
 * Creates a configuration key from an annotation path
 *
 * @param annotationPath
 */
function getConfigurationKey(annotationPath: string): string {
    return annotationPath
        .split('/')
        .map((segment) => segment.replace('@', ''))
        .join('::');
}

/**
 * Creates table configuration object
 *
 * @param pathToPage
 * @param createMode
 * @param tableType
 */
function createTableConfiguration(pathToPage: string[], createMode: string | undefined, tableType: string | undefined) {
    return {
        createMode: {
            values: createModeValues,
            configurationPath: [...pathToPage, 'component', 'settings', 'tableSettings', 'createMode'],
            valueInFile: createMode
        },
        tableType: {
            values: tableTypeValues,
            configurationPath: [...pathToPage, 'component', 'settings', 'tableSettings', 'type'],
            valueInFile: tableType
        }
    };
}

/**
 * Creates section table configuration object
 *
 * @param pathToPage
 * @param sectionKey
 * @param createMode
 * @param tableType
 */
function createSectionTableConfiguration(
    pathToPage: string[],
    sectionKey: string,
    createMode: string | undefined,
    tableType: string | undefined
) {
    return {
        createMode: {
            values: createModeValues,
            configurationPath: [...pathToPage, 'component', 'settings', 'sections', sectionKey, 'createMode'],
            valueInFile: createMode
        },
        tableType: {
            values: tableTypeValues,
            configurationPath: [
                ...pathToPage,
                'component',
                'settings',
                'sections',
                sectionKey,
                'tableSettings',
                'type'
            ],
            valueInFile: tableType
        }
    };
}

/**
 * Finds section settings from configuration
 *
 * @param configuration
 */
function findSectionSettings(configuration: ManifestPageSettings): {
    sectionKey: string;
    createMode?: string;
    tableType?: string;
} {
    let sectionEntityKey = '';
    let createMode: string | undefined;
    let tableType: string | undefined;

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

    return { sectionKey: sectionEntityKey, createMode, tableType };
}

/**
 * Creates linked table for a section
 *
 * @param table
 * @param pathToPage
 * @param sectionSettings
 * @param sectionSettings.sectionKey
 * @param sectionSettings.createMode
 * @param sectionSettings.tableType
 */
function createLinkedTableForSection(
    table: TableNode,
    pathToPage: string[],
    sectionSettings: { sectionKey: string; createMode?: string; tableType?: string }
): Table {
    return {
        type: table.type,
        annotation: table,
        configuration: createSectionTableConfiguration(
            pathToPage,
            sectionSettings.sectionKey,
            sectionSettings.createMode,
            sectionSettings.tableType
        ),
        children: []
    };
}

/**
 * Gets entity set and entity type from service
 *
 * @param service
 * @param entitySetName
 */
function getEntityData(service: ParsedService, entitySetName: string) {
    const entity = service.index.entitySets[entitySetName];
    const entityType = entity?.structuredType;
    return { entity, entityType };
}

/**
 * Creates page configuration
 *
 * @param path
 * @param name
 * @param createMode
 */
function createPageConfiguration(path: string[], name: string, createMode: string | undefined) {
    return {
        createMode: {
            values: createModeValues,
            configurationPath: [...path, name, 'component', 'settings', 'createMode'],
            valueInFile: createMode
        }
    };
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
             * Absolute path in manifest where this configuration is defined.
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
 * Links a list report page
 *
 * @param context
 * @param service
 * @param linkedApp
 * @param path
 * @param name
 * @param target
 * @param componentName
 */
function linkListReportPage(
    context: LinkerContext,
    service: ParsedService,
    linkedApp: LinkedFeV2App,
    path: string[],
    name: string,
    target: ManifestPageSettings,
    componentName: 'sap.suite.ui.generic.template.ListReport' | 'sap.suite.ui.generic.template.AnalyticalListPage'
): void {
    const entitySetName = target.entitySet;
    if (!entitySetName) {
        return;
    }

    const { entity, entityType } = getEntityData(service, entitySetName);
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
        configuration: createPageConfiguration(path, name, createMode),
        entitySetName,
        entity,
        tables: [],
        lookup: {}
    };

    linkListReportTable(page, [...path, name], table, target);
    linkedApp.pages.push(page);
}

/**
 * Links an object page
 *
 * @param context
 * @param service
 * @param linkedApp
 * @param path
 * @param name
 * @param target
 */
function linkObjectPagePage(
    context: LinkerContext,
    service: ParsedService,
    linkedApp: LinkedFeV2App,
    path: string[],
    name: string,
    target: ManifestPageSettings
): void {
    const entitySetName = target.entitySet;
    if (!entitySetName) {
        return;
    }

    const { entity, entityType } = getEntityData(service, entitySetName);
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
        componentName: 'sap.suite.ui.generic.template.ObjectPage',
        configuration: createPageConfiguration(path, name, createMode),
        entitySetName,
        entity,
        sections: [],
        lookup: {}
    };

    linkObjectPageSections(page, [...path, name], entity, mainService, sections, target);
    linkedApp.pages.push(page);
}

/**
 * Links a page based on component type
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
        linkListReportPage(context, service, linkedApp, path, name, target, componentName);
    } else if (componentName === 'sap.suite.ui.generic.template.ObjectPage') {
        linkObjectPagePage(context, service, linkedApp, path, name, target);
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
        const configurationKey = getConfigurationKey(table.annotationPath);
        const tableSettingsConfig = configuration.component?.settings?.tableSettings ?? {};
        const createMode = tableSettingsConfig.createMode;
        const tableType = tableSettingsConfig.type;

        const linkedTable: Table = {
            type: table.type,
            annotation: table,
            configuration: createTableConfiguration(pathToPage, createMode, tableType),
            children: []
        };

        controls[`${linkedTable.type}|${configurationKey}`] = linkedTable;
    }

    const configurations = configuration.component?.settings?.sections ?? {};
    for (const [sectionKey, sectionConfig] of Object.entries(configurations)) {
        const tableControl = controls[`table|${sectionKey}`];
        const createMode = sectionConfig.createMode;
        const tableType = sectionConfig.tableSettings?.type;
        if (!tableControl) {
            const orphanedSection: OrphanTable = {
                type: 'orphan-table',
                configuration: createSectionTableConfiguration(pathToPage, sectionKey, createMode, tableType)
            };
            controls[`${orphanedSection.type}|${sectionKey}`] = orphanedSection;
        }
    }

    for (const control of Object.values(controls)) {
        page.lookup[control.type] ??= [] as any;
        (page.lookup[control.type] as any[]).push(control);
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
    sections: TableSectionNode[],
    configuration: ManifestPageSettings
): void {
    const controls: Record<string, Section | Table> = {};

    for (const section of sections) {
        if (section.type !== 'table-section') {
            continue;
        }

        const table = section.children[0];
        if (table.type !== 'table') {
            continue;
        }

        const configurationKey = getConfigurationKey(table.annotationPath);
        const linkedSection: TableSection = {
            type: section.type,
            annotation: section,
            configuration: {},
            children: []
        };
        controls[`${section.type}|${configurationKey}`] = linkedSection;

        const sectionSettings = findSectionSettings(configuration);
        const linkedTable = createLinkedTableForSection(table, pathToPage, sectionSettings);

        linkedSection.children.push(linkedTable);
        controls[`${linkedTable.type}|${configurationKey}`] = linkedTable;
    }

    const configurations = configuration.component?.settings?.sections ?? {};
    for (const [sectionKey, sectionConfig] of Object.entries(configurations)) {
        const sectionControl = controls[`table-section|${sectionKey}`];
        if (!sectionControl) {
            const createMode = sectionConfig.createMode;
            const tableType = sectionConfig.tableSettings?.type;

            const orphanedSection: OrphanSection = {
                type: 'orphan-section',
                configuration: createSectionTableConfiguration(pathToPage, sectionKey, createMode, tableType)
            };
            controls[`${orphanedSection.type}|${sectionKey}|`] = orphanedSection;
        }
    }

    for (const control of Object.values(controls)) {
        if (control.type === 'table-section') {
            page.sections.push(control);
        }
        page.lookup[control.type] ??= [] as any;
        (page.lookup[control.type] as any[]).push(control);
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
                configurationPath: ['sap.ui.generic.app', 'settings', 'tableSettings', 'createMode'],
                valueInFile: createMode
            }
        }
    };
    return linkedApp;
}
