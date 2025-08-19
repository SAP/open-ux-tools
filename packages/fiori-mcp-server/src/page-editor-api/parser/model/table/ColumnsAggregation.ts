import type { PageEditAggregationData } from '../ObjectAggregation';
import { ObjectAggregation } from '../ObjectAggregation';
import type { PageData, PropertyPath, PageAnnotations, UINode } from '../types';
import {
    AggregationCreationForm,
    TABLE_TYPE_EXTENSION_MAP,
    SCHEMA_CREATION_FORM,
    TableColumnExtensionType
} from '../types';
import type { JSONSchema4 } from 'json-schema';
import { ColumnAggregation } from './ColumnAggregation';
import type { PageConfig } from '@sap/ux-specification/dist/types/src';
import { PageTypeV2, v2, PageType } from '@sap/ux-specification/dist/types/src';
import { updateTableChildNodeLocations } from './utils';

const CUSTOM_PROPERTY_NAME = 'custom';
// Perhaps replace when spec would be released and spec dependency would be updated in TS package.json
export interface ColumnBase {
    id?: string;
    text?: string;
    columnKey: string;
    columnIndex?: number;
    leadingProperty?: string;
    fragmentName: string;
    tabKey?: string;
    cellsFragmentName?: string;
    extensionType: TableColumnExtensionType;
}

interface Columns extends PageData {
    [CUSTOM_PROPERTY_NAME]: Array<ColumnBase>;
}

const PAGE_TYPE_DEFAULT_EXTENSION_MAP: Map<PageType, TableColumnExtensionType> = new Map([
    [PageType.ObjectPage, TableColumnExtensionType.ResponsiveTableColumnsExtension],
    [PageType.ListReport, TableColumnExtensionType.ResponsiveTableColumnsExtension],
    [PageType.AnalyticalListPage, TableColumnExtensionType.AnalyticalTableColumnsExtension]
]);

/**
 * Represents an aggregation for columns objects.
 */
export class ColumnsAggregation extends ObjectAggregation {
    public declare formSchema?: ObjectAggregation;
    // Array of end result ordered columns
    public customColumns: Array<ColumnBase> = [];
    private columnKeys: Array<string> = [];
    public tableColumnExtensionType?: TableColumnExtensionType;
    public allowedAnnotationCreationForms = [
        AggregationCreationForm.NativeBasicColumn,
        AggregationCreationForm.NativeRatingColumn,
        AggregationCreationForm.NativeChartColumn,
        AggregationCreationForm.NativeProgressColumn,
        AggregationCreationForm.NativeAction,
        AggregationCreationForm.NativeContactColumn,
        AggregationCreationForm.NativeNavigation
    ];
    private readonly isV4?: boolean;
    public sectionId?: string;

    // In case if we would need connect columns and actions separately - in future it can be changed to array ['columns', 'actions']
    sortableCollection: string | undefined = 'actions';
    /**
     * Creates an instance of `ColumnsAggregation`.
     *
     * @param data Optional aggregation data object used to initialize properties.
     * @param schema Optional JSON schema fragment associated with this aggregation.
     */
    constructor(data?: PageEditAggregationData, schema?: JSONSchema4) {
        super(data, schema);
        // Child objects as column aggregation
        this.childClass = ColumnAggregation;
        if (schema?.properties) {
            let formName: AggregationCreationForm | undefined;
            if (schema.properties?.custom) {
                formName = AggregationCreationForm.CustomColumn;
            } else if (
                typeof schema.additionalProperties === 'object' &&
                schema.additionalProperties.$ref &&
                schema.additionalProperties.$ref.indexOf('TableCustomColumn') > -1
            ) {
                formName = AggregationCreationForm.CustomColumnV4;
                this.isV4 = true;
            } else if (this.isMacrosNode()) {
                this.isV4 = true;
            }
            // Custom creation form
            if (formName) {
                this.schemaCreationForms = [
                    {
                        name: formName,
                        kind: SCHEMA_CREATION_FORM,
                        title: 'PAGE_EDITOR_OUTLINE_ADD_CUSTOM_COLUMNS_TITLE',
                        disabled: false
                    }
                ];
            }
        }
        // Sortable
        this.sortableList = true;
        // i18n key
        this.i18nKey = 'COLUMNS';
    }

