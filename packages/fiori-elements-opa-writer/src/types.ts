export type FEV4OPAConfig = {
    appID: string;
    appPath: string;
    pages: {
        appID: string;
        appPath: string;
        template: string;
        componentID: string;
        entitySet: string;
        name: string;
        isStartup: boolean;
    }[];
};
