export const SupportedPageTypes: { [id: string]: string } = {
    'sap.fe.templates.ListReport': 'ListReport',
    'sap.fe.templates.ObjectPage': 'ObjectPage',
    'sap.fe.core.fpm': 'FPM'
};

export type FEV4OPAPageConfig = {
    appID: string;
    appPath: string;
    template: string;
    componentID: string;
    entitySet: string;
    targetKey: string;
    isStartup: boolean;
};

export type FEV4OPAConfig = {
    appID: string;
    appPath: string;
    pages: FEV4OPAPageConfig[];
};

export type FEV4ManifestTarget = {
    type?: string;
    name?: string;
    id?: string;
    options?: {
        settings?: {
            entitySet?: string;
        };
    };
};
