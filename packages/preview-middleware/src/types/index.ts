/**
 * Configuration for additional applications
 */
export interface App {
    target: string;
    local?: string;
    intent?: {
        object: string;
        action: string;
    };
}

/**
 * FLP preview configuration.
 */
export interface FlpConfig {
    path: string;
    apps: App[];
}

/**
 * Middleware configuration.
 */
export interface Config {
    flp?: Partial<FlpConfig>;
}
