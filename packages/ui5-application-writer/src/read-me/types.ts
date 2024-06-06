import { Editor } from 'mem-fs-editor';
import { CapRuntime } from '@sap-ux/odata-service-inquirer';

/**
 * Represents the structure of the README file.
 */
export interface ReadMe {
    /** The generation date of the README file. */
    genDate: string;
    /** The platform on which the README file is generated. */
    genPlatform: string;
    /** The label for the data source used in the project. */
    dataSourceLabel: string;
    /** The filename of the metadata associated with the project (optional). */
    metadataFilename?: string;
    /** The URL of the service associated with the project. */
    serviceUrl: string;
    /** The name of the project. */
    projectName: string;
    /** The title of the project. */
    projectTitle: string;
    /** The namespace of the project. */
    projectNamespace: string;
    /** The description of the project. */
    projectDescription: string;
    /** The theme used in the project. */
    ui5Theme: string;
    /** The version of UI5 used in the project. */
    projectUI5Version: string;
    /** Indicates whether code assist is enabled for the project. */
    enableCodeAssist: boolean;
    /** Indicates whether ESLint is enabled for the project. */
    enableEslint: boolean;
    /** Indicates whether TypeScript is enabled for the project. */
    enableTypeScript: boolean;
    /** Indicates whether mock data information is shown (optional). */
    showMockDataInfo?: boolean;
    /** The identifier of the project. */
    genId: string;
    /** The version of the project. */
    genVersion: string;
    /** The label of the template or floorplan selected for the project. */
    templateLabel: string;
    /** Additional entries in the README file (optional). */
    additionalEntries?: { label: string; value: string }[];
    /** The launch text for the project (optional). */
    launchText?: string;
}

export interface TemplateWriter {
    fileName: string;
    destPath: string;
    fsEditor: Editor;
}

export type ApplyTemplateFunction = <P = object>(path: string, properties: P) => void;

export const CAP_RUNTIME = {
    NODE_JS: 'Node.js' as CapRuntime,
    JAVA: 'Java' as CapRuntime
};