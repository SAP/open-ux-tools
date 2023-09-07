import type RuntimeAuthoring from 'sap/ui/rta/RuntimeAuthoring';

import init from '../../../../src/preview/client/index';

describe('index', () => {
    test('initializes client side code', () => {
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

        init(rta as unknown as RuntimeAuthoring);

        expect(addMenuItemSpy.mock.calls.length).toBe(1);
    });
});
