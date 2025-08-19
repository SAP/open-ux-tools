import i18next from 'i18next';
import type { JSONSchema4 } from 'json-schema';
import { ObjectAggregation } from '../ObjectAggregation';
import { SortingOptions, AggregationActions } from '../types';
import { validateExtension, validateMacrosExtension } from '../utils';
import type { PageEditProperty } from '../PageEditProperty';

export class FilterFieldAggregation extends ObjectAggregation {
    public actions = [AggregationActions.Delete];
    public sortableItem: SortingOptions | undefined = SortingOptions.Enabled;
    public isViewNode = true;

    /**
     * Method returns display name of aggregation without applying i18n translation.
     * Overwritten for column handling.
     * @returns {string} Display name of aggregation.
     */
    protected getRawDisplayName(): string {
        const displayName = super.getRawDisplayName();
        if (!displayName) {
            // Fallback when no label presented
            const fieldName = this.getTechnicalName();
            if (fieldName) {
                return fieldName;
            }
        }
        return displayName;
    }

    /**
     * Method parses object path key and returns field name / technical id.
     * @returns {string | undefined} Field name / technical id.
     */
    public getTechnicalName(): string | undefined {
        const key = this.path[this.path.length - 1];
        if (key) {
            const separator = '::';
            const parts = key.toString().split(separator);
            const fieldName = parts[parts.length - 1];
            if (fieldName) {
                return fieldName;
            }
        }
    }

    /**
     * Public method to mark filter field as custom filter field.
     */
    public markAsCustomFilterField(): void {
        this.custom = true;
        this.actions = [AggregationActions.OpenSource];
        if (!this.isMacrosNode()) {
            this.actions.push(AggregationActions.Delete);
        }
        this.sortableItem = SortingOptions.Enabled;
        this.additionalText = i18next.t('PAGE_EDITOR_OUTLINE_NODE_DESC_CUSTOM_FILTER_FIELD');
        this.i18nKey = this.parent?.i18nKey;
        if (this.isMacrosNode()) {
            // validate custom filterfield key
            validateMacrosExtension(this);
        }
        // Validate anchor
        const anchor = this.properties.anchor;
        if (anchor?.value) {
            // Validate anchor if value exists
            const validEntries = anchor.schema.oneOf || [];
            if (!validEntries.some((entry) => entry.const === anchor.value)) {
                validateExtension(this, false, i18next.t('PAGE_EDITOR_CUSTOM_EXTENSION_NO_ANCHOR'));
            }
        }
    }

    /**
     * Method adds property object.
     * Overwritten to disable "property" property - it is done till we clarify how to handle it correctly.
     * @param {string} name Name of property.
     * @param {JSONSchema4} schema Schema object of property.
     * @returns {PageEditProperty} Instance of new property.
     */
    public addProperty(name: string, schema: JSONSchema4): PageEditProperty {
        const property = super.addProperty(name, schema);
        if (name === 'property') {
            property.disabled = true;
        }
        return property;
    }
}
