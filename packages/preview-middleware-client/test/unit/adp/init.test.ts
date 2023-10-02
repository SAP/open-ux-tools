import init from '../../../src/adp/init';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { fetchMock } from 'mock/window';
import * as ui5Utils from '../../../src/cpe/ui5-utils';
import * as outline from '../../../src/cpe/outline';

describe('adp', () => {
    const addMenuItemSpy = jest.fn();
    let initOutlineSpy: jest.SpyInstance;
    rtaMock.attachUndoRedoStackModified = jest.fn();
    rtaMock.attachSelectionChange = jest.fn();
    rtaMock.getDefaultPlugins.mockReturnValueOnce({
        contextMenu: {
            addMenuItem: addMenuItemSpy
        }
    });
    beforeAll(() => {
        const apiJson = {
            json: () => {
                return {};
            }
        };
        window.fetch = fetchMock
            .mockImplementationOnce(() => Promise.resolve(apiJson))
            .mockImplementation(() => Promise.resolve({ json: jest.fn().mockResolvedValue({}) }));
        initOutlineSpy = jest.spyOn(outline, 'initOutline').mockImplementation(() => {
            return Promise.resolve();
        });
        jest.spyOn(ui5Utils, 'getIcons').mockImplementation(() => {
            return [];
        });
    });
    test('init', () => {
        init(rtaMock);
        expect(initOutlineSpy).toBeCalledTimes(1);
        expect(addMenuItemSpy).toBeCalledTimes(2);
    });
});
