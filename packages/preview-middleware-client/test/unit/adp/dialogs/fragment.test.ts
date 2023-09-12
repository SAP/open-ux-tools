import type UI5Element from 'sap/ui/core/Element';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { handler, initFragment } from '../../../../src/adp/dialogs/fragment';
import XMLView from 'mock/sap/ui/core/mvc/XMLView';
import Controller from 'mock/sap/ui/core/mvc/Controller';

describe('Fragment Dialog', () => {
    describe('initFragment', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('adds a new item to the context menu', () => {
            const addMenuItemSpy = jest.fn();
            const rta = {
                getDefaultPlugins: () => {
                    return {
                        contextMenu: {
                            addMenuItem: addMenuItemSpy
                        }
                    };
                }
            };
            initFragment(rta as unknown as RuntimeAuthoring);

            expect(addMenuItemSpy.mock.calls.length).toBe(1);
        });

        test('addMenuItem handler function', async () => {
            Controller.create = jest.fn().mockReturnValue({ overlays: {}, rta: {} });

            const rta = {};
            await handler({} as unknown as UI5Element[], rta as unknown as RuntimeAuthoring);

            expect(XMLView.create.mock.calls.length).toBe(1);
        });
    });
});
