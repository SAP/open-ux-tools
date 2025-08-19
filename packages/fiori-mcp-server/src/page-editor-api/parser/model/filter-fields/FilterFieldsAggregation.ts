import type { JSONSchema4 } from 'json-schema';
import type { PageConfig, PageType } from '@sap/ux-specification/dist/types/src';
import type { PageData, PropertyPath, PageAnnotations } from '../types';
import { AggregationCreationForm, SCHEMA_CREATION_FORM } from '../types';

import { ObjectAggregation } from '../ObjectAggregation';
import type { PageEditAggregationData } from '../ObjectAggregation';
import { FilterFieldAggregation } from './FilterFieldAggregation';

export const VISUAL_FILTER_PROPERTY_NAME = 'visualFilters';

export class FilterFieldsAggregation extends ObjectAggregation {
    sortableList = true;
    allowedAnnotationCreationForms = [AggregationCreationForm.NativeFilterFields];
    childClass = FilterFieldAggregation;
    i18nKey = 'FILTER_FIELDS';

    constructor(data?: PageEditAggregationData, schema?: JSONSchema4) {
        super(data, schema);
        const additionalProperties = schema?.additionalProperties;
        if (typeof additionalProperties === 'object' && additionalProperties.$ref && !this.isMacrosNode()) {
            this.schemaCreationForms = [
                {
                    name: AggregationCreationForm.CustomFilterField,
                    kind: SCHEMA_CREATION_FORM,
                    title: 'PAGE_EDITOR_OUTLINE_ADD_CUSTOM_FILTER_FIELDS_TITLE',
                    disabled: false
                }
            ];
        }
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
        this.formSchema = this.additionalProperties?.aggregations['selectionFields'];
        const filterFields = data || {};
        for (const id in filterFields) {
            const filterField = this.aggregations[id] as FilterFieldAggregation;
            if (filterField?.schema && !filterField.schema.annotationPath) {
                filterField.markAsCustomFilterField();
            }
        }
    }
}
