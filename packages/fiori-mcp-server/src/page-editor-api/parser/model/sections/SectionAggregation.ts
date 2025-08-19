import type { PageEditAggregationData } from '../ObjectAggregation';
import { ObjectAggregation } from '../ObjectAggregation';
import i18next from 'i18next';
import type { v2 } from '@sap/ux-specification/dist/types/src';
import type { JSONSchema4 } from 'json-schema';
import type { SupportedAggregationAction, SupportedAggregationActions } from '../types';
import { SortingOptions, AggregationActions, FacetTitlePrefix, SAP_ANNOTATION_NAMESPACE } from '../types';

export class SectionAggregation extends ObjectAggregation {
    public actions: SupportedAggregationActions = [AggregationActions.Delete];
    private title?: string;
    public id?: string;
    public position?: string;
    public data?: v2.ObjectPageCustomSectionBase;
    public useDescriptionAsId?: boolean;
    public isViewNode = true;
    public sortableCollection: string | undefined = 'sections';

    constructor(data?: PageEditAggregationData, schema?: JSONSchema4) {
        super(data, schema);
        this.sortableItem = SortingOptions.Enabled;
    }

    /**
     * Setter for title.
     *
     * @param title Title.
     */
    public setTitle(title: string): void {
        this.title = title;
    }

    /**
     * Setter for id.
     *
     * @param id Title.
     */
    public setId(id: string): void {
        this.id = id;
    }

    /**
     * Method returns display name of aggregation without applying i18n translation.
     * Overwritten for section handling.
     *
     * @returns Display name of aggregation.
     */
    protected getRawDisplayName(): string {
        return this.title || this.getSectionId() || super.getRawDisplayName();
    }

    /**
     * Public method to read/determine section id.
     *
     * @param fallback Resolve id with V4 fallback solution by reading label/description.
     * @returns Section id.
     */
    public getSectionId(fallback = true): string | undefined {
        if (this.schema) {
            if (this.schema.title?.startsWith(FacetTitlePrefix)) {
                const parts = this.schema.title.split(FacetTitlePrefix);
                if (parts.length > 1) {
                    return parts[parts.length - 1];
                }
                return parts[0];
            } else if (fallback && this.useDescriptionAsId && this.schema.description) {
                // V4 specific part - if facet ID does not exist then id is label
                return this.schema.description;
            }
        }
        if (this.data && 'id' in this.data) {
            return this.data['id'] as string | undefined;
        }
        return undefined;
    }

    /**
     * Public method to mark section as replaced with other section.
     *
     * @param replacedWith Section replaced with.
     */
    public markAsReplaced(replacedWith: string): void {
        this.inactive = true;
        this.additionalText = i18next.t('PAGE_EDITOR_OUTLINE_NODE_DESC_SECTION_REPLACED_WITH', {
            section: replacedWith
        });
    }

    /**
     * Public method to mark section as custom section.
     *
     * @param data Configuration of section(segment of page config).
     * @param i18nKey I18n custom key.
     * @param goCodeAction Go to code action.
     */
    public markAsCustomSection(
        data?: v2.ObjectPageCustomSectionBase,
        i18nKey?: string,
        goCodeAction?: SupportedAggregationAction
    ): void {
        this.custom = true;
        this.actions = [AggregationActions.Delete, goCodeAction || AggregationActions.OpenSource];
        this.sortableItem = SortingOptions.Enabled;
        this.additionalText = i18next.t('PAGE_EDITOR_OUTLINE_NODE_DESC_CUSTOM_SECTION');
        this.data = data;
        this.i18nKey = i18nKey;
    }

    /**
     * Method parses object path key and returns field name / technical id.
     *
     * @returns Section id.
     */
    public getTechnicalName(): string | undefined {
        return this.getSectionId();
    }

    /**
     * Protected method which returns name with additional formatting by removing 'SAP_ANNOTATION_NAMESPACE' from full name/id.
     *
     * @returns Name of aggregation.
     */
    protected getFormattedName(): string | undefined {
        let name = this.name;
        const replaceQuery = `${SAP_ANNOTATION_NAMESPACE}.`;
        if (name?.includes(replaceQuery)) {
            name = name.replace(replaceQuery, '');
        }
        return name;
    }
}
