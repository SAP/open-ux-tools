import type FlexCommand from 'sap/ui/rta/command/FlexCommand';

import MessageToast from 'mock/sap/m/MessageToast';
import FlexUtils from 'mock/sap/ui/fl/Utils';
import isReuseComponentApi from 'mock/sap/ui/rta/util/isReuseComponent';
import * as Utils from '../../../src/utils/core';
import Element from 'sap/ui/core/Element';

import { createDeferred, matchesFragmentName, notifyUser, getReuseComponentChecker } from '../../../src/adp/utils';


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

    describe('matchesFragmentName', () => {
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
            const fragmentName = 'testFragment';
            const command = createMockCommand(`${fragmentName}.fragment.xml`) as unknown as FlexCommand;

            expect(matchesFragmentName(command, fragmentName)).toBe(true);
        });

        it('returns false when the fragment path does not match the specified fragment name', () => {
            const fragmentName = 'Share';
            const command = createMockCommand('Delete.fragment.xml') as unknown as FlexCommand;

            expect(matchesFragmentName(command, fragmentName)).toBe(false);
        });

        it('returns false when the fragment path is undefined', () => {
            const fragmentName = 'Share';
            const command = createMockCommand(undefined) as unknown as FlexCommand;

            expect(matchesFragmentName(command, fragmentName)).toBe(false);
        });

        it('returns false when the fragment path is empty', () => {
            const fragmentName = 'Share';
            const command = createMockCommand('') as unknown as FlexCommand;

            expect(matchesFragmentName(command, fragmentName)).toBe(false);
        });
    });

    describe('notifyUser', () => {
        beforeEach(() => {
            MessageToast.show.mockClear();
        });

        it('displays the message with default duration if no duration is provided', () => {
            const message = 'Hello, world!';
            notifyUser(message);

            expect(MessageToast.show).toHaveBeenCalledWith(message, {
                duration: 5000
            });
        });

        it('displays the message with specified duration', () => {
            const message = 'Goodbye, world!';
            const duration = 3000;
            notifyUser(message, duration);

            expect(MessageToast.show).toHaveBeenCalledWith(message, {
                duration
            });
        });
    });

    describe('getReuseComponentChecker', () => {
        const ui5VersionInfo = {major: 1, minor: 120};
        const ui5Control = {} as Element;
        it('should return reuse component checker function', async () => {
            expect(typeof await getReuseComponentChecker(ui5VersionInfo)).toBe('function');
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
            const checker = await getReuseComponentChecker({major: 1, minor: 134});
            jest.spyOn(Utils, 'getControlById').mockReturnValue(ui5Control);
            FlexUtils.getComponentForControl.mockReturnValue({});
            const isReuseComponentMock = isReuseComponentApi.isReuseComponent.mockReturnValue(true);
            expect(checker('controlId')).toBe(true);
            expect(isReuseComponentMock).toHaveBeenCalled();
        });
    });
});
