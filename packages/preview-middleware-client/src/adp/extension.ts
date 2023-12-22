
import type View from 'sap/ui/core/mvc/View';
import type UI5Element from 'sap/ui/core/Element';
import { Deferred } from './utils';


export type DeferredExtPointData = {
    fragmentPath: string;
    extensionPointName: string | undefined;
};

export interface ExtensionPointInfo {
    name: string;
    index?: number;
    view?: View;
    createdControls?: [];
    fragmentId?: string;
    aggregation?: string[];
    aggregationName?: string;
    defaultContent?: string[];
    targetControl?: UI5Element;
}

export interface ExtensionPointData {
    name: string;
    deferred: Deferred<DeferredExtPointData>;
    info: ExtensionPointInfo[];
}