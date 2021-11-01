/**
 * Common properties for any custom element of the flexible programming model.
 */
export interface CustomElement {
    /**
     * Unique identifier of the custom element that is to be added to the application.
     */
    id: string;
    /**
     * Target folder relative to the manifest that is used to generate the custom extension content (e.g. view, fragment, controoler).
     * If undefined then `ext/${id}` is used.
     */
    folder?: string;
    /**
     * Optional property to define the minimum UI5 version that the generated code must support.
     * If undefined then the latest version of the template is used.
     * If nothing can be generated for the given version then an exception is thrown.
     */
    ui5Version?: number;
}
