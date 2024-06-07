import type { Editor } from 'mem-fs-editor';
import type { CapRuntime } from '@sap-ux/odata-service-inquirer';

/**
 * Represents the old structure of the README file.
 */
// export interface ReadMe {
//     /** The generation date of the README file. */
//     genDate: string;
//     /** The platform on which the README file is generated. */
//     genPlatform: string;
//     /** The label for the data source used in the project. */
//     dataSourceLabel: string;
//     /** The filename of the metadata associated with the project (optional). */
//     metadataFilename?: string;
//     /** The URL of the service associated with the project. */
//     serviceUrl: string;
//     /** The name of the project. */
//     projectName: string;
//     /** The title of the project. */
//     projectTitle: string;
//     /** The namespace of the project. */
//     projectNamespace: string;
//     /** The description of the project. */
//     projectDescription: string;
//     /** The theme used in the project. */
//     ui5Theme: string;
//     /** The version of UI5 used in the project. */
//     projectUI5Version: string;
//     /** Indicates whether code assist is enabled for the project. */
//     enableCodeAssist: boolean;
//     /** Indicates whether ESLint is enabled for the project. */
//     enableEslint: boolean;
//     /** Indicates whether TypeScript is enabled for the project. */
//     enableTypeScript: boolean;
//     /** Indicates whether mock data information is shown (optional). */
//     showMockDataInfo?: boolean;
//     /** The identifier of the project. */
//     genId: string;
//     /** The version of the project. */
//     genVersion: string;
//     /** The label of the template or floorplan selected for the project. */
//     templateLabel: string;
//     /** Additional entries in the README file (optional). */
//     additionalEntries?: { label: string; value: string }[];
//     /** The launch text for the project (optional). */
//     launchText?: string;
// }

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
 * Interface representing the configuration for generating a README file.
 */
export interface ReadMe {
    /** The name of the project. */
    projectName: string;
    /** The title of the project. */
    projectTitle: string;
    /**
     * Dynamic key-value pairs for additional properties.
     * The value can be a string, an array of strings, a boolean,
     * an array of additional entries, or undefined.
     */
    [key: string]: string | string[] | boolean | AdditionalEntries[] | undefined;
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
