export interface CustomItem<C> {
    name: string;
    configuration: C;
}

export interface CustomMiddleware<C = unknown> extends CustomItem<C> {
    beforeMiddleware?: string;
    afterMiddleware?: string;
    mountPath?: string;
}

export interface CustomTask<C = unknown> extends Partial<CustomItem<C>> {
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

interface Ui5DocumentBase {
    specVersion?: string;
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

export type Ui5Document =
    | (Ui5DocumentBase & {
          type: 'application';
          configuration?: {
              paths?: {
                  webapp: string;
              };
          };
      })
    | (Ui5DocumentBase & {
          type: 'library';
          configuration?: {
              paths?: {
                  src: string;
                  test: string;
              };
          };
      })
    | (Ui5DocumentBase & {
          type: 'theme-library';
          configuration?: {
              paths?: {
                  src: string;
                  test: string;
              };
          };
      })
    | (Ui5DocumentBase & {
          type: 'module';
          configuration?: {
              paths?: Record<string, never>;
          };
      });
