import UI5Element from 'sap/ui/core/Element';

import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';

import { getRelevantControlFromActivePage } from '../../cpe/quick-actions/utils';
import { QuickActionContext } from '../../cpe/quick-actions/quick-action-definition';
import { EnablementValidator } from './enablement-validator';
import { QuickActionDefinitionBase } from './quick-action-base';

/**
 * Base class for all simple quick actions.
 */
export abstract class SimpleQuickActionDefinitionBase<
    T extends UI5Element = UI5Element
> extends QuickActionDefinitionBase<typeof SIMPLE_QUICK_ACTION_KIND> {
    public get isApplicable(): boolean {
        return this.control !== undefined;
    }

    protected control: T | undefined;

    constructor(
        public readonly type: string,
        protected readonly controlTypes: string[],
        protected readonly defaultTextKey: string,
        protected readonly context: QuickActionContext,
        protected readonly enablementValidators: EnablementValidator[] = []
    ) {
        super(type, SIMPLE_QUICK_ACTION_KIND, defaultTextKey, context, enablementValidators);
    }

    initialize(): Promise<void> {
        for (const control of getRelevantControlFromActivePage<T>(
            this.context.controlIndex,
            this.context.view,
            this.controlTypes
        )) {
            this.control = control;
            break;
        }
        return Promise.resolve();
    }

    getActionObject(): SimpleQuickAction {
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            id: this.id,
            enabled: !this.isDisabled,
            tooltip: this.tooltip,
            title: this.context.resourceBundle.getText(this.textKey)
        };
    }
}
