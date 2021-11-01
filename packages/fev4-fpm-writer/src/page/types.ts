import { CustomElement } from '../common/types';

export interface Ui5Route {
    name: string;
    pattern: string;
    target: string | string[];
}

export interface CustomPage extends CustomElement {
    entity: string;
    navigation?: {
        sourcePage: string;
        sourceEntity: string;
        navEntity: string;
    };
    view?: {
        title?: string;
        path?: string;
    };
}

export interface CustomPageConfig extends CustomPage {
    ns: string;
    path: string;
}
