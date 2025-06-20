import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

import FlexUtils from 'mock/sap/ui/fl/Utils';
import isReuseComponentApi from 'mock/sap/ui/rta/util/isReuseComponent';
import * as Utils from '../../../src/utils/core';
import Element from 'sap/ui/core/Element';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';

import {
    createDeferred,
    getReuseComponentChecker,
    resetReuseComponentChecker,
    matchesChangeProperty,
    checkForExistingChange
} from '../../../src/adp/utils';

describe('utils', () => {
    describe('createDeferred', () => {
        it('should create a deferred object', () => {
            const mockResolve = jest.fn();
            const mockReject = jest.fn();

            const mockPromiseConstructor = jest.fn((executor) => {
                executor(mockResolve, mockReject);
            });

            const originalPromise = global.Promise;
            global.Promise = mockPromiseConstructor as unknown as PromiseConstructor;

            const deferred = createDeferred<object>();

            expect(deferred).toHaveProperty('resolve', mockResolve);
            expect(deferred).toHaveProperty('reject', mockReject);

            global.Promise = originalPromise;
        });

        it('should throw error when resolve or reject are null', () => {
            const mockPromiseConstructor = jest.fn((executor) => {
                executor(null, null);
            });

            const originalPromise = global.Promise;
            global.Promise = mockPromiseConstructor as unknown as PromiseConstructor;

            try {
                createDeferred<object>();
            } catch (e) {
                expect(e.message).toBe('Failed to initialize resolve and reject functions.');
            }

            global.Promise = originalPromise;
        });
    });

    describe('matchesChangeProperty', () => {
        const createMockCommand = (fragmentPath: string | undefined) => ({
            getPreparedChange: () => ({
                getDefinition: () => ({
                    content: {
                        fragmentPath
                    }
                })
            })
        });

        it('returns true when the fragment path matches the specified fragment name', () => {
            const fragmentPath = 'testFragment.fragment.xml';
            const command = createMockCommand(fragmentPath) as unknown as FlexCommand;

            expect(matchesChangeProperty(command, 'content.fragmentPath', fragmentPath)).toBe(true);
        });

        it('returns false when the fragment path does not match the specified fragment name', () => {
            const fragmentPath = 'Share.fragment.xml';
            const command = createMockCommand('Delete.fragment.xml') as unknown as FlexCommand;

            expect(matchesChangeProperty(command, 'content.fragmentPath', fragmentPath)).toBe(false);
        });

        it('returns false when the fragment path is undefined', () => {
            const fragmentPath = 'Share.fragment.xml';
            const command = createMockCommand(undefined) as unknown as FlexCommand;

            expect(matchesChangeProperty(command, 'content.fragmentPath', fragmentPath)).toBe(false);
        });

        it('returns false when the fragment path is empty', () => {
            const fragmentPath = 'Share.fragment.xml';
            const command = createMockCommand('') as unknown as FlexCommand;

            expect(matchesChangeProperty(command, 'content.fragmentPath', fragmentPath)).toBe(false);
        });

        it('returns false when command does not have getPreparedChange function', () => {
            const fragmentPath = 'Share.fragment.xml';

            expect(matchesChangeProperty({} as FlexCommand, 'content.fragmentPath', fragmentPath)).toBe(false);
        });

        it('returns false when command does not have change definition', () => {
            const fragmentPath = 'Share.fragment.xml';

            expect(
                matchesChangeProperty(
                    {
                        getPreparedChange: () => ({})
                    } as FlexCommand,
                    'content.fragmentPath',
                    fragmentPath
                )
            ).toBe(false);
        });
    });

    describe('checkForExistingChange', () => {
        beforeEach(() => {
            mockRta.getCommandStack = jest.fn(() => ({
                getCommands: jest.fn(() => [mockCommand])
            }));
        });
        const mockRta = new RuntimeAuthoringMock({} as RTAOptions);
        const mockCommand = {
            getProperty: jest.fn(() => 'addXML'),
            getPreparedChange: jest.fn(() => ({
                getDefinition: jest.fn(() => ({
                    content: {
                        fragmentPath: 'testFragment.fragment.xml'
                    }
                }))
            }))
        };
        it('should return true if a matching change is found', () => {
            const result = checkForExistingChange(
                mockRta,
                'addXML',
                'content.fragmentPath',
                'testFragment.fragment.xml'
            );
            expect(result).toBe(true);
        });

        it('should return true if a matching change is found and command does have subCommands', () => {
            mockRta.getCommandStack = jest.fn(() => ({
                getCommands: jest.fn(() => [
                    {
                        getCommands: jest.fn(() => [mockCommand])
                    }
                ])
            }));
            const result = checkForExistingChange(
                mockRta,
                'addXML',
                'content.fragmentPath',
                'testFragment.fragment.xml'
            );
            expect(result).toBe(true);
        });

        it('should false true if a matching change is not found', () => {
            const result = checkForExistingChange(mockRta, 'codeExt', 'content.codeRef', 'coding/test.js');
            expect(result).toBe(false);
        });

        it('should return false if a matching change is not found and command does subCommands', () => {
            const result = checkForExistingChange(mockRta, 'codeExt', 'content.codeRef', 'coding/test.js');
            expect(result).toBe(false);
        });
    });

    describe('getReuseComponentChecker', () => {
        const ui5VersionInfo = { major: 1, minor: 120 };
        const ui5Control = {} as Element;

        beforeEach(() => {
            resetReuseComponentChecker();
        });

        it('should return reuse component checker function', async () => {
            expect(typeof (await getReuseComponentChecker(ui5VersionInfo))).toBe('function');
        });

        it('should return false if ui5 control is not defined', async () => {
            const checker = await getReuseComponentChecker(ui5VersionInfo);
            jest.spyOn(Utils, 'getControlById').mockReturnValue(undefined);
            expect(checker('controlId')).toBe(false);
        });

        it('should return false if control has no component - UI5 1.120', async () => {
            const checker = await getReuseComponentChecker(ui5VersionInfo);
            jest.spyOn(Utils, 'getControlById').mockReturnValue(ui5Control);
            FlexUtils.getComponentForControl.mockReturnValue(undefined);
            expect(checker('controlId')).toBe(false);
        });

        it('should return false if there is no app component for control - 1.120', async () => {
            const checker = await getReuseComponentChecker(ui5VersionInfo);
            jest.spyOn(Utils, 'getControlById').mockReturnValue(ui5Control);
            FlexUtils.getComponentForControl.mockReturnValue({});
            FlexUtils.getAppComponentForControl.mockReturnValue(undefined);
            expect(checker('controlId')).toBe(false);
        });

        it('should return false if app manifest does not have any reuse components - 1.120', async () => {
            const checker = await getReuseComponentChecker(ui5VersionInfo);
            jest.spyOn(Utils, 'getControlById').mockReturnValue(ui5Control);
            FlexUtils.getComponentForControl.mockReturnValue({
                getManifest: () => ({
                    'sap.app': { id: 'componentName' }
                })
            });
            FlexUtils.getAppComponentForControl.mockReturnValue({
                getManifest: () => ({
                    'sap.ui5': {}
                })
            });
            expect(checker('controlId')).toBe(false);
        });

        it('should return false if the control component does not match any reuse component in the app manifest - 1.120', async () => {
            const checker = await getReuseComponentChecker(ui5VersionInfo);
            jest.spyOn(Utils, 'getControlById').mockReturnValue(ui5Control);
            FlexUtils.getComponentForControl.mockReturnValue({
                getManifest: () => ({
                    'sap.app': { id: 'componentName' }
                })
            });
            FlexUtils.getAppComponentForControl.mockReturnValue({
                getManifest: () => ({
                    'sap.ui5': { componentUsages: {} }
                })
            });
            expect(checker('controlId')).toBe(false);
        });

        it('should return true if the control component matches a reuse component in the app manifest - 1.120', async () => {
            const checker = await getReuseComponentChecker(ui5VersionInfo);
            jest.spyOn(Utils, 'getControlById').mockReturnValue(ui5Control);
            FlexUtils.getComponentForControl.mockReturnValue({
                getManifest: () => ({
                    'sap.app': { id: 'componentName' }
                })
            });
            FlexUtils.getAppComponentForControl.mockReturnValue({
                getManifest: () => ({
                    'sap.ui5': { componentUsages: { componentUsage: { name: 'componentName' } } }
                })
            });
            expect(checker('controlId')).toBe(true);
        });

        it('should executed UI5 RTA API for higher UI5 versions - 1.134', async () => {
            const checker = await getReuseComponentChecker({ major: 1, minor: 134 });
            jest.spyOn(Utils, 'getControlById').mockReturnValue(ui5Control);
            FlexUtils.getComponentForControl.mockReturnValue({});
            const isReuseComponentMock = isReuseComponentApi.mockReturnValue(true);
            expect(checker('controlId')).toBe(true);
            expect(isReuseComponentMock).toHaveBeenCalled();
        });
    });
});
