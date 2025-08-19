import type { JSONSchema4 } from 'json-schema';
import type { SectionAggregation } from './SectionAggregation';
import type { ObjectAggregation, PageEditAggregationData } from '../ObjectAggregation';
import type { ModelParserParams, PageData, PageAnnotations, PropertyPath } from '../types';
import { AggregationCreationForm, SCHEMA_CREATION_FORM, SortingOptions } from '../types';
import { getProperty } from '../utils';
import { SectionsAggregation } from './SectionsAggregation';
import { MacrosRootAggregation } from '../macros';
import type { PageConfig, PageType } from '@sap/ux-specification/dist/types/src';

interface SectionFragmentData {
    fragmentName: string;
    controls: object;
}

interface ParseData {
    // Model schema parser
    parser: ModelParserParams<ObjectAggregation>;
    // Page configuration
    page: PageConfig;
    // Type of page
    pageType: PageType;
}

export class SectionsObjectAggregation extends SectionsAggregation {
    constructor(data?: PageEditAggregationData, schema?: JSONSchema4) {
        super(data, schema);
        const additionalProperties = schema?.additionalProperties;
        if (typeof additionalProperties === 'object' && additionalProperties.$ref) {
            this.schemaCreationForms = [
                {
                    name: AggregationCreationForm.CustomSection,
                    kind: SCHEMA_CREATION_FORM,
                    title: 'PAGE_EDITOR_OUTLINE_ADD_CUSTOM_SECTIONS_TITLE',
                    disabled: false
                }
            ];
        }
    }

    /**
     * Overwritten method for data update of object page sections
     * Method receives current values for sections - loops through custom sections object and appends existing/standard aggregations with custom section aggregations.
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
        annotations?: PageAnnotations,
        parser?: ModelParserParams<ObjectAggregation>
    ): void {
        super.updatePropertiesValues(data, page, pageType, path, annotations, parser);
        this.formSchema = this.additionalProperties?.aggregations?.['sections'];
        const sections = data || {};
        // Remove obsolete aggregations
        this.removeObsoleteAggregations();
        for (const id in sections) {
            const section = this.aggregations[id] as SectionAggregation;
            if (section?.schema && !section.schema.annotationPath) {
                section.markAsCustomSection();

                if (parser) {
                    this.parseBuildingBlocks({ parser, page, pageType }, section, id, sections, path);
                }
            }
        }
        const sortDisabled = this.isSectionsMerged();
        if (sortDisabled) {
            for (const id in this.aggregations) {
                if (this.aggregations[id].custom) {
                    this.aggregations[id].sortableItem = SortingOptions.Excluded;
                }
            }
        }
    }

    /**
     * Method removes aggregations that are not part of schema properties.
     */
    private removeObsoleteAggregations(): void {
        const schemaSections = this.schema?.properties || {};
        for (const id in this.aggregations) {
            if (!(id in schemaSections)) {
                delete this.aggregations[id];
            }
        }
    }

    /**
     * Method parses building blocks for passed custom section.
     *
     * @param parseData Schema parse data and parser.
     * @param section Section to parse.
     * @param id Section id.
     * @param sections Sections data.
     * @param path Aggregation path.
     */
    private parseBuildingBlocks(
        parseData: ParseData,
        section: SectionAggregation,
        id: string,
        sections: PageData,
        path: PropertyPath
    ): void {
        const { parser, page, pageType } = parseData;
        const fragmentData = sections[id] as SectionFragmentData;
        const { fragmentName } = fragmentData;
        // Get custom sections fragment from definitions schema
        const customSectionFragmentDefinition = parser?.definitions[`CustomExtensionFragment<${fragmentName}>`];
        // Check if custom section has controls aggregation
        if (customSectionFragmentDefinition && section.aggregations.controls) {
            // Create macros aggregation and add it to subsection
            const macrosAggregation = new MacrosRootAggregation(undefined, customSectionFragmentDefinition);
            section.addAggregation(
                'controls',
                macrosAggregation,
                path.concat(section.path[section.path.length - 1], 'controls'),
                0,
                true
            );
            // parse schema using attached fragment file's macros schema definition
            parser.parse(
                macrosAggregation,
                customSectionFragmentDefinition,
                undefined,
                undefined,
                macrosAggregation.path,
                {
                    filePath: customSectionFragmentDefinition.metadata?.filePath
                }
            );
            // Update values of properties inside macros aggregation
            const macrosConfigData = getProperty(section.value || {}, ['controls']);
            if (macrosConfigData && typeof macrosConfigData === 'object') {
                macrosAggregation.updatePropertiesValues(
                    macrosConfigData as PageData,
                    page,
                    pageType,
                    path,
                    parser?.annotations
                );
            }
        }
    }

    /**
     * Public method checks if annotation sections are merged by 'sap.fe' in runtime.
     *
     * @returns Annotation sections are merged by 'sap.fe' in runtime.
     */
    public isSectionsMerged(): boolean {
        return false;
    }
}
