export enum Placement {
    After = 'After',
    Before = 'Before',
    End = 'End'
}

export type Position = {
    /**
     * The key of another column to be used as placement anchor.
     */
    anchor?: string;
    /**
     * Define the placement, either before or after the anchor column.
     */
    placement: Placement | undefined;
};

export type Positionable = {
    /**
     *   Defines the position of the column relative to other columns.
     */
    position?: Position;
};

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
 * Custom Column
 * @isViewNode true
 */
export interface TableCustomColumn {
    /**
     * Name of the routing target
     */
    target: string | undefined;
    /**
     * Name of the target entity for the control configuration
     */
    targetEntity: string | undefined;
    /**
     * Unique identifier for the column
     */
    id: string | undefined;
    /**
     *   Defines the position of the column relative to other columns.
     */
    position: Position | undefined;
    /**
     * The header is shown on the table as header, as well as in the add/remove dialog.
     */
    header: string | undefined;
    /**
     * A string type that represents CSS size values.
     * Refer to https://openui5.hana.ondemand.com/api/sap.ui.core.CSSSize.
     */
    width?: string | undefined;
    /**
     * Relevant for extension columns; allows the definition of a target fragment.
     */
    template: string | undefined;
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

export type EventHandler = {
    fileName: string;
    predefinedMethod: string;
};
