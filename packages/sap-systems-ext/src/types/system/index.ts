import type { ExtensionContext } from 'vscode';
import type { PanelManager, SystemPanel } from '../../panel';
import type { SapSystemsProvider } from '../../providers';

export interface SapSystemsExtContext {
    vscodeExtContext: ExtensionContext;
    systemsTreeDataProvider?: SapSystemsProvider;
}

export interface SystemCommandContext {
    extContext: SapSystemsExtContext;
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
 * Configuration for importing/exporting a system from a config file.
 */
export interface SystemConfig {
    url: string;
    client?: string;
    name?: string;
    type?: string;
}

/**
 * Configuration file structure for importing/exporting systems.
 */
export interface SystemConfigFile {
    systems: SystemConfig[];
}

export * from './panel';
