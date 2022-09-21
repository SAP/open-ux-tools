import type { PackageJson } from 'type-fest';

export interface Package extends PackageJson {
    sapux: boolean | string[];
    sapuxLayer?: UI5FlexLayer;
    cds?: object;
    ui5?: object;
    remarkConfig?: object;
}

export const enum UI5FlexLayer {
    VENDOR = 'VENDOR',
    CUSTOMER_BASE = 'CUSTOMER_BASE'
}
