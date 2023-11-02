type module = {
    workStream: string;
    patterns: Array<RegExp | string>;
};

export type modules = module[];

export type manifest = {
    name: string;
    version: string;
};

export interface VSCodeManifest extends manifest {
    contributes: contributes;
}

export type contributes = {
    configuration: {
        id: string;
        properties: {
            [key: string]: {
                default: boolean;
            };
        };
    };
};
