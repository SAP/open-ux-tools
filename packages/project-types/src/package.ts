export interface Package {
    name: string;
    sapux: boolean | string[];
    sapuxLayer?: UI5FlexLayer;
    main?: string;
    cds?: object;
    dependencies?: { [dependencyName: string]: string };
    devDependencies?: { [dependencyName: string]: string };
    optionalDependencies?: object;
    scripts?: { [scriptName: string]: string };
    ui5?: object;
    remarkConfig?: object;
    version?: string;
}

export const enum UI5FlexLayer {
    VENDOR = 'VENDOR',
    CUSTOMER_BASE = 'CUSTOMER_BASE'
}
