import type { PageData, PropertyPath } from './types';
import {
    AggregationCreationForm,
    AggregationType,
    SortingOptions,
    AggregationActions,
    SCHEMA_CREATION_FORM
} from './types';
import type { JSONSchema4 } from 'json-schema';
import i18next from 'i18next';
import type { PageEditAggregationData } from './ObjectAggregation';
import { ObjectAggregation } from './ObjectAggregation';
import type { PageConfig, PageType } from '@sap/ux-specification/dist/types/src';

/**
 * Represents an aggregation for array object.
 */
export class ArrayAggregation extends ObjectAggregation {
    public readonly type = AggregationType.Array;

    /**
     * Creates an instance of `ArrayAggregation`.
     *
     * @param data Optional aggregation data object used to initialize properties.
     * @param schema Optional JSON schema fragment associated with this aggregation.
     */
    constructor(data?: PageEditAggregationData, schema?: JSONSchema4) {
        super(data, schema);
        this.schemaCreationForms = [
            {
                name: AggregationCreationForm.Generic,
                kind: SCHEMA_CREATION_FORM,
                title: 'PAGE_EDITOR_OUTLINE_ADD_GENERIC_TITLE',
                disabled: false
            }
        ];
    }

    /**
     * Method adds aggregation object.
     * Overwritten to modify array's children.
     *
     * @param name Name of aggregation.
     * @param aggregation Aggregation to add.
     * @param path Array of path to aggregation.
     * @param order Order index.
     * @returns Added aggregation.
     */
    public addAggregation(
        name: string,
        aggregation: ObjectAggregation,
        path: PropertyPath,
        order?: number
    ): ObjectAggregation {
        super.addAggregation(name, aggregation, path, order);
        // Array items are sortable and deletable
        this.sortableList = true;
        aggregation.sortableItem = SortingOptions.Enabled;
        aggregation.actions = [AggregationActions.Delete];
        // Set main title
        if (aggregation.schema && !aggregation.schema.title) {
            // Apply custom title as node label for array element
            aggregation.schema.title = i18next.t('PAGE_EDITOR_OUTLINE_ARRAY_ITEM', {
                name: parseInt(name, 10) + 1
            });
        }
        aggregation.custom = true;
        return aggregation;
    }

    /**
     * Public method which recursively updates aggregation's properties with values from passed data object.
     * Overwritten to update children aggregations depending on data.
     *
     * @param data Data which should be used for value population.
     * @param page Page config data.
     * @param pageType Page type.
     * @param path Aggregation path.
     */
    public updatePropertiesValues(
        data: PageData | undefined,
        page: PageConfig,
        pageType: PageType,
        path: PropertyPath
    ): void {
        // Base update
        super.updatePropertiesValues(data, page, pageType, path);
        // Update 'additionalText' property for child aggregations
        if (Array.isArray(data)) {
            // Update additional text
            for (let i = 0; i < data.length; i++) {
                const aggregation = this.aggregations[i];
                if (!aggregation) {
                    continue;
                }
                let additionalText;
                if (this.isAtomic) {
                    additionalText = data[i];
                } else {
                    const primaryKey = this.getPrimaryKey(aggregation);
                    additionalText = primaryKey ? data[i][primaryKey] : undefined;
                }
                if (typeof additionalText !== 'object') {
                    aggregation.additionalText = additionalText;
                }
            }
        }
    }

    /**
     * Private method resolves primary property of aggregation.
     * Logic is that we look for certain properties like 'id', 'key', etc. If those properties do not exist, then we take first string property.
     *
     * @param aggregation Aggregation to add.
     * @returns Property name.
     */
    private getPrimaryKey(aggregation: ObjectAggregation): string | undefined {
        // Get additional text for item array
        // Start with predefined most common properties
        const primaryProperties = ['id', 'title', 'key', 'name'];
        const schemaProperties = aggregation.schema ? aggregation.schema.properties || {} : {};
        let primaryProperty: string | undefined;
        for (const property of primaryProperties) {
            if (property in schemaProperties) {
                primaryProperty = property;
                break;
            }
        }
        // No match, then use very first string property
        for (const property in schemaProperties) {
            if (schemaProperties[property].type === 'string') {
                primaryProperty = property;
                break;
            }
        }
        return primaryProperty;
    }
}
