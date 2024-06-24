/**
 * Interface representing additional entries for the README file.
 */
interface AdditionalEntries {
    /** The label for the additional entry. */
    label: string;
    /** The value corresponding to the label of the additional entry. */
    value: string;
}

/**
 * Interface representing optional entries that can be included in the README configuration.
 * This interface allows dynamic properties with specified types.
 */
interface OptionalEntries {
    /**
     * A dynamic property key with a value that can be a string, an array of strings, a boolean,
     * an array of AdditionalEntries, or undefined.
     */
    [key: string]: string | string[] | boolean | AdditionalEntries[] | undefined;
}

/**
 * Interface representing the configuration for generating a README file.
 * Extends OptionalEntries to include dynamic properties along with the core properties.
 */
export interface ReadMe extends OptionalEntries {
    /** The name of the project. */
    projectName: string;
    /** The title of the project. */
    projectTitle: string;
    /** The namespace of the project. */
    projectNamespace: string;
    /** The description of the project. */
    projectDescription: string;
    /** The UI5 theme used in the project. */
    ui5Theme: string;
    /** The generated ID for the README configuration. */
    genId: string;
    /** The version of the generator used for creating the README file. */
    genVersion: string;
    /** The template used in generating the README file. */
    template: string;
    /** The service type for the project. */
    serviceType: string;
}
