import init from '../../../src/adp/init';
import rtaMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { fetchMock } from 'mock/window';
import * as outline from '../../../src/cpe/outline';
import * as facade from '../../../src/cpe/facade';

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
    jest.spyOn(facade, 'createUi5Facade').mockImplementation(() => {
        return {
            getControlById: jest.fn().mockReturnValueOnce({
                name: 'sap.m.Button',
                getMetadata: jest.fn().mockImplementationOnce(() => {
                    return {
                        getName: jest.fn().mockReturnValueOnce('sap.m.Button')
                    };
                })
            }),
            getIcons: jest.fn().mockImplementation(() => {
                return ['testIcon1', 'testIcon2'];
            }),
            getClosestOverlayFor: jest.fn(),
            getComponent: jest.fn(),
            getOverlay: jest.fn()
        };
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
    });
    test('init', () => {
        init(rtaMock);
        expect(initOutlineSpy).toBeCalledTimes(1);
        expect(addMenuItemSpy).toBeCalledTimes(2);
    });
});
