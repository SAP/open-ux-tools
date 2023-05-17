import type { CustomElement, InternalCustomElement, Position, EventHandler } from '../common/types';

/**
 * Properties to create a custom filter.
 */
export interface CustomFilter extends CustomElement, EventHandler {
    /**
     * Filter label in the application.
     */
    label: string;
    /**
     * Property used to filter by.
     */
    property: string;
    /**
     * ID of the embedded filter XML view.
     */
    controlID: string;
    /**
     * Existing filter XML fragment file name without '.fragment.xml' suffix.
     * If not set, is equal to the name specified in the config.
     */
    fragmentFile?: string;
    /**
     * Name of the created filter function.
     * If function name is not set in the eventHandler, is equal to 'itemsFilter'.
     */
    eventHandlerFnName?: string;
    /**
     * Sets the required property of the custom filter.
     */
    required?: boolean;
    /**
     * Position of a custom filter relative to an anchor element.
     */
    position?: Position;
    /**
     * Specifies whether the controller file is generated in Typescript instead of Javascript.
     */
    typescript?: boolean;
}

export type InternalCustomFilter = CustomFilter & InternalCustomElement;
