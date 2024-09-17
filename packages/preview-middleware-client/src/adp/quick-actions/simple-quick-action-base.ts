import UI5Element from 'sap/ui/core/Element';

import { SIMPLE_QUICK_ACTION_KIND, SimpleQuickAction } from '@sap-ux-private/control-property-editor-common';

import { getRelevantControlFromActivePage } from '../../cpe/quick-actions/utils';
import { QuickActionContext } from '../../cpe/quick-actions/quick-action-definition';

/**
 * Base class for all simple quick actions.
 */
export abstract class SimpleQuickActionDefinitionBase {
    readonly kind = SIMPLE_QUICK_ACTION_KIND;
    public get id(): string {
        return `${this.context.key}-${this.type}`;
    }

    public get isActive(): boolean {
        return this.control !== undefined;
    }

    protected get textKey(): string {
        return this.defaultTextKey;
    }

    protected control: UI5Element | undefined;

    constructor(
        public readonly type: string,
        protected readonly controlTypes: string[],
        protected readonly defaultTextKey: string,
        protected readonly context: QuickActionContext
    ) {}

    initialize(): void {
        for (const control of getRelevantControlFromActivePage(
            this.context.controlIndex,
            this.context.view,
            this.controlTypes
        )) {
            this.control = control;
            break;
        }
    }

    getActionObject(): SimpleQuickAction {
        return {
            kind: SIMPLE_QUICK_ACTION_KIND,
            id: this.id,
            enabled: this.isActive,
            title: this.context.resourceBundle.getText(this.textKey)
        };
    }
}
