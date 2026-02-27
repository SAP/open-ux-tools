import type { Diagnostic } from '../../language/diagnostics';
import type { ParsedApp } from '../parser';

export interface LinkerContext {
    app: ParsedApp;
    diagnostics: Diagnostic[];
}

/**
 * Configuration property with values, actual value, and manifest path.
 */
export type ConfigurationProperty<T> = {
    /**
     * All possible supported configuration values. Empty means dynamic value resolved by framework at runtime.
     */
    values: T[];
    /**
     * Actual value as defined in the manifest file.
     */
    valueInFile?: T;
    /**
     * Absolute path in manifest where this configuration is defined.
     */
    configurationPath: string[];
};

export interface ConfigurationBase<T extends string, Configuration extends object = {}> {
    type: T;
    annotation?: unknown;
    path?: string[];
    configuration: {
        [K in keyof Configuration]: Configuration[K] extends object
            ? {
                  [NK in keyof Configuration[K]]: ConfigurationProperty<Configuration[K][NK]>;
              }
            : ConfigurationProperty<Configuration[K]>;
    };
}
