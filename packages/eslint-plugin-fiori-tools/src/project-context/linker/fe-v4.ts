import type { MetadataElement } from '@sap-ux/odata-annotation-core';
import type { ParsedService } from '../parser';
import type { LinkerContext, ConfigurationBase } from './types';
import { getParsedServiceByName } from '../utils';
import type { AnnotationNode, TableNode, TableSectionNode } from './annotations';
import { collectTables, collectSections } from './annotations';

export interface ApplicationSetting {
    createMode: string;
}

export interface LinkedFeV4App extends ConfigurationBase<'fe-v4', ApplicationSetting> {
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

export type OrphanSection = ConfigurationBase<'orphan-section', {}>;
export type TableSection = AnnotationBasedNode<TableSectionNode, {}, Table>;
export type Section = TableSection | OrphanSection;
export interface TableSettings {
    creationMode: string;
    tableType: string;
    widthIncludingColumnHeader: boolean;
    disableCopyToClipboard: boolean;
    enableExport: boolean;
    enablePaste: boolean;
}

export type OrphanTable = ConfigurationBase<'orphan-table', TableSettings>;
export type Table = AnnotationBasedNode<TableNode, TableSettings>;

interface ManifestApplicationSettings {
    macros?: {
        table?: {
            defaultCreationMode?: string;
        };
    };
}

const tableTypeValues = ['ResponsiveTable', 'GridTable', 'AnalyticalTable', 'TreeTable'];

/**
 * Creates a table or orphan table object with configuration paths.
 *
 * @param configurationKey - The key identifying this table in the configuration
 * @param pathToPage - Configuration path segments to the page
 * @param table - The table node from annotations, if available
 * @returns A linked table or orphan table object
 */
function createTable(configurationKey: string, pathToPage: string[], table?: TableNode): Table | OrphanTable {
    const base: Omit<Table, 'type' | 'children'> = {
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
            },
            enableExport: {
                configurationPath: [
                    ...pathToPage,
                    'options',
                    'settings',
                    'controlConfiguration',
                    configurationKey,
                    'tableSettings',
                    'enableExport'
                ],
                values: [true, false]
            },
            enablePaste: {
                configurationPath: [
                    ...pathToPage,
                    'options',
                    'settings',
                    'controlConfiguration',
                    configurationKey,
                    'tableSettings',
                    'enablePaste'
                ],
                values: [true, false]
            },
            creationMode: {
                configurationPath: [
                    ...pathToPage,
                    'options',
                    'settings',
                    'controlConfiguration',
                    configurationKey,
                    'tableSettings',
                    'creationMode',
                    'name'
                ],
                values: getCreationModeValues()
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

/**
 * Returns valid creation mode values based on the table type.
 *
 * @param tableType - The type of table (e.g., TreeTable, ResponsiveTable)
 */
function getCreationModeValues(tableType?: string): string[] {
    if (tableType === 'TreeTable') {
        return ['Inline', 'NewPage', 'CreationDialog'];
    }

    return ['InlineCreationRows', 'NewPage'];
}

export type Node = Section | Table | OrphanTable;
export type NodeLookup<T extends Node> = {
    [K in T['type']]?: Extract<T, { type: K }>[];
};

/**
 * Runs the Fiori Elements V4 linker to build linked app structure.
 *
 * @param context - The linker context containing app and service information
 */
export function runFeV4Linker(context: LinkerContext): LinkedFeV4App {
    const linkedApp = linkApplicationSettings(context);
    const manifest = context.app.manifestObject;
    const routingTargets = manifest['sap.ui5']?.routing?.targets;
    if (!routingTargets) {
        return linkedApp;
    }
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
            linkListReport(context, linkedApp, path, name, contextPath, entity, target);
        } else if (target.name === 'sap.fe.templates.ObjectPage' && entity.structuredType) {
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
            linkObjectPageSections(page, path, name, sections, target);
            linkedApp.pages.push(page);
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
        enableExport?: boolean;
        enablePaste?: boolean;
        creationMode?: {
            name?: string;
        };
    };
}

/**
 * Links a list report page with its tables and configurations for Fiori Elements V4.
 *
 * @param context - The linker context containing app and service information
 * @param linkedApp - The linked app to add the page to
 * @param path - Configuration path segments
 * @param name - The target name
 * @param contextPath - The entity context path
 * @param entity - The metadata element for the entity
 * @param target - The routing target configuration
 */
function linkListReport(
    context: LinkerContext,
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
 * Links tables in a list report page with their configurations.
 *
 * @param page - The list report page being linked
 * @param pathToPage - Configuration path segments to the page
 * @param tables - Array of table nodes to link
 * @param configuration - The routing target configuration
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
                const tableType = controlConfiguration.tableSettings?.type;
                tableControl.configuration.tableType.valueInFile = tableType;
                const columnHeaderValue = controlConfiguration.tableSettings?.widthIncludingColumnHeader;
                tableControl.configuration.widthIncludingColumnHeader.valueInFile = columnHeaderValue;
                const disableCopyValue = controlConfiguration.tableSettings?.disableCopyToClipboard;
                tableControl.configuration.disableCopyToClipboard.valueInFile = disableCopyValue;
                const enableExportValue = controlConfiguration.tableSettings?.enableExport;
                tableControl.configuration.enableExport.valueInFile = enableExportValue;
                const enablePasteValue = controlConfiguration.tableSettings?.enablePaste;
                tableControl.configuration.enablePaste.valueInFile = enablePasteValue;
                const creationModeValue = controlConfiguration.tableSettings?.creationMode?.name;
                tableControl.configuration.creationMode.valueInFile = creationModeValue;
                tableControl.configuration.creationMode.values = getCreationModeValues(tableType);
            }
        } else {
            // no annotation definition found for this table, but configuration exists
            const orphanedSection = createTable(controlKey, pathToPage);
            controls[`${orphanedSection.type}|${controlKey}`] = orphanedSection;
        }
    }
    for (const control of Object.values(controls)) {
        page.lookup[control.type] ??= [];
        (page.lookup[control.type]! as Extract<Table | OrphanTable, { type: typeof control.type }>[]).push(control);
    }
}

