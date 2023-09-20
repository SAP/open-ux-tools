import init from '../../../src/adp/init';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';

describe('init', () => {
    test('initializes client side code', () => {
        const addMenuItemSpy = jest.fn();
        rtaMock.getDefaultPlugins.mockReturnValueOnce({
            contextMenu: {
                addMenuItem: addMenuItemSpy
            }
        });
        init(rtaMock);
        expect(addMenuItemSpy.mock.calls.length).toBe(1);
    });
});