    /**
     * Groups all custom table columns by their extension type.
     *
     * @returns {Map<TableColumnExtensionType, Array<ColumnBase>>}
     */
    private groupCustomColumnsByExtension(): Map<TableColumnExtensionType, Array<ColumnBase>> {
        const customColumnGroups: Map<TableColumnExtensionType, Array<ColumnBase>> = new Map();
        // Sort all columns by index
        const customColumns = [...this.customColumns].sort((column1: ColumnBase, column2: ColumnBase) => {
            const columnIndex1 = column1.columnIndex !== undefined ? column1.columnIndex : 0;
            const columnIndex2 = column2.columnIndex !== undefined ? column2.columnIndex : 0;
            if (columnIndex1 === columnIndex2) {
                return 0;
            }
            return columnIndex1 > columnIndex2 ? 1 : -1;
        });
        // Group columns
        for (const customColumn of customColumns) {
            let columns = customColumnGroups.get(customColumn.extensionType);
            if (!columns) {
                columns = [];
                customColumnGroups.set(customColumn.extensionType, columns);
            }
            columns.push(customColumn);
        }
        return customColumnGroups;
    }

    /**
     * Method ensures that 'order' property of aggregation is zero based and does not have any gap.
     */
    private ensureColumnOrder(): void {
        const keys = this.getAggregationKeys();
        for (let i = 0; i < keys.length; i++) {
            const aggregation = this.aggregations[keys[i]];
            if (aggregation) {
                aggregation.order = i;
            }
        }
    }

    /**
     * Data update of custom columns from 'custom' block, V2 scenario.
     *
     * @param data Data which should be used for value population.
     * @param page Page config data.
     * @param pageType Page type
     * @param path Path of columns.
     */
    private updatePropertiesFromCustomAggregation(
        data: PageData,
        page: PageConfig,
        pageType: PageType,
        path: PropertyPath
    ): void {
        const formSchema = this.formSchema;
        this.customColumns = data && CUSTOM_PROPERTY_NAME in data ? (data as Columns)[CUSTOM_PROPERTY_NAME] : [];
        if (pageType === PageTypeV2.ObjectPage) {
            this.sectionId = this.parent?.parent?.schema?.keys?.reduce(
                (key: { name: string }) => key.name === 'ID'
            ).value;
        }
        if (this.customColumns.length) {
            // Ensure column order are starting with 0 and does not have any gap
            this.ensureColumnOrder();
            // Array with columns order
            this.columnKeys = Object.keys(this.aggregations);

            const customColumnsGroup = this.groupCustomColumnsByExtension();
            customColumnsGroup.forEach((customColumns: Array<ColumnBase>) => {
                for (const index in customColumns) {
                    const customColumn = formSchema?.getCopy(ColumnAggregation) as ColumnAggregation;
                    const columnData = customColumns[index];
                    // Original index in page config array
                    const originalIndex = this.customColumns.indexOf(columnData);
                    // Update some column specific properties by calling methods
                    customColumn.markAsCustomColumn({
                        pageType,
                        originalIndex,
                        columnExtension: columnData.extensionType,
                        isExtensionTypeSupported: this.isExtensionTypeSupported(),
                        i18nKey: this.i18nKey,
                        tableExtension: this.tableColumnExtensionType,
                        isV4: this.isV4,
                        tabkey: columnData.tabKey
                    });
                    customColumn.updatePropertiesValues(columnData as unknown as PageData, page, pageType, path);
                    customColumn.setTitle(columnData.text);
                    // Get unique column key
                    const columnKey = this.getFreeId(
                        columnData.id || columnData.columnKey || 'customColumn',
                        this.columnKeys
                    );
                    this.columnKeys.push(columnKey);
                    // Add custom column into columns aggregation
                    const columnIndex = this.doesColumnExtensionMatchTableType(columnData)
                        ? columnData.columnIndex
                        : this.getMaxColumnIndex(this.customColumns) + 1;
                    this.addAggregation(
                        columnKey,
                        customColumn,
                        this.path.concat([CUSTOM_PROPERTY_NAME, originalIndex]),
                        columnIndex
                    );
                }
            });
        }
    }

