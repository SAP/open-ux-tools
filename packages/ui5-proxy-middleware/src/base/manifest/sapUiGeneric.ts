export interface SapUiGenericApp {
    pages: SapUiGenericAppPage[] | SapUiGenericAppPageMap;
    _version?: string;
    settings?: object;
}

export interface SapUiGenericAppPageMap {
    [key: string]: SapUiGenericAppPage;
}

export interface SapUiGenericAppPage {
    entitySet: string;
    navigationProperty?: string;
    component: {
        name: string;
        settings?: SapUiGenericAppPageSettings;
    };
    pages?: SapUiGenericAppPage[] | { [pageId: string]: SapUiGenericAppPage };
}

export interface SapUiGenericAppPageSettings {
    [key: string]: boolean | number | string | object;
}
