import type { JSONSchema4 } from 'json-schema';
import i18next from 'i18next';
import type { SectionAggregation } from './SectionAggregation';
import { SectionsObjectAggregation } from './SectionsObjectAggregation';
import type { PageEditAggregationData } from '../ObjectAggregation';
import type { PageData, SupportedAggregationAction, PageAnnotations, PropertyPath } from '../types';
import { AggregationActions, AggregationCreationForm, SCHEMA_CREATION_FORM } from '../types';
import type { PageConfig, PageType } from '@sap/ux-specification/dist/types/src';

export class HeaderSectionsAggregation extends SectionsObjectAggregation {
    allowedAnnotationCreationForms?: AggregationCreationForm[] = [
        AggregationCreationForm.NativeSection,
        AggregationCreationForm.DataPointSection,
        AggregationCreationForm.ProgressSection,
        AggregationCreationForm.RatingSection,
        AggregationCreationForm.ChartSection
    ];

    constructor(data?: PageEditAggregationData, schema?: JSONSchema4) {
        super(data, schema);
        const additionalProperties = schema?.additionalProperties;
        if (typeof additionalProperties === 'object' && additionalProperties.$ref) {
            this.schemaCreationForms = [
                {
                    name: AggregationCreationForm.CustomHeaderSection,
                    kind: SCHEMA_CREATION_FORM,
                    title: 'PAGE_EDITOR_OUTLINE_ADD_CUSTOM_SECTIONS_TITLE',
                    disabled: false
                }
            ];
        }
    }

    /**
     * Overwritten method for data update of object page header sections
     * Method receives current values for sections - loops custom sections array and appends existing/standard aggregations with custom section aggregations.
     *
     * @param data Data which should be used for value population.
     * @param page Page config data.
     * @param pageType Page type.
     * @param path Aggregation path.
     * @param annotations Page annotations.
     * @param parser Model parser parameters.
     */
    public updatePropertiesValues(
        data: PageData,
        page: PageConfig,
        pageType: PageType,
        path: PropertyPath,
        annotations?: PageAnnotations
    ): void {
        super.updatePropertiesValues(data, page, pageType, path, annotations);
        this.formSchema = this.additionalProperties?.aggregations?.['sections'];
        const sections = data || {};
        for (const id in sections) {
            const section = this.aggregations[id] as SectionAggregation;
            if (section?.schema && !section.schema.annotationPath) {
                const templateEdit = section.properties['templateEdit']?.value;
                const template = section.properties['fragmentName']?.value;
                let goToCodeAction: SupportedAggregationAction | undefined = undefined;
                if (typeof template === 'string' && typeof templateEdit === 'string') {
                    goToCodeAction = {
                        type: AggregationActions.OpenSource,
                        subActions: [
                            {
                                id: template,
                                text: i18next.t('CUSTOM_HEADER_SECTION_TEMPLATE')
                            },
                            {
                                id: templateEdit,
                                text: i18next.t('CUSTOM_HEADER_SECTION_TEMPLATE_EDIT')
                            }
                        ]
                    };
                }
                section.markAsCustomSection(undefined, undefined, undefined, goToCodeAction);
            }
        }
    }
}
