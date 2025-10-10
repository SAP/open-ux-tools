import type { ExtensionContext } from 'vscode';
import type { PanelManager, SystemPanel } from '../../panel';

export interface SystemCommandContext {
    extContext: ExtensionContext;
    panelManager: PanelManager<SystemPanel>;
}

export type SystemCommandHandler =
    | ((context: SystemCommandContext) => () => Promise<void>)
    | ((context: SystemCommandContext) => (system: StoredSystemViewNode, statusMsg?: string) => Promise<void>);

export type DisposeCallback = () => void;

export type StoredSystemViewNode = {
    url: string;
    client?: string;
};

/**
 * Configuration for importing a system from a config file.
 */
export interface ImportSystemConfig {
    url: string;
    client?: string;
    name?: string;
    type?: string;
}

/**
 * Configuration file structure for importing systems.
 */
export interface ImportConfigFile {
    systems: ImportSystemConfig[];
}

export * from './panel';
