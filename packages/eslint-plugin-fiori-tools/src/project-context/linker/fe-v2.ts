import { Manifest } from '@sap-ux/project-access';

import { MetadataElement, parseIdentifier, parsePath, toFullyQualifiedPath } from '@sap-ux/odata-annotation-core';
import { ServiceIndex } from '../parser/service';
import { LinkerContext } from './types';
import { get } from 'http';
import { getParsedServiceByName } from '../utils';
import { ParsedService } from '../parser';

export interface LinkedFeV2App {
    type: 'fe-v2';
    pages: FeV2PageType[];
}

export interface FeV2ListReport {
    targetName: string;
    componentName: 'sap.suite.ui.generic.template.ListReport';
    entitySetName: string;
    entity: MetadataElement;
    settings: {};
    tables: ListReportControlConfiguration[];
}

export type FeV2PageType = FeV2ListReport;

export type ListReportControlConfiguration = TableConfiguration;

export interface TableConfiguration {
    type: 'table';
}

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
        for (const [name, target] of Object.entries(config ?? {})) {
            linkPage(context, service, linkedApp, name, target);
        }
    }
    return linkedApp;
}

interface PageSettings {
    navigationProperty?: string;
    entitySet?: string;
    component?: {
        name: string;
    };
    pages?: { [name: string]: PageSettings };
}

function linkPage(
    context: LinkerContext,
    service: ParsedService,
    linkedApp: LinkedFeV2App,
    name: string,
    target: PageSettings
): void {
    const componentName = target?.component?.name;
    if (componentName === 'sap.suite.ui.generic.template.ListReport') {
        const entitySetName = target.entitySet;
        if (!entitySetName) {
            return;
        }
        const entity = service.index.entitySets[entitySetName];

        if (!entity) {
            return;
        }
        linkedApp.pages.push({
            targetName: name,
            componentName,
            entitySetName: entitySetName,
            entity: entity,
            settings: {},
            tables: []
        });
    }
}
