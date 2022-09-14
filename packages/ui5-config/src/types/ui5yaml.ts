export interface CustomItem<C> {
    name: string;
    configuration: C;
}

export interface CustomMiddleware<C> extends CustomItem<C> {
    beforeMiddleware?: string;
    afterMiddleware?: string;
    mountPath?: string;
}

export interface CustomTask<C> extends CustomItem<C> {
    beforeTask?: string;
    afterTask?: string;
}

export interface Configuration {
    propertiesFileSourceEncoding?: 'UTF-8' | 'ISO-8859-1';
    paths?: {
        webapp?: string;
        src?: string;
        test?: string;
        [key: string]: string | undefined;
    };
}

export interface Resources {
    configuration?: Configuration;
}

export interface Ui5Document {
    specVersion?: string;
    type: 'application' | 'library' | 'theme-library' | 'module';
    metadata: {
        name: string;
        copyright?: string;
    };
    framework?: {
        name?: 'SAPUI5' | 'OpenUI5';
        version?: string;
        libraries?: {
            name: string;
            optional?: boolean;
            development?: boolean;
        }[];
    };
    resources?: Resources;
    builder?: {
        customTasks?: CustomTask<unknown>[];
    };
    server?: {
        settings?: {
            httpPort?: number;
            httpsPort?: number;
        };
        customMiddleware?: CustomMiddleware<unknown>;
    };
    customConfiguration?: { [key: string]: unknown };
}
