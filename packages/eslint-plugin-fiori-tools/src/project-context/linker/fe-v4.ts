import type { MetadataElement } from '@sap-ux/odata-annotation-core';
import type { ParsedService, IndexedAnnotation } from '../parser';
import { buildAnnotationIndexKey } from '../parser';
import type { LinkerContext } from './types';
import { getParsedServiceByName } from '../utils';
import { UI_LINE_ITEM } from '../../constants';

export interface LinkedFeV4App {
    type: 'fe-v4';
    pages: FeV4PageType[];
}

export interface FeV4ListReport {
    targetName: string;
    componentName: 'sap.fe.templates.ListReport';
    contextPath: string;
    entity: MetadataElement;
    settings: {};
    tables: PageControlConfiguration[];
}

export interface FeV4ObjectPage {
    targetName: string;
    componentName: 'sap.fe.templates.ObjectPage';
    contextPath: string;
    entity: MetadataElement;
    settings: {};
    tables: PageControlConfiguration[];
}

export type FeV4PageType = FeV4ListReport | FeV4ObjectPage;

export type PageControlConfiguration = TableConfiguration;

export interface TableConfiguration {
    type: 'table';
    annotation: IndexedAnnotation;
    annotationPath: string;
    configurationPath: string[];
    settings: {
        tableType: 'ResponsiveTable' | 'GridTable' | 'AnalyticalTable' | 'TreeTable';
        widthIncludingColumnHeader: boolean;
        disableCopyToClipboard: boolean;
    };
}

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
            if (target.name === 'sap.fe.templates.ListReport' || target.name === 'sap.fe.templates.ObjectPage') {
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
                const controlConfiguration = settings?.controlConfiguration ?? {};

                // currently do not support multiple views
                const { tables } = settings.views
                    ? { tables: [] }
                    : linkControls(entity, mainService, controlConfiguration);

                linkedApp.pages.push({
                    targetName: name,
                    componentName: target.name,
                    contextPath: target.contextPath,
                    entity: entity,
                    settings: {},
                    tables
                });
            }
        }
    }
    return linkedApp;
}

interface TableControlConfiguration {
    tableSettings?: {
        type?: string;
        widthIncludingColumnHeader?: boolean;
        disableCopyToClipboard?: boolean;
    };
}

type ControlConfiguration = TableControlConfiguration;

/**
 *
 * @param entity
 * @param service
 */
function linkControls(
    entity: MetadataElement,
    service: ParsedService,
    controlConfigurations: { [path: string]: ControlConfiguration }
): { tables: PageControlConfiguration[] } {
    const tables: { [path: string]: PageControlConfiguration } = {};
    if (!entity.structuredType) {
        return { tables: [] };
    }

    for (const [path, settings] of Object.entries(controlConfigurations)) {
        if (path.indexOf('[') !== -1) {
            // do not support expressions
            continue;
        }
        let [contextPath, annotationPath] = path.split('@');

        const annotationSegments = annotationPath.split('/');
        if (annotationSegments.length > 1) {
            // do not support nested annotations
            continue;
        }
        let controlEntity: MetadataElement | undefined = entity;
        const entityStructureType = entity?.structuredType;
        if (!entityStructureType) {
            continue;
        }
        const pageEntityType = service.artifacts.metadataService.getMetadataElement(entityStructureType);
        if (!pageEntityType) {
            continue;
        }
        if (contextPath !== '') {
            if (contextPath.endsWith('/')) {
                contextPath = contextPath.slice(0, -1);
            }
            controlEntity = contextPath.startsWith('/')
                ? getEntityForContextPath(contextPath, service)
                : resolveNavigationProperties(pageEntityType, contextPath.split('/'));
        }

        const entityType = controlEntity?.structuredType;
        if (!entityType) {
            continue;
        }
        const [term, qualifier] = annotationPath.split('#');

        if (term === UI_LINE_ITEM) {
            const lineItemKey = qualifier
                ? `${buildAnnotationIndexKey(entityType, UI_LINE_ITEM)}#${qualifier}`
                : buildAnnotationIndexKey(entityType, UI_LINE_ITEM);

            const lineItems = service.index.annotations[lineItemKey] ?? [];
            const defaultLineItems = lineItems['undefined'];

            const table = tables[lineItemKey] ?? {
                type: 'table',
                tableType: 'ResponsiveTable',
                annotationPath: lineItemKey,
                configurationPath: [path],
                annotation: defaultLineItems,
                settings: {
                    tableType: 'ResponsiveTable',
                    widthIncludingColumnHeader: false,
                    disableCopyToClipboard: undefined
                }
            };
            // update existing table
            if (settings?.tableSettings?.widthIncludingColumnHeader !== undefined) {
                table.settings.widthIncludingColumnHeader = settings.tableSettings.widthIncludingColumnHeader;
            }
            if (settings?.tableSettings?.disableCopyToClipboard !== undefined) {
                table.settings.disableCopyToClipboard = settings.tableSettings.disableCopyToClipboard;
            }
            if (settings?.tableSettings?.type !== undefined) {
                const tableType = getTableType(settings.tableSettings.type);
                if (tableType) {
                    table.settings.tableType = tableType;
                } else {
                    // TODO: create diagnostic message
                }
            }
            tables[lineItemKey] = table;
        }
    }
    return { tables: Object.values(tables) };
}

/**
 *
 * @param value
 */
function getTableType(value: string): TableConfiguration['settings']['tableType'] | undefined {
    switch (value) {
        case 'ResponsiveTable':
        case 'GridTable':
        case 'AnalyticalTable':
        case 'TreeTable':
            return value;
        default:
            return undefined;
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
    } else if (settings.entitySet) {
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
