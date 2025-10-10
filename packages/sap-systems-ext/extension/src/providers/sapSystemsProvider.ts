import type { BackendSystem } from '@sap-ux/store';
import type { TreeDataProvider, Command, ExtensionContext, Event } from 'vscode';
import { commands, TreeItem, TreeItemCollapsibleState, Uri, EventEmitter } from 'vscode';
import { getBackendSystemService, getDisplayName, t } from '../utils';
import { SystemCommands } from '../utils/constants';
import SystemsLogger from '../utils/logger';

interface SapSystemTreeItem extends TreeItem {
    name: string;
    url: string;
    client?: string;
}

/**
 * Tree data provider for stored SAP systems.
 */
export class SapSystemsProvider implements TreeDataProvider<TreeItem> {
    private context: ExtensionContext;

    /**
     * Constructor for the SapSystemsProvider.
     *
     * @param context - the extension context
     */
    constructor(context: ExtensionContext) {
        this.context = context;
    }

    /**
     * Retrieves the tree items representing the stored SAP systems.
     *
     * @returns array of stored systems as tree items
     */
    public async getChildren(): Promise<SapSystemTreeItem[]> {
        const systems = await this.loadSystems();

        return systems
            .map((s: BackendSystem) => {
                return { name: getDisplayName(s), url: s.url, client: s.client } as SapSystemTreeItem;
            })
            ?.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, caseFirst: 'lower' }));
    }

    /**
     * Creates a tree item for the given stored SAP systems.
     *
     * @param system - the stored system for which to create a tree item
     * @returns a tree item for the given stored system
     */
    public getTreeItem(system: SapSystemTreeItem): TreeItem {
        const item = new TreeItem(system.name, TreeItemCollapsibleState.None);
        const props = this.getTreeItemProps(system);
        const systemTreeItem = {
            ...item,
            ...props,
            contextValue: 'sapSystem'
        };

        return systemTreeItem;
    }

    /**
     * Refreshes the tree view by firing the onDidChangeTreeData event.
     */
    public refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    private readonly _onDidChangeTreeData: EventEmitter<SapSystemTreeItem | undefined> = new EventEmitter<
        SapSystemTreeItem | undefined
    >();

    readonly onDidChangeTreeData: Event<SapSystemTreeItem | undefined> = this._onDidChangeTreeData.event;

    /**
     * Returns properties for a tree item representing a stored SAP system.
     *
     * @param system - the stored system
     * @returns - properties for the tree item
     */
    private getTreeItemProps(system: SapSystemTreeItem): {
        tooltip: string;
        command: Command;
        iconPath: { light: Uri; dark: Uri };
    } {
        const clientText = system.client ? ` ${t('views.client', { client: system.client })}` : '';
        const tooltip = `${system.url}${clientText}`;

        const command: Command = {
            title: t('commands.openSystemDetails'),
            command: SystemCommands.Show,
            arguments: [{ url: system.url, client: system.client }, false]
        };

        const iconPath = {
            light: Uri.joinPath(this.context.extensionUri, 'resources/light/icon-sap-logo-light.svg'),
            dark: Uri.joinPath(this.context.extensionUri, 'resources/dark/icon-sap-logo-dark.svg')
        };

        return {
            tooltip,
            command,
            iconPath
        };
    }

    /**
     * Loads the stored SAP systems from the backend system service.
     *
     * @returns - array of stored backend systems
     */
    private async loadSystems(): Promise<BackendSystem[]> {
        let systems: BackendSystem[] = [];
        try {
            await commands.executeCommand('setContext', 'sap.ux.tools.sapSystems.treeLoading', true);
            const systemService = await getBackendSystemService();
            systems = await systemService.getAll({ includeSensitiveData: false });
            return systems;
        } catch (error) {
            SystemsLogger.logger.error(t('error.loadingSystems'));
            return [];
        } finally {
            await commands.executeCommand('setContext', 'sap.ux.tools.sapSystems.treeLoading', false);
            await commands.executeCommand('setContext', 'sap.ux.tools.sapSystems.isTreeEmpty', systems.length === 0);
        }
    }
}
