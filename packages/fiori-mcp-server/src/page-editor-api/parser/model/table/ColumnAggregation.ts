import { ObjectAggregation } from '../ObjectAggregation';
import i18next from 'i18next';
import type { JSONSchema4 } from 'json-schema';
import type { PageData, PropertyPath, PageAnnotations } from '../types';
import {
    DATA_FIELD_FOR_INTENT_BASED_NAVIGATION,
    EXTENSION_TABLE_TYPE_MAP,
    SortingOptions,
    AggregationActions,
    DATA_FIELD_ACTION,
    ANNOTATION_TYPES_SEPARATOR,
    ValidationState,
    PropertyMessageType,
    TableColumnExtensionType
} from '../types';
import { getTechnicalIdFromPath, validateExtension, validateMacrosExtension, getProperty } from '../utils';
import { PageType } from '@sap/ux-specification/dist/types/src';
import type { PageConfig } from '@sap/ux-specification/dist/types/src';

export class ColumnAggregation extends ObjectAggregation {
    private title?: string;
    public originalIndex?: number;
    public isViewNode = true;
    public actions = [AggregationActions.Delete];
    public sortableItem = SortingOptions.Enabled;
    private criticality?: string;

    /**
     * Setter for title.
     * @param {string} title Title.
     */
    public setTitle(title?: string): void {
        this.title = title;
    }

    /**
     * Method returns display name of aggregation without applying i18n translation.
     * Overwritten for column handling.
     * @return {string} Display name of aggregation.
     */
    protected getRawDisplayName(): string {
        return this.title || super.getRawDisplayName();
    }

    /**
     * Method validates column positioning by checking anchoring.
     * @param {boolean} isMacro Whether column is a part of macros table.
     */
    private validateColumnPositioning(): void {
        const value = this.value && typeof this.value === 'object' ? this.value : {};
        const anchorEnum = this.aggregations.position?.schema?.properties?.anchor?.enum;
        const anchorOneOf = this.schema?.properties?.anchor?.oneOf;
        let anchorMatches = false;
        if (this.isMacrosNode()) {
            // validate column key
            validateMacrosExtension(this, value);
            const relatedAnchors = anchorOneOf ? anchorOneOf : [];
            // no positioning property for macros anchor
            const anchor = getProperty(value, ['anchor']);
            anchorMatches = anchor
                ? relatedAnchors.some((relatedAnchor: JSONSchema4) => {
                      return relatedAnchor['const'] === anchor;
                  })
                : true;
        } else {
            const relatedAnchors: unknown[] = anchorEnum ? anchorEnum : [];
            const anchor = getProperty(value, ['position', 'anchor']);
            anchorMatches = anchor ? relatedAnchors.includes(anchor) : true;
        }
        // validate columns by checking related anchors
        validateExtension(this, anchorMatches, i18next.t('PAGE_EDITOR_CUSTOM_EXTENSION_NO_ANCHOR'));
    }

    /**
     * Public method to mark section as custom section.
     * @param {PageType} params Custom column params
     */
    public markAsCustomColumn(params: {
        pageType: PageType;
        originalIndex: number;
        columnExtension: TableColumnExtensionType;
        isExtensionTypeSupported: boolean;
        i18nKey?: string;
        tableExtension?: TableColumnExtensionType;
        isV4?: boolean;
        tabkey?: string;
    }): void {
        const {
            pageType,
            originalIndex,
            columnExtension,
            isExtensionTypeSupported,
            i18nKey,
            tableExtension = TableColumnExtensionType.ResponsiveTableColumnsExtension,
            isV4 = false,
            tabkey
        } = params;
        this.custom = true;
        this.actions = [AggregationActions.OpenSource];
        if (!this.isMacrosNode()) {
            this.actions.push(AggregationActions.Delete);
        }
        this.sortableItem =
            !isExtensionTypeSupported || tableExtension === columnExtension
                ? SortingOptions.Enabled
                : SortingOptions.Excluded;
        const columnExtensionText = columnExtension === undefined ? 'Unknown' : columnExtension;
        if (tabkey && pageType === PageType.ListReport) {
            this.additionalText = isExtensionTypeSupported
                ? i18next.t('PAGE_EDITOR_OUTLINE_NODE_DESC_CUSTOM_COLUMN_WITH_EXTENSION_TAB', {
                      tabkey,
                      extension: i18next.t(`PAGE_EDITOR_OUTLINE_NODE_DESC_CUSTOM_COLUMN_${columnExtensionText}`)
                  })
                : i18next.t('PAGE_EDITOR_OUTLINE_NODE_DESC_CUSTOM_COLUMN_TAB', { tabkey });
        } else {
            this.additionalText = isExtensionTypeSupported
                ? i18next.t('PAGE_EDITOR_OUTLINE_NODE_DESC_CUSTOM_COLUMN_WITH_EXTENSION', {
                      extension: i18next.t(`PAGE_EDITOR_OUTLINE_NODE_DESC_CUSTOM_COLUMN_${columnExtensionText}`)
                  })
                : i18next.t('PAGE_EDITOR_OUTLINE_NODE_DESC_CUSTOM_COLUMN');
        }
        this.originalIndex = originalIndex;
        this.i18nKey = i18nKey;
        if (isExtensionTypeSupported && tableExtension !== columnExtensionText) {
            // Column with different extension that target table
            this.state = ValidationState.Invalid;
            this.messages = [
                {
                    text: i18next.t('PAGE_EDITOR_CUSTOM_COLUMN_UNUSED_COLUMN', {
                        tableType: EXTENSION_TABLE_TYPE_MAP.get(tableExtension)
                    }),
                    type: PropertyMessageType.Info
                }
            ];
            this.inactive = true;
        }
        // anchor positioning is only supported for V4 columns
        if (isV4) {
            this.validateColumnPositioning();
        }
    }

    /**
     * Method parses object path key and returns field name / technical id.
     * @return {string | undefined} Field name / technical id.
     */
    public getTechnicalName(): string | undefined {
        return getTechnicalIdFromPath(this.path);
    }

    /**
     * Overwritten method for aggregation update.
     * @param {PageData} data Data which should be used for value population.
     * @param {PageConfig} page Page config data.
     * @param {PageType} pageType Page type.
     * @param {PropertyPath} path Aggregation path.
     * @param {PageAnnotations} annotations Annotation data.
     */
    public updatePropertiesValues(
        data: PageData,
        page: PageConfig,
        pageType: PageType,
        path: PropertyPath,
        annotations?: PageAnnotations
    ): void {
        super.updatePropertiesValues(data, page, pageType, path, annotations);
        this.updateMoveProperties();
    }

    /**
     * Method updates column move settings according to column state.
     */
    private updateMoveProperties(): void {
        if (this.isActionColumn() || this.isNavigationColumn()) {
            this.sortableCollection = !this.criticality || this.criticality === 'None' ? 'actions' : undefined;
            this.additionalText = i18next.t(`PAGE_EDITOR_OUTLINE_NODE_DESC_ACTION_COLUMN`);
        }
    }

    public isActionColumn(): boolean {
        return !!this.name?.startsWith(`${DATA_FIELD_ACTION}${ANNOTATION_TYPES_SEPARATOR}`);
    }
    public isNavigationColumn(): boolean {
        return !!this.name?.startsWith(`${DATA_FIELD_FOR_INTENT_BASED_NAVIGATION}${ANNOTATION_TYPES_SEPARATOR}`);
    }
}
