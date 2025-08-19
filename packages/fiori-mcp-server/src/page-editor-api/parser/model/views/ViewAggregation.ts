import i18next from 'i18next';
import type { JSONSchema4 } from 'json-schema';
import { ObjectAggregation } from '../ObjectAggregation';
import type { PageEditAggregationData } from '../ObjectAggregation';
import { AggregationActions, SortingOptions, CUSTOM_VIEW_PREFIX, PropertyMessageType } from '../types';
import type { PageData, PropertyPath, PageAnnotations } from '../types';
import type { PageConfig, PageType } from '@sap/ux-specification/dist/types/src';

export class ViewAggregation extends ObjectAggregation {
    private title?: string;
    public actions: AggregationActions[] = [];
    public sortableItem: SortingOptions | undefined = SortingOptions.Enabled;
    public sortableCollection: string | undefined = 'views';

    constructor(data?: PageEditAggregationData, schema?: JSONSchema4) {
        super(data, schema);
        if (schema?.key && !schema.annotationPath && !schema.properties?.['annotationPath']) {
            // Custom view - generate annotation path, because it is not provided by schema
            schema.annotationPath = `${CUSTOM_VIEW_PREFIX}${schema.key})`;
        }
    }

    /**
     * Method returns display name of aggregation without applying i18n translation.
     * Overwritten for column handling.
     *
     * @returns Display name of aggregation.
     */
    protected getRawDisplayName(): string {
        return this.title || super.getRawDisplayName();
    }

    /**
     * Public method to mark view as custom action.
     */
    public markAsCustomView(): void {
        this.custom = true;
        this.actions = [AggregationActions.Delete, AggregationActions.OpenSource];
        this.sortableItem = SortingOptions.Enabled;
        this.additionalText = i18next.t('PAGE_EDITOR_OUTLINE_NODE_DESC_CUSTOM_VIEW');
        this.i18nKey = this.parent?.i18nKey;
        if (this.properties.label?.value) {
            this.title = this.properties.label.value as string;
        }
    }

    /**
     * Overwritten method for data update of list report view.
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
        annotations: PageAnnotations | undefined
    ): void {
        super.updatePropertiesValues(data, page, pageType, path, annotations);
        // Update icon
        if (this.isTableView()) {
            this.icon = 'Table';
        } else if (this.isChartView()) {
            this.icon = 'Chart';
        } else {
            this.icon = 'Sections';
        }
        // validate annotation path property
        if (this.isAnnotationView() && !this.schema?.['annotationPath'] && this.properties['annotationPath']) {
            // set warning for annotation path property
            this.properties['annotationPath'].messages = [
                {
                    type: PropertyMessageType.Warning,
                    text: i18next.t('PAGE_EDITOR_PROPERTIES_VIEW_NO_ANNOTATION_PATH')
                }
            ];
        }
    }

    /**
     * Method returns true if view aggregation is table view.
     *
     * @returns True if view is table view.
     */
    private isTableView(): boolean {
        return 'columns' in this.aggregations;
    }

    /**
     * Method returns true if view aggregation is chart view.
     *
     * @returns True if view is chart view.
     */
    private isChartView(): boolean {
        return !('columns' in this.aggregations) && 'toolBar' in this.aggregations;
    }

    /**
     * Method returns true if aggregation is annotation view.
     *
     * @returns True if view is annotation view.
     */
    public isAnnotationView(): boolean {
        return (
            (!this.custom && 'annotationPath' in this.properties) ||
            (!this.custom && this.schema?.annotationPath && !this.schema?.annotationPath.startsWith(CUSTOM_VIEW_PREFIX))
        );
    }
}
