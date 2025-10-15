import { SapSystemsProvider } from '../../../src/providers/sapSystemsProvider';
import * as vscodeMod from 'vscode';
import { initI18n } from '../../../src/utils';

const systemServiceGetAllMock = jest.fn();

jest.mock('@sap-ux/store', () => ({
    ...jest.requireActual('@sap-ux/store'),
    SystemService: jest.fn().mockImplementation(() => ({
        getAll: systemServiceGetAllMock
    }))
}));

describe('Test the SAP Systems provider', () => {
    beforeAll(async () => {
        await initI18n();
    });

    const backendSystems = [
        {
            name: 'System A',
            url: 'https://system-a.com',
            client: '100',
            systemType: 'OnPrem',
            userDisplayName: 'User1'
        },
        { name: 'System C', url: 'https://system-c.com', systemType: 'AbapCloud' },
        { name: 'System B', url: 'https://system-b.com', client: '200', systemType: 'OnPrem', userDisplayName: 'User2' }
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

            expect(systems.length).toBe(3);
            expect(systems).toStrictEqual([
                { name: 'System A [User1]', client: '100', url: 'https://system-a.com' },
                { name: 'System B [User2]', client: '200', url: 'https://system-b.com' },
                { name: 'System C', client: undefined, url: 'https://system-c.com' }
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

            const systemWithClient = { name: 'System A', url: 'https://system-a.com', client: '100' };
            const treeItem = provider.getTreeItem(systemWithClient);
            expect(treeItem).toEqual({
                tooltip: 'https://system-a.com Client: 100',
                collapsibleState: 0,
                command: {
                    title: 'Open System Details',
                    command: 'sap.ux.tools.sapSystems.show',
                    arguments: [{ url: 'https://system-a.com', client: '100' }, false]
                },
                contextValue: 'sapSystem',
                label: 'System A',
                iconPath: {
                    light: expect.stringContaining('resources/light/icon-sap-logo-light.svg'),
                    dark: expect.stringContaining('resources/dark/icon-sap-logo-dark.svg')
                }
            });

            const systemWithoutClient = { name: 'System B', url: 'https://system-b.com' };
            const treeItem2 = provider.getTreeItem(systemWithoutClient);
            expect(treeItem2).toEqual({
                tooltip: 'https://system-b.com',
                collapsibleState: 0,
                command: {
                    title: 'Open System Details',
                    command: 'sap.ux.tools.sapSystems.show',
                    arguments: [{ url: 'https://system-b.com', client: undefined }, false]
                },
                contextValue: 'sapSystem',
                label: 'System B',
                iconPath: {
                    light: expect.stringContaining('resources/light/icon-sap-logo-light.svg'),
                    dark: expect.stringContaining('resources/dark/icon-sap-logo-dark.svg')
                }
            });
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
