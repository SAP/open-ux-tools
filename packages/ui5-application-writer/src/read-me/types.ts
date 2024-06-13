import type { Editor } from 'mem-fs-editor';

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
    /** The minimum UI5 version required for the project. */
    projectUI5Version: string;
    /** Indicates if code assist is enabled in the project. */
    enableCodeAssist: boolean;
    /** Indicates if ESLint is enabled in the project. */
    enableEslint: boolean;
    /** Indicates if TypeScript is enabled in the project. */
    enableTypeScript: boolean;
    /** The generated ID for the README configuration. */
    genId: string;
    /** The version of the generator used for creating the README file. */
    genVersion: string;
    /** The label for the template used in generating the README file. */
    templateLabel: string;
    /** The label indicating the data source type for the project. */
    dataSourceLabel: string;
}

/**
 * Interface representing the template writer configuration.
 */
export interface TemplateWriter {
    /** The name of the file to be written. */
    fileName: string;
    /** The destination path where the file should be written. */
    destPath: string;
    /** The file system editor used for writing the file. */
    fsEditor: Editor;
}

/**
 * Type definition for a function that applies a template to a specified path.
 *
 * @template P - The type of the properties object that will be passed to the function.
 * @param {string} path - The path where the template will be applied.
 * @param {P} properties - The properties object to be used in the template.
 */
export type ApplyTemplateFunction = <P = object>(path: string, properties: P) => void;
