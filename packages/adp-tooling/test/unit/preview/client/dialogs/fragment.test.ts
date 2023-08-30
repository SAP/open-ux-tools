import type UI5Element from 'sap/ui/core/Element';
import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import { handler, initFragment } from '../../../../../src/preview/client/dialogs/fragment';
import XMLView from '../../../../__mock__/sap/ui/core/mvc/XMLView';

jest.mock('sap/ui/core/mvc/Controller', () => ({
    __esModule: true,
    default: () => jest.fn()
}));

describe('Fragment Dialog', () => {
    describe('initFragment', () => {
        afterEach(() => {
            XMLView.create.mockRestore();
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
            const rta = {};
            await handler({} as unknown as UI5Element[], rta as unknown as RuntimeAuthoring);

            expect(XMLView.create.mock.calls.length).toBe(1);
        });
    });
});