    /**
     * Overwritten method for data update of table columns.
     *
     * @param data - Data which should be used for value population.
     * @param page - Page config data.
     * @param pageType - Page type
     * @param path - Path of columns.
     * @param annotations - Annotations
     */
    public updatePropertiesValues(
        data: PageData,
        page: PageConfig,
        pageType: PageType,
        path: PropertyPath,
        annotations: PageAnnotations
    ): void {
        super.updatePropertiesValues(data, page, pageType, path, annotations);
        // Detect extension type
        this.resolveTableColumnExtensionType(page, pageType, path);
        // Hold custom column aggregation
        if (!this.isV4) {
            this.formSchema = this.aggregations[CUSTOM_PROPERTY_NAME];
            delete this.aggregations[CUSTOM_PROPERTY_NAME];
            // Custom block is present, V2 scenario
            this.updatePropertiesFromCustomAggregation(data, page, pageType, path);
        } else {
            // V4 new custom columns metadata aggregation is stored under 'additionalProperties'
            this.formSchema = this.additionalProperties?.aggregations['columns'];
            // V4 scenario: analyze all customs
            const columns = data || {};
            for (const columnKey in columns) {
                const column = this.aggregations[columnKey] as ColumnAggregation;
                if (column.schema && !column.schema.annotationPath) {
                    column.originalIndex = column.schema.propertyIndex;
                    column.markAsCustomColumn({
                        pageType,
                        originalIndex: column.schema.propertyIndex,
                        columnExtension: this.tableColumnExtensionType as TableColumnExtensionType,
                        isExtensionTypeSupported: this.isExtensionTypeSupported(),
                        i18nKey: this.i18nKey,
                        tableExtension: this.tableColumnExtensionType,
                        isV4: this.isV4,
                        tabkey: column.properties.tabkey?.value as string
                    });
                }
            }
        }
    }

    /**
     * Method returns available column id for candidate column id.
     *
     * @param id Candidate id.
     * @param existingIds Array of existing ids.
     * @returns Available id.
     */
    private getFreeId(id: string, existingIds: Array<string | undefined>): string {
        // Find available id
        let counter = 1;
        const originalId = id;
        while (existingIds.includes(id)) {
            id = originalId + counter;
            counter++;
        }
        return id;
    }

    /**
     * Method detects default extension type for current page with table object.
     *
     * @param page Page config data.
     * @param pageType Page type.
     * @param path Path of columns.
     */
    private resolveTableColumnExtensionType(page: PageConfig, pageType: PageType, path: PropertyPath): void {
        // Get path for table object
        const tableTypePath = path.splice(0, path.length - 1);
        // Read table type
        tableTypePath.push('type');
        const tableType = this.resolveProperty(page, tableTypePath);
        // Use mappings and detect extension type
        this.tableColumnExtensionType =
            tableType in v2.TableTypeV2
                ? TABLE_TYPE_EXTENSION_MAP.get(tableType)
                : PAGE_TYPE_DEFAULT_EXTENSION_MAP.get(pageType);
    }

    /**
     * Method to get value for passed path in passed object.
     *
     * @param obj - Object to use.
     * @param paths - Path for searching property/value.
     * @returns Found value for passed path.
     */
    private resolveProperty(obj: any, paths: PropertyPath): any {
        let current = obj;
        if (paths) {
            for (const path of paths) {
                if (typeof current === 'object' && path in current) {
                    // found and continue
                    current = current[path];
                } else {
                    return undefined;
                }
            }
        }
        return current;
    }

    /**
     * Method returns if passed custom column matches table type.
     * Table can have multiple columns with different 'extensionType', but Runtime will render only those which are matches to table type.
     *
     * @param column - Custom column object from 'page.json'.
     * @returns True if custom column extension type matches table type.
     */
    private doesColumnExtensionMatchTableType(column: ColumnBase): boolean {
        return !this.isExtensionTypeSupported() || column.extensionType === this.tableColumnExtensionType;
    }

    /**
     * Method checks if custom columns schema supports 'extensionType' property.
     * Old 'spec' version does not support this property, but we still can support custom columns with old spec version.
     *
     * @returns True if 'extensionType' property exists in schema for Custom Column definition.
     */
    public isExtensionTypeSupported(): boolean {
        return !!this.formSchema?.properties.extensionType;
    }

    /**
     * Method returns maximal order by looping through all aggregations and all custom columns data.
     *
     * @param columnData - Custom column data.
     * @returns Maximal property order index.
     */
    private getMaxColumnIndex(columnData: ColumnBase[]): number {
        let maxIndex = this.getMaxOrder();
        for (const column of columnData) {
            if (column.columnIndex !== undefined && maxIndex < column.columnIndex) {
                maxIndex = column.columnIndex;
            }
        }
        return maxIndex;
    }

    /**
     * Updates the locations of this node and its child nodes.
     *
     * @param annotations Page annotations.
     * @param currentUINode Current UI node context.
     */
    protected updateLocations(annotations: PageAnnotations | undefined, currentUINode?: UINode): void {
        super.updateLocations(annotations, currentUINode);
        updateTableChildNodeLocations(this);
    }
}
