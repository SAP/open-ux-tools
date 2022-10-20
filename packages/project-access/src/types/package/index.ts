import type { PackageJson } from './package-json';

interface SapUxPackage {
    sapux?: boolean | string[];
    sapuxLayer?: UI5FlexLayer;
    cds?: object;
    ui5?: object;
    remarkConfig?: object;
}

export type UI5FlexLayer = 'VENDOR' | 'CUSTOMER_BASE';
export type Package = PackageJson & SapUxPackage;
