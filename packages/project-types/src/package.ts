import type { PackageJson } from 'type-fest';

export interface Package extends PackageJson {
    sapux: boolean | string[];
    sapuxLayer?: UI5FlexLayer;
    cds?: object;
    ui5?: object;
    remarkConfig?: object;
}

export type UI5FlexLayer = 'VENDOR' | 'CUSTOMER_BASE';
