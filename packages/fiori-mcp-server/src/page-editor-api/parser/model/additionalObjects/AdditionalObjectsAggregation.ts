import type { JSONSchema4 } from 'json-schema';
import type { PageConfig, PageType } from '@sap/ux-specification/dist/types/src';
import { ObjectAggregation } from '../ObjectAggregation';
import type { PageEditAggregationData } from '../ObjectAggregation';
import { AggregationCreationForm, SCHEMA_CREATION_FORM } from '../types';
import type { PageData, PropertyPath, PageAnnotations } from '../types';
import { AdditionalObjectAggregation } from './AdditionalObjectAggregation';

// Generic implementation, using the generic creation form
export class AdditionalObjectsAggregation extends ObjectAggregation {
    sortableList = false;
    childClass = AdditionalObjectAggregation;
    declare sortableCollection: string | undefined;
    i18nKey = 'ADDITIONALOBJECTS';

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
     * @param {string} name Name of aggregation.
     * @param {ObjectAggregation} aggregation Aggregation to add.
     * @param {PropertyPath} path Array of path to aggregation.
     * @param {number} [order] Order index.
     * @param {number} [overwrite] Overwrite existing aggregation.
     * @return {ObjectAggregation} Added aggregation.
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
     * @param {PageData} data Data which should be used for value population.
     * @param {PageConfig} page Page config data.
     * @param {PageType} pageType Page type.
     * @param {PropertyPath} path Aggregation path.
     * @param {PageAnnotations} annotations Annotations data.
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
