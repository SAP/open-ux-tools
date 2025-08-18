import i18next from 'i18next';
import { ObjectAggregation } from '../ObjectAggregation';
import { AggregationActions, SortingOptions, DATA_FIELD_ACTION } from '../types';
import type { DefaultExtensionPosition } from '../utils/sort';
import { validateExtension, validateMacrosExtension } from '../utils';

export class ActionAggregation extends ObjectAggregation {
    public actions = [AggregationActions.Delete];
    public sortableItem: SortingOptions | undefined = SortingOptions.Enabled;
    public isViewNode = true;
    public sortableCollection: string | undefined = 'actions';
    public data?: DefaultExtensionPosition;

    /**
     * Method parses object path key and returns action name.
     * @return {string | undefined} Action name.
     */
    public getTechnicalName(): string | undefined {
        const key = this.path[this.path.length - 1];
        if (key && typeof key === 'string') {
            const keyParts = key.split('::');
            // Primary method - check for specific key format using 'DATA_FIELD_ACTION'
            let action = '';
            if (keyParts[keyParts.length - 1].includes('.')) {
                for (let i = 0; i < keyParts.length; i++) {
                    if (keyParts[i] === DATA_FIELD_ACTION && keyParts[i + 1]) {
                        action = keyParts[i + 1];
                    }
                }
            } else {
                action = keyParts[keyParts.length - 1];
            }
            if (action) {
                const actionParts = action.split('.');
                return actionParts[actionParts.length - 1];
            }
        }
        return super.getTechnicalName();
    }

    /**
     * Public method to mark action as custom action.
     */
    public markAsCustomAction(): void {
        this.custom = true;
        this.actions = [AggregationActions.OpenSource];
        this.sortableItem = SortingOptions.Enabled;
        this.additionalText = i18next.t('PAGE_EDITOR_OUTLINE_NODE_DESC_CUSTOM_ACTION');
        this.i18nKey = this.parent?.i18nKey;
        if (this.isMacrosNode()) {
            validateMacrosExtension(this);
        } else {
            this.actions.push(AggregationActions.Delete);
        }
        // Validate anchor
        const anchor = this.aggregations.position?.properties.anchor;
        if (anchor?.value) {
            // Validate anchor if value exists
            const validEntries = anchor.schema.oneOf || [];
            if (!validEntries.some((entry) => entry.const === anchor.value)) {
                validateExtension(this, false, i18next.t('PAGE_EDITOR_CUSTOM_EXTENSION_NO_ANCHOR'));
            }
        }
    }

    /**
     * Public method to mark action as standard action.
     */
    public markAsStandardAction(): void {
        this.sortableItem = SortingOptions.Readonly;
        this.additionalText = i18next.t('PAGE_EDITOR_OUTLINE_NODE_DESC_STANDARD_ACTION');
        this.i18nKey = this.parent?.i18nKey;
        this.removeAction(AggregationActions.Delete);
    }

    /**
     * Method returns action type from schema data.
     * @returns Action type from schema.
     */
    public getActionType(): string | undefined {
        return typeof this.schema?.actionType === 'string' ? this.schema.actionType : undefined;
    }
}
