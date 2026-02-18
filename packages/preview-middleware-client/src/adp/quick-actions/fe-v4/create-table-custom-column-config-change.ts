import type FlexCommand from 'sap/ui/rta/command/FlexCommand';
import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';

import { QuickActionContext, NestedQuickActionDefinition } from '../../../cpe/quick-actions/quick-action-definition';
import { DialogFactory, DialogNames } from '../../dialog-factory';
import { SMART_TABLE_TYPE, GRID_TABLE_TYPE, MDC_TABLE_TYPE, TREE_TABLE_TYPE } from '../control-types';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';

import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';
import Table from 'sap/ui/mdc/Table';
import { getV4AppComponent, isMacroTable } from '../../../utils/fe-v4';
import { getLineItemAnnotation, getPropertyPath } from './utils';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import { isA } from '../../../utils/core';
import UI5Element from 'sap/ui/core/Element';

interface ViewDataType {
    stableId: string;
}
export const CREATE_TABLE_CUSTOM_COLUMN = 'create-table-custom-column';
const regexForAnnotationPath =
    /controlConfiguration\/(?:entity\/)?@com\.sap\.vocabularies\.UI\.v1\.LineItem(?:#[^/]+)?\/columns\//;

export const CONTROL_TYPES = [SMART_TABLE_TYPE, MDC_TABLE_TYPE, TREE_TABLE_TYPE, GRID_TABLE_TYPE];

export class AddTableCustomColumnQuickAction
    extends TableQuickActionDefinitionBase
    implements NestedQuickActionDefinition
{
    protected pageId: string | undefined;
    constructor(context: QuickActionContext) {
        super(
            CREATE_TABLE_CUSTOM_COLUMN,
            CONTROL_TYPES,
            'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN',
            context,
            {
                validateTableColumns: true
            },
            [DIALOG_ENABLEMENT_VALIDATOR]
        );
    }
    async initialize(): Promise<void> {
        this.pageId = (this.context.view.getViewData() as ViewDataType)?.stableId.split('::').pop() as string;
        const version = await getUi5Version();
        if (isLowerThanMinimalUi5Version(version, { major: 1, minor: 120 })) {
            return;
        }
        await super.initialize();
    }

    async execute(path: string): Promise<FlexCommand[]> {
        const { table } = this.tableMap[path];
        if (!table) {
            return [];
        }
        if (table) {
            const overlay = OverlayRegistry.getOverlay(table) || [];
            const propertyPath = `${getPropertyPath(table, 'columns')}`;
            const anchor = findAnchor(table);
            await DialogFactory.createDialog(
                overlay,
                this.context.rta,
                DialogNames.ADD_CUSTOM_FRAGMENT,
                undefined,
                {
                    title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_COLUMN',
                    type: 'tableColumn',
                    appDescriptor: {
                        appComponent: getV4AppComponent(this.context.view)!,
                        appType: 'fe-v4',
                        pageId: this.pageId!,
                        projectId: this.context.flexSettings.projectId,
                        anchor
                    },
                    validateId: (columnId) => {
                        const customColumnInPending = [
                            ...this.context.changeService.getAllPendingConfigPropertyPath()
                        ].filter((path) => regexForAnnotationPath.test(path));
                        const idInPendingChanges = customColumnInPending.includes(`${propertyPath}${columnId}`);
                        if (idInPendingChanges) {
                            return false;
                        }
                        if (
                            isA(MDC_TABLE_TYPE, table) &&
                            (table as Table)
                                .getColumns()
                                .every((col) => !col.getId().endsWith(`CustomColumn::${columnId}`))
                        ) {
                            return true;
                        }
                        return false;
                    },
                    propertyPath
                },
                { actionName: this.type, telemetryEventIdentifier: this.getTelemetryIdentifier() }
            );
        }
        return [];
    }
}
function findAnchor(table: UI5Element): string {
    const macroTable = table.getParent();
    let anchor: string = '';
    if (isMacroTable(macroTable)) {
        let metaPath = '';
        if (macroTable.metaPath.includes('LineItem')) {
            metaPath = macroTable.metaPath;
        } else {
            const segments = macroTable.metaPath.split('/');
            segments.pop();
            const path = segments.join('/');
            metaPath = `${path}/${getLineItemAnnotation(macroTable)}`;
        }
        if (!metaPath) {
            return '';
        }
        const columns = macroTable.getModel()?.getMetaModel()?.getObject(metaPath);
        const filteredColumns = columns.filter(
            (col: { $Type: string; Inline?: boolean; SemanticObject?: string; Action?: string }) =>
                [
                    'com.sap.vocabularies.UI.v1.DataField',
                    'com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation',
                    'com.sap.vocabularies.UI.v1.DataFieldForAnnotation'
                ].includes(col.$Type) ||
                ('com.sap.vocabularies.UI.v1.DataFieldForAction' === col.$Type && col.Inline)
        ) as {
            $Type: string;
            Inline?: boolean;
            Value: { $Path: string };
            Action: string;
            SemanticObject?: string;
            Target?: { $AnnotationPath: string };
        }[];
        const lastColumn = filteredColumns[filteredColumns.length - 1];
        if (lastColumn.$Type === 'com.sap.vocabularies.UI.v1.DataFieldForAction') {
            anchor = `DataFieldForAction::${lastColumn.Action}`;
        } else if (lastColumn.$Type === 'com.sap.vocabularies.UI.v1.DataField') {
            anchor = `DataField::${lastColumn.Value?.$Path}`;
        } else if (lastColumn.$Type === 'com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation') {
            anchor = `DataFieldForIntentBasedNavigation::${lastColumn.SemanticObject}::${lastColumn.Action}`;
        } else if (lastColumn.$Type === 'com.sap.vocabularies.UI.v1.DataFieldForAnnotation') {
            const annotationPath = lastColumn.Target?.$AnnotationPath;
            if (!annotationPath) {
                return '';
            }
            const annotation = annotationPath.split('.').pop();
            anchor = `DataFieldForAnnotation::${annotation?.split('#').join('::')}`;
        }
    }
    return anchor;
}
