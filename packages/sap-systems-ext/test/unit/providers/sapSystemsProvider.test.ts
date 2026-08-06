import { SapSystemsProvider } from '../../../src/providers/sapSystemsProvider';
import * as vscodeMod from 'vscode';
import { initI18n } from '../../../src/utils';
import type { BackendSystem } from '@sap-ux/store';

const systemServiceGetAllMock = jest.fn();

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    getService: jest.fn().mockImplementation(() => ({
        getAll: systemServiceGetAllMock
    }))
}));

describe('Test the SAP Systems provider', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const backendSystems: BackendSystem[] = [
        {
            name: 'System A',
            url: 'https://system-a.com',
            client: '100',
            systemType: 'OnPrem',
            userDisplayName: 'User1',
            connectionType: 'abap_catalog'
        },
        {
            name: 'System B',
            url: 'https://system-b.com/full/service/path',
            systemType: 'OnPrem',
            userDisplayName: 'User2',
            connectionType: 'odata_service'
        },
        { name: 'System C', url: 'https://system-c.com', systemType: 'AbapCloud', connectionType: 'abap_catalog' },
        {
            name: 'ADT_CLOUD',
            url: 'https://adt-cloud.com',
            systemType: 'AbapCloud',
            connectionType: 'abap_catalog',
            source: 'adt'
        }
    ];

    describe('getChildren', () => {
        it('should return the sap system tree items and set the correct context', async () => {
            const commands = vscodeMod.commands;
            const executeCommandSpy = jest.spyOn(commands, 'executeCommand');
            systemServiceGetAllMock.mockResolvedValue(backendSystems);

            const provider = new SapSystemsProvider({} as any);
            const systems = await provider.getChildren();
            expect(Array.isArray(systems)).toBe(true);

            expect(executeCommandSpy).toHaveBeenCalledWith('setContext', 'sap.ux.tools.sapSystems.treeLoading', true);
            expect(executeCommandSpy).toHaveBeenCalledWith('setContext', 'sap.ux.tools.sapSystems.treeLoading', false);
            expect(executeCommandSpy).toHaveBeenCalledWith('setContext', 'sap.ux.tools.sapSystems.isTreeEmpty', false);

            expect(systems.length).toBe(4);
            expect(systems).toStrictEqual([
                {
                    name: 'ADT_CLOUD (ABAP Cloud)',
                    url: 'https://adt-cloud.com',
                    client: undefined,
                    connectionType: 'abap_catalog',
                    source: 'adt'
                },
                {
                    name: 'System A [User1]',
                    client: '100',
                    url: 'https://system-a.com',
                    connectionType: 'abap_catalog',
                    source: undefined
                },
                {
                    name: 'System B [User2]',
                    url: 'https://system-b.com/full/service/path',
                    client: undefined,
                    connectionType: 'odata_service',
                    source: undefined
                },
                {
                    name: 'System C (ABAP Cloud)',
                    url: 'https://system-c.com',
                    client: undefined,
                    connectionType: 'abap_catalog',
                    source: undefined
                }
            ]);
        });

        it('should return an empty array and set the correct context for an empty tree', async () => {
            const commands = vscodeMod.commands;
            const executeCommandSpy = jest.spyOn(commands, 'executeCommand');
            systemServiceGetAllMock.mockResolvedValue([]);

            const provider = new SapSystemsProvider({} as any);
            const systems = await provider.getChildren();
            expect(Array.isArray(systems)).toBe(true);

            expect(executeCommandSpy).toHaveBeenCalledWith('setContext', 'sap.ux.tools.sapSystems.treeLoading', true);
            expect(executeCommandSpy).toHaveBeenCalledWith('setContext', 'sap.ux.tools.sapSystems.treeLoading', false);
            expect(executeCommandSpy).toHaveBeenCalledWith('setContext', 'sap.ux.tools.sapSystems.isTreeEmpty', true);

            expect(systems.length).toBe(0);
            expect(systems).toStrictEqual([]);
        });

        it('should return an empty array and set the correct context for an empty tree', async () => {
            const commands = vscodeMod.commands;
            const executeCommandSpy = jest.spyOn(commands, 'executeCommand');
            systemServiceGetAllMock.mockRejectedValueOnce(new Error('Failed to load systems'));

            const provider = new SapSystemsProvider({} as any);
            const systems = await provider.getChildren();
            expect(Array.isArray(systems)).toBe(true);

            expect(executeCommandSpy).toHaveBeenCalledWith('setContext', 'sap.ux.tools.sapSystems.treeLoading', true);
            expect(executeCommandSpy).toHaveBeenCalledWith('setContext', 'sap.ux.tools.sapSystems.treeLoading', false);
            expect(executeCommandSpy).toHaveBeenCalledWith('setContext', 'sap.ux.tools.sapSystems.isTreeEmpty', true);

            expect(systems.length).toBe(0);
            expect(systems).toStrictEqual([]);
        });
    });

    describe('getTreeItem', () => {
        it('should return the correct tree item properties', () => {
            const provider = new SapSystemsProvider({
                extensionUri: vscodeMod.Uri.parse('file:///mock/extension/path')
            } as any);

            const treeItem = provider.getTreeItem(backendSystems[0]);
            expect(treeItem).toEqual({
                tooltip: 'https://system-a.com Client: 100',
                collapsibleState: 0,
                command: {
                    title: 'Open Connection Manager for SAP Systems',
                    command: 'sap.ux.tools.sapSystems.show',
                    arguments: [{ url: 'https://system-a.com', client: '100' }, false]
                },
                contextValue: 'sapSystem-abap_catalog',
                label: 'System A',
                iconPath: {
                    light: expect.stringContaining('resources/light/icon-sap-logo-light.svg'),
                    dark: expect.stringContaining('resources/dark/icon-sap-logo-dark.svg')
                }
            });

            const treeItem2 = provider.getTreeItem(backendSystems[1]);
            expect(treeItem2).toEqual({
                tooltip: 'https://system-b.com/full/service/path',
                collapsibleState: 0,
                command: {
                    title: 'Open Connection Manager for SAP Systems',
                    command: 'sap.ux.tools.sapSystems.show',
                    arguments: [{ url: 'https://system-b.com/full/service/path', client: undefined }, false]
                },
                contextValue: 'sapSystem-odata_service',
                label: 'System B',
                iconPath: {
                    light: expect.stringContaining('resources/light/icon-sap-logo-light.svg'),
                    dark: expect.stringContaining('resources/dark/icon-sap-logo-dark.svg')
                }
            });

            // ADT-owned system: distinct icon and owned-by-ADT tooltip. The contextValue must remain
            // `sapSystem-<connectionType>` (no ADT suffix) so existing context-menu actions still apply.
            const adtTreeItem = provider.getTreeItem(backendSystems[3]);
            expect(adtTreeItem).toEqual(
                expect.objectContaining({
                    contextValue: 'sapSystem-abap_catalog',
                    label: 'ADT_CLOUD',
                    tooltip: expect.stringContaining('ADT'),
                    iconPath: {
                        light: expect.stringContaining('resources/light/icon-adt-light.svg'),
                        dark: expect.stringContaining('resources/dark/icon-adt-dark.svg')
                    }
                })
            );
        });
    });

    describe('refresh', () => {
        it('should call the onDidChangeTreeData event emitter', () => {
            const provider = new SapSystemsProvider({} as any);
            const fireSpy = jest.spyOn((provider as any)._onDidChangeTreeData, 'fire');
            provider.refresh();
            expect(fireSpy).toHaveBeenCalledWith(undefined);
        });
    });
});
