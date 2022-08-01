import type { CustomElement, InternalCustomElement, Position, EventHandler } from '../common/types';

export enum Availability {
    'Default' = 'Default',
    'Adaptation' = 'Adaptation',
    'Hidden' = 'Hidden'
}

export enum HorizontalAlign {
    'Begin' = 'Begin',
    'Center' = 'Center',
    'End' = 'End'
}

export type ColumnPropertiesType = string[];

/**
 * Custom Column.
 *
 */
export interface CustomTableColumn extends CustomElement, EventHandler {
    /**
     * Name of the routing target
     */
    target: string;
    /**
     * Name of the target entity for the control configuration
     */
    targetEntity: string;
    /**
     *   Defines the position of the column relative to other columns.
     */
    position: Position;
    /**
     * The header is shown on the table as header, as well as in the add/remove dialog.
     */
    header: string;
    /**
     * Optional control XML that will be generated into the fragment of table column. If the property isn't provided then a sample control will be generated.
     */
    control?: string;
    /**
     * A string type that represents CSS size values.
     * Refer to https://openui5.hana.ondemand.com/api/sap.ui.core.CSSSize.
     */
    width?: string;
    /**
     * Aligns the header as well as the content horizontally.
     */
    horizontalAlign?: HorizontalAlign;
    /**
     * Defines where the column should be shown.
     * - Default: it will be shown by default in the table.
     * - Adaptation: it will initially not shown in the table but be available via end user adaptation
     * - Hidden: the column is neither available in the table nor in adaptation
     */
    availability?: Availability;
    /**
     * If provided and sorting is enabled for the table the custom column header can be clicked. This will lead to a list of properties (or one) that can be sorted by, they are displayed as the labels of the properties, corresponding to their definition in the annotations.
     */
    properties?: ColumnPropertiesType;
}

export interface InternalCustomTableColumn extends CustomTableColumn, InternalCustomElement {
    content: string;
}
