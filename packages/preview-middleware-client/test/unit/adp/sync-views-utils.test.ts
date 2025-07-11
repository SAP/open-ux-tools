import type DTElement from 'sap/ui/dt/Element';
import {
    updateSyncViewsIds,
    showSyncViewsWarning,
    isSyncView,
    getSyncViewIds,
    resetSyncViews
} from '../../../src/adp/sync-views-utils';
import Element from 'mock/sap/ui/core/Element';
import Log from 'mock/sap/base/Log';
import ElementRegistry from 'mock/sap/ui/core/ElementRegistry';
import { CommunicationService } from '../../../src/cpe/communication-service';
import { MessageBarType, showInfoCenterMessage } from '@sap-ux-private/control-property-editor-common';

describe('sync-views-utils', () => {
    jest.spyOn(CommunicationService, 'sendAction');
    beforeEach(() => {
        resetSyncViews();
        jest.clearAllMocks();
    });

    describe('updateSyncViewsIds', () => {
        it('should add sync view IDs for UI5 version < 1.120.2', async () => {
            const mockElement = {
                getId: jest.fn(() => 'view1'),
                getMetadata: jest.fn(() => ({
                    getName: jest.fn(() => 'sap.ui.core.mvc.XMLView')
                })),
                oAsyncState: undefined
            };

            Element.registry.filter.mockReturnValue([mockElement]);

            await updateSyncViewsIds({ major: 1, minor: 119, patch: 9 });

            expect(getSyncViewIds()).toEqual(new Set(['view1']));
        });

        it('should add sync view IDs for UI5 version >= 1.120.2', async () => {
            const mockElement = {
                getMetadata: jest.fn(() => ({
                    getName: jest.fn(() => 'sap.ui.core.mvc.XMLView')
                })),
                oAsyncState: undefined
            };

            ElementRegistry.all.mockReturnValue({
                view1: mockElement,
                view2: mockElement
            });

            await updateSyncViewsIds({ major: 1, minor: 121, patch: 0 });

            expect(getSyncViewIds()).toEqual(new Set(['view1', 'view2']));
        });

        it('should log an error if an exception occurs', async () => {
            Element.registry.filter.mockImplementation(() => {
                throw new Error('Test error');
            });

            await updateSyncViewsIds({ major: 1, minor: 119, patch: 9 });

            expect(Log.error).toHaveBeenCalledWith('Could not get application sync views', expect.any(Error));
        });
    });

    describe('showSyncViewsWarning', () => {
        it('should send a warning message if sync views exist to the info center', async () => {
            const mockElement = {
                getId: jest.fn(() => 'view1'),
                getMetadata: jest.fn(() => ({
                    getName: jest.fn(() => 'sap.ui.core.mvc.XMLView')
                })),
                oAsyncState: undefined
            };

            Element.registry.filter.mockReturnValue([mockElement]);

            jest.spyOn(CommunicationService, 'sendAction');

            await updateSyncViewsIds({ major: 1, minor: 119, patch: 9 });
            await showSyncViewsWarning();

            expect(CommunicationService.sendAction).toHaveBeenCalledWith(
                showInfoCenterMessage({
                    title: 'Synchronous Views Detected',
                    description: 'Synchronous views are detected for this application. Controller extensions are not supported for such views and will be disabled.',
                    type: MessageBarType.warning
                })
            );
        });

        it('should not send a warning message if no sync views exist', async () => {
            await showSyncViewsWarning();

            expect(CommunicationService.sendAction).not.toHaveBeenCalled();
        });

        it('should not send a warning message if it has already been shown', async () => {
            const mockElement = {
                getId: jest.fn(() => 'view1'),
                getMetadata: jest.fn(() => ({
                    getName: jest.fn(() => 'sap.ui.core.mvc.XMLView')
                })),
                oAsyncState: undefined
            };

            (Element.registry.filter as jest.Mock).mockReturnValue([mockElement]);

            await updateSyncViewsIds({ major: 1, minor: 119, patch: 9 });
            await showSyncViewsWarning();
            await showSyncViewsWarning(); // Call again
        });
    });

    describe('isSyncView', () => {
        it('should return true for a sync XML view', () => {
            const mockElement = {
                getMetadata: jest.fn(() => ({
                    getName: jest.fn(() => 'sap.ui.core.mvc.XMLView')
                })),
                oAsyncState: undefined
            };

            expect(isSyncView(mockElement as unknown as DTElement)).toBe(true);
        });

        it('should return false for an async XML view', () => {
            const mockElement = {
                getMetadata: jest.fn(() => ({
                    getName: jest.fn(() => 'sap.ui.core.mvc.XMLView')
                })),
                oAsyncState: {}
            };

            expect(isSyncView(mockElement as unknown as DTElement)).toBe(false);
        });

        it('should return false for a non-XML view', () => {
            const mockElement = {
                getMetadata: jest.fn(() => ({
                    getName: jest.fn(() => 'sap.ui.core.mvc.JSONView')
                })),
                oAsyncState: undefined
            };

            expect(isSyncView(mockElement as unknown as DTElement)).toBe(false);
        });
    });

    describe('resetSyncViews', () => {
        it('should clear sync views and reset warningShown', () => {
            const mockElement = {
                getId: jest.fn(() => 'view1'),
                getMetadata: jest.fn(() => ({
                    getName: jest.fn(() => 'sap.ui.core.mvc.XMLView')
                })),
                oAsyncState: undefined
            };

            Element.registry.filter.mockReturnValue([mockElement]);

            updateSyncViewsIds({ major: 1, minor: 119, patch: 9 });
            resetSyncViews();

            expect(getSyncViewIds()).toEqual(new Set());
            expect(CommunicationService.sendAction).not.toHaveBeenCalled();
        });
    });
});
