import OverlayRegistry from 'sap/ui/dt/OverlayRegistry';
import FlexCommand from 'sap/ui/rta/command/FlexCommand';

import { DialogFactory, DialogNames } from '../../dialog-factory';
import { NestedQuickActionDefinition, QuickActionContext } from '../../../cpe/quick-actions/quick-action-definition';
import { getUi5Version, isLowerThanMinimalUi5Version } from '../../../utils/version';
import { DIALOG_ENABLEMENT_VALIDATOR } from '../dialog-enablement-validator';
import { getExistingController } from '../../api-handler';
import { getControllerInfoForControl } from '../../utils';
import { getV4AppComponent } from '../../../utils/fe-v4';
import { TableQuickActionDefinitionBase } from '../table-quick-action-base';
import { MDC_TABLE_TYPE } from '../control-types';
import { isA } from '../../../utils/core';
import Table from 'sap/ui/mdc/Table';
import XMLView from 'sap/ui/core/mvc/XMLView';
import ActionToolbarAction from 'sap/ui/mdc/actiontoolbar/ActionToolbarAction';
import { getPropertyPath } from './utils';

export const CREATE_TABLE_ACTION = 'create-table-action';

interface ViewDataType {
    stableId: string;
}
const regexForAnnotationPath =
    /controlConfiguration\/(?:[^@]+\/)?@com\.sap\.vocabularies\.UI\.v1\.LineItem(?:#[^/]+)?\/actions\//;

/**
 * Quick Action for adding a custom page action.
 */
export class AddTableActionQuickAction extends TableQuickActionDefinitionBase implements NestedQuickActionDefinition {
    protected pageId: string | undefined;
    constructor(context: QuickActionContext) {
        super(CREATE_TABLE_ACTION, [MDC_TABLE_TYPE], 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION', context, undefined, [
            DIALOG_ENABLEMENT_VALIDATOR
        ]);
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
        const propertyPath = `${getPropertyPath(table)}`;
        if (!table || !propertyPath) {
            return [];
        }
        if (table) {
            const overlay = OverlayRegistry.getOverlay(table) || [];
            const controlInfo = getControllerInfoForControl(table);
            const data = await getExistingController(controlInfo.controllerName);
            const controllerPath = data.controllerPathFromRoot.replaceAll('/', '.').replace(/\.[^.]+$/, '');
            await DialogFactory.createDialog(
                overlay,
                this.context.rta,
                DialogNames.ADD_ACTION,
                undefined,
                {
                    title: 'QUICK_ACTION_ADD_CUSTOM_TABLE_ACTION',
                    controllerReference: controllerPath
                        ? `.extension.${controllerPath}.<methodName>`
                        : '.extension.<ApplicationId.FolderName.ScriptFilename.methodName>',
                    actionType: 'tableAction',
                    appDescriptor: {
                        appComponent: getV4AppComponent(this.context.view)!,
                        appType: 'fe-v4',
                        pageId: this.pageId!,
                        projectId: this.context.flexSettings.projectId
                    },
                    validateActionId: (actionId) => {
                        const actionPaths = [...this.context.changeService.getAllPendingConfigPropertyPath()].filter(
                            (path) => regexForAnnotationPath.test(path)
                        );
                        const idInPendingChanges = actionPaths.includes(`${propertyPath}${actionId}`);
                        if (idInPendingChanges) {
                            return false;
                        }
                        if (
                            isA(MDC_TABLE_TYPE, table) &&
                            (table as Table).getActions().every(
                                (action) =>
                                    !(action as ActionToolbarAction)
                                        .getAction()
                                        .getId()
                                        .endsWith(`CustomAction::${actionId}`)
                            )
                        ) {
                            return true;
                        }
                        return false;
                    },
                    position: calculatePosition(table as Table, this.context.view),
                    propertyPath
                },
                { actionName: this.type, telemetryEventIdentifier: this.getTelemetryIdentifier() }
            );
        }
        return [];
    }
}

function calculatePosition(table: Table, view: XMLView): { placement: 'Before' | 'After'; anchor: string } | undefined {
    const actions = table.getActions() as ActionToolbarAction[];
    if (!actions.length) {
        return undefined;
    }
    const annotationAction = actions.findIndex((action) =>
        action.getAction().getId().includes('::DataFieldForAction::')
    );
    const customAction = actions.findIndex((action) => action.getAction().getId().includes('::CustomAction::'));
    if (annotationAction === -1 && customAction === -1) {
        return undefined;
    }
    // determine the least index of either annotation or custom action
    let actionIndex: number;
    if (annotationAction === -1) {
        actionIndex = customAction;
    } else if (customAction === -1) {
        actionIndex = annotationAction;
    } else {
        actionIndex = Math.min(annotationAction, customAction);
    }
    const actionToolBarAction = actions[actionIndex];
    let anchor;
    let action = actionToolBarAction?.getAction();

    if (action) {
        const localId = view.getLocalId(action.getId()) ?? '';
        if (localId.includes('CustomAction::')) {
            const str = localId.substring(Math.max(0, localId.lastIndexOf('CustomAction::')));
            anchor = str.split('::').pop();
        } else {
            anchor = localId.substring(localId.lastIndexOf('DataFieldForAction::'));
        }
    }
    if (!anchor) {
        return undefined;
    }

    return {
        placement: 'Before',
        anchor
    };
}
