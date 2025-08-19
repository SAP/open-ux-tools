import type { JSONSchema4 } from 'json-schema';
import type { PageConfig, PageType } from '@sap/ux-specification/dist/types/src';
import { ObjectAggregation } from '../ObjectAggregation';
import type { PageEditAggregationData } from '../ObjectAggregation';
import { AggregationCreationForm, SCHEMA_CREATION_FORM } from '../types';
import type { PageData, PropertyPath, PageAnnotations } from '../types';
import { AdditionalObjectAggregation } from './AdditionalObjectAggregation';

/**
 * Represents an aggregation for additional objects.
 */
export class AdditionalObjectsAggregation extends ObjectAggregation {
    sortableList = false;
    childClass = AdditionalObjectAggregation;
    declare sortableCollection: string | undefined;
    i18nKey = 'ADDITIONALOBJECTS';

    /**
     * Creates an instance of `AdditionalObjectsAggregation`.
     *
     * @param data Optional aggregation data object used to initialize properties.
     * @param schema Optional JSON schema fragment associated with this aggregation.
     */
    constructor(data?: PageEditAggregationData, schema?: JSONSchema4) {
        super(data, schema);
        // Custom creation form - check schema if supported
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
     * Overwritten to mark standard action.
     *
     * @param name Name of aggregation.
     * @param aggregation Aggregation to add.
     * @param path Array of path to aggregation.
     * @param order Order index.
     * @param overwrite Overwrite existing aggregation.
     * @returns Added aggregation.
     */
    public addAggregation(
        name: string,
        aggregation: ObjectAggregation,
        path: PropertyPath,
        order?: number,
        overwrite?: boolean
    ): ObjectAggregation {
        // Required for generic deletion(non annotation based deletion)
        aggregation.custom = true;
        return super.addAggregation(name, aggregation, path, order, overwrite);
    }

    /**
     * Overwritten method for data update of object page actions
     * Method receives current values for actions and detects custom actions.
     *
     * @param data Data which should be used for value population.
     * @param page Page config data.
     * @param pageType Page type.
     * @param path Aggregation path.
     * @param annotations Annotations data.
     */
    public updatePropertiesValues(
        data: PageData,
        page: PageConfig,
        pageType: PageType,
        path: PropertyPath,
        annotations: PageAnnotations
    ): void {
        super.updatePropertiesValues(data, page, pageType, path, annotations);
        if (this.name) {
            this.formSchema = this.additionalProperties?.aggregations[this.name];
        }
    }
}
