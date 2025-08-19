import type { JSONSchema4 } from 'json-schema';
import type { ObjectAggregation, PageEditAggregationData } from '../ObjectAggregation';
import { SCHEMA_CREATION_FORM, AggregationCreationForm } from '../types';
import type { ModelParserParams, PageData, PageAnnotations, PropertyPath } from '../types';
import { SectionsObjectAggregation } from './SectionsObjectAggregation';
import type { PageConfig, PageType } from '@sap/ux-specification/dist/types/src';

export class SubSectionsAggregation extends SectionsObjectAggregation {
    constructor(data?: PageEditAggregationData, schema?: JSONSchema4) {
        super(data, schema);
        const additionalProperties = schema?.additionalProperties;
        if (typeof additionalProperties === 'object' && additionalProperties.$ref) {
            this.schemaCreationForms = [
                {
                    name: AggregationCreationForm.CustomSubSection,
                    kind: SCHEMA_CREATION_FORM,
                    title: 'PAGE_EDITOR_OUTLINE_ADD_CUSTOM_SECTIONS_TITLE',
                    disabled: false
                }
            ];
        }
    }

    /**
     * Overwritten method for data update of object page sections
     * Method receives current values for sections - loops custom sections array and appends existing/standard aggregations with custom section aggregations.
     * @param {PageData} data Data which should be used for value population.
     * @param {PageConfig} page Page config data.
     * @param {PageType} pageType Page type.
     * @param {PropertyPath} path Aggregation path.
     * @param {PageAnnotations} annotations Page annotations.
     * @param {ModelParModelParserParams<ObjectAggregation> | undefined} parser Model parser parameters.
     */
    public updatePropertiesValues(
        data: PageData,
        page: PageConfig,
        pageType: PageType,
        path: PropertyPath,
        annotations?: PageAnnotations,
        parser?: ModelParserParams<ObjectAggregation>
    ): void {
        super.updatePropertiesValues(data, page, pageType, path, annotations, parser);
        this.formSchema = this.additionalProperties?.aggregations?.['subsections'];
    }

    /**
     * Public method checks if annotation sections are merged by 'sap.fe' in runtime.
     * There is two reordering approaches:
     * 1. When annotations sections are merged into one. There no any collection section in such case;
     * 2. When sections are separated. There is at least one collection section in such case;
     * @returns {boolean} Annotation sections are merged by 'sap.fe' in runtime.
     */
    public isSectionsMerged(): boolean {
        let mergedAnnotationNodes = 0;
        for (const key in this.aggregations) {
            const aggregation = this.aggregations[key];
            if ('subsections' in aggregation.aggregations) {
                // Collection facet - sections are not merged in runtime by 'sap.fe'
                return false;
            } else if (!aggregation.custom) {
                mergedAnnotationNodes++;
            }
        }
        // If there is at least one annotation node - sections are merged
        return mergedAnnotationNodes > 0 ? true : false;
    }
}
