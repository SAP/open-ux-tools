/**
 * Internal interface to work with flex changes. This is not the full specification of a flex change,
 * it comprises just the essential parts that we need to work with flex changes, like the filename,
 * property name and selector. We need these to compare old versus new flex changes and write them
 * to the file system
 */
export interface FlexChange {
    fileName: string;
    selector: {
        id: string;
    };
    fileType: string;
    changeType: string;
    content: {
        newValue: string;
        property: string;
        newBinding?: string;
    };
}

export interface FlexChangeFile {
    physicalFileName: string;
    fileContent: string;
}

export interface ParsedFlexChangeFile extends FlexChangeFile {
    change: FlexChange;
}