/**
 * Collects table sections from annotation nodes and builds section structure.
 *
 * @param section - The table section node to process
 * @param controls - Record of controls indexed by type and key
 * @param pagePath - Configuration path segments to the page
 */
function collectTableSections(
    section: TableSectionNode,
    controls: Record<string, Section | Table>,
    pagePath: string[]
): void {
    if (section.type !== 'table-section') {
        return;
    }
    const table = section.children[0];
    if (table.type !== 'table') {
        return;
    }
    const configurationKey = table.annotationPath;
    const linkedSection: TableSection = {
        type: section.type,
        annotation: section,
        configuration: {},
        children: []
    };
    controls[`${section.type}|${configurationKey}`] = linkedSection;
    const linkedTable = createTable(configurationKey, pagePath, table);
    if (linkedTable.type === 'table') {
        linkedSection.children.push(linkedTable);
        controls[`${linkedTable.type}|${configurationKey}`] = linkedTable;
    }
}

/**
 * Links object page sections with their tables and configurations for Fiori Elements V4.
 *
 * @param page - The object page being linked
 * @param pathToPage - Configuration path segments to the page
 * @param pageName - The name of the page
 * @param sections - Array of table section nodes to link
 * @param configuration - The routing target configuration
 */
function linkObjectPageSections(
    page: FeV4ObjectPage,
    pathToPage: string[],
    pageName: string,
    sections: TableSectionNode[],
    configuration: Target
): void {
    const controls: Record<string, Section | Table> = {};

    for (const section of sections) {
        collectTableSections(section, controls, [...pathToPage, pageName]);
    }

    const configurations = configuration.options?.settings?.controlConfiguration ?? {};
    for (const [controlKey, controlConfiguration] of Object.entries(configurations)) {
        const sectionControl = controls[`table-section|${controlKey}`];
        if (sectionControl) {
            if (sectionControl.type !== 'table-section') {
                continue;
            }
            const tableControl = sectionControl.children[0];
            if (tableControl.type !== 'table') {
                continue;
            }
            const tableType = controlConfiguration.tableSettings?.type;
            tableControl.configuration.tableType.valueInFile = tableType;
            const value = controlConfiguration.tableSettings?.widthIncludingColumnHeader;
            tableControl.configuration.widthIncludingColumnHeader.valueInFile = value;
            const disableCopyValue = controlConfiguration.tableSettings?.disableCopyToClipboard;
            tableControl.configuration.disableCopyToClipboard.valueInFile = disableCopyValue;
            const enableExportValue = controlConfiguration.tableSettings?.enableExport;
            tableControl.configuration.enableExport.valueInFile = enableExportValue;
            const enablePasteValue = controlConfiguration.tableSettings?.enablePaste;
            tableControl.configuration.enablePaste.valueInFile = enablePasteValue;
            const creationModeValue = controlConfiguration.tableSettings?.creationMode?.name;
            tableControl.configuration.creationMode.valueInFile = creationModeValue;
            tableControl.configuration.creationMode.values = getCreationModeValues(tableType);
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
 * Retrieves the metadata element for an entity based on page settings.
 *
 * @param settings - The page settings containing contextPath or entitySet
 * @param service - The parsed OData service
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
 * Resolves a metadata element from a context path string.
 *
 * @param contextPath - The context path (e.g., '/EntitySet/NavigationProperty')
 * @param service - The parsed OData service
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
 * Resolves navigation properties along a path to find the target entity.
 *
 * @param root - The starting metadata element
 * @param segments - Array of navigation property names to traverse
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

/**
 * Links application-level settings from manifest configuration for Fiori Elements V4.
 *
 * @param context - Linker context containing parsed application data
 * @returns A linked Fiori Elements V4 application object
 */
function linkApplicationSettings(context: LinkerContext): LinkedFeV4App {
    const config: ManifestApplicationSettings = context.app.manifestObject['sap.fe'] ?? {};
    const createMode = config.macros?.table?.defaultCreationMode;
    const linkedApp: LinkedFeV4App = {
        type: 'fe-v4',
        pages: [],
        configuration: {
            createMode: {
                values: ['InlineCreationRows', 'NewPage'],
                configurationPath: ['sap.fe', 'macros', 'table', 'defaultCreationMode'],
                valueInFile: createMode
            }
        }
    };
    return linkedApp;
}
