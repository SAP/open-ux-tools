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
    opaJourneyFileName: string;
};

export type FEV4ManifestTarget = {
    type?: string;
    name?: string;
    id?: string;
    options?: {
        settings?: {
            entitySet?: string;
            navigation?: {
                [id: string]: {
                    detail?: {
                        route?: string;
                    };
                };
            };
        };
    };
};

/**
 * General validation error thrown if app config options contain invalid combinations
 */
export class ValidationError extends Error {
    /**
     * ValidationError constructor.
     *
     * @param message - the error message
     */
    constructor(message: string) {
        super(`Validation error: ${message}`);
        this.name = this.constructor.name;
    }
}
