import ControlUtils from '../../../../src/adp/control-utils';
import { fetchMock, sapCoreMock } from 'mock/window';
import OverlayRegistry from 'mock/sap/ui/dt/OverlayRegistry';
import type Dialog from 'sap/m/Dialog';
import FileExistsDialog from '../../../../src/adp/controllers/FileExistsDialog.controller';
import JSONModel from 'sap/ui/model/json/JSONModel';

describe('FileExistsDialog', () => {
    beforeAll(() => {
        fetchMock.mockResolvedValue({
            json: jest.fn().mockReturnValue({ fragments: [] }),
            text: jest.fn(),
            ok: true
        });
    });

    describe('setup', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        test('fills json model with data - show file in vscode button', async () => {
            const testModel = {
                setProperty: jest.fn(),
                getProperty: jest.fn().mockReturnValue(false)
            } as unknown as JSONModel;
            ControlUtils.getRuntimeControl = jest.fn().mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getAllAggregations: jest.fn().mockReturnValue({
                        'tooltip': {},
                        'customData': {},
                        'layoutData': {},
                        'dependents': {},
                        'dragDropConfig': {},
                        'content': {}
                    }),
                    getDefaultAggregationName: jest.fn().mockReturnValue('content'),
                    getName: jest.fn().mockReturnValue('Toolbar')
                })
            });

            ControlUtils.getControlAggregationByName = jest
                .fn()
                .mockReturnValue({ 0: {}, 1: {}, 2: {}, 3: {}, 4: {}, 5: {}, 6: {} });

            const overlayControl = {
                getDesignTimeMetadata: jest.fn().mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        aggregations: { content: { actions: { move: null }, domRef: ':sap-domref' } }
                    })
                })
            };
            sapCoreMock.byId.mockReturnValue(overlayControl);

            OverlayRegistry.getOverlay = jest.fn().mockReturnValue({
                getDesignTimeMetadata: jest.fn().mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        aggregations: {}
                    })
                })
            });

            const fileExistDialog = new FileExistsDialog('adp.extension.controllers.FileExists', {
                fileName: 'annotation_123434343.xml',
                filePath: 'adp.demo.app/changes/annnotation/annotation_123434343.xml',
                isRunningInBAS: false,
                title: ''
            });
            fileExistDialog.model = testModel;
            const openSpy = jest.fn();

            await fileExistDialog.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: openSpy,
                close: jest.fn(),
                getContent: jest.fn().mockReturnValue([
                    {
                        setVisible: jest.fn()
                    }
                ])
            } as unknown as Dialog);

            expect(openSpy).toHaveBeenCalledTimes(1);
        });

        test('fills json model with data - hide file in vscode button in SBAS', async () => {
            const testModel = {
                setProperty: jest.fn(),
                getProperty: jest.fn().mockReturnValue(true)
            } as unknown as JSONModel;
            ControlUtils.getRuntimeControl = jest.fn().mockReturnValue({
                getMetadata: jest.fn().mockReturnValue({
                    getAllAggregations: jest.fn().mockReturnValue({
                        'tooltip': {},
                        'customData': {},
                        'layoutData': {},
                        'dependents': {},
                        'dragDropConfig': {},
                        'content': {}
                    }),
                    getDefaultAggregationName: jest.fn().mockReturnValue('content'),
                    getName: jest.fn().mockReturnValue('Toolbar')
                })
            });

            const overlayControl = {
                getDesignTimeMetadata: jest.fn().mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        aggregations: { content: { actions: { move: null }, domRef: ':sap-domref' } }
                    })
                })
            };
            sapCoreMock.byId.mockReturnValue(overlayControl);

            OverlayRegistry.getOverlay = jest.fn().mockReturnValue({
                getDesignTimeMetadata: jest.fn().mockReturnValue({
                    getData: jest.fn().mockReturnValue({
                        aggregations: {}
                    })
                })
            });

            const fileExistDialog = new FileExistsDialog('adp.extension.controllers.FileExists', {
                fileName: 'annotation_123434343.xml',
                filePath: 'adp.demo.app/changes/annnotation/annotation_123434343.xml',
                isRunningInBAS: false,
                title: ''
            });
            fileExistDialog.model = testModel;
            const openSpy = jest.fn();
            const showInVsCodeSetVisibleSpy = jest.fn();
            const endButtonSetTextSpy = jest.fn();

            await fileExistDialog.setup({
                setEscapeHandler: jest.fn(),
                destroy: jest.fn(),
                setModel: jest.fn(),
                open: openSpy,
                close: jest.fn(),
                getContent: jest.fn().mockReturnValue([
                    {
                        setVisible: jest.fn()
                    }
                ]),
                getBeginButton: jest.fn().mockReturnValue({
                    setVisible: showInVsCodeSetVisibleSpy.mockReturnValue({
                        setEnabled: jest.fn()
                    })
                }),
                getEndButton: jest.fn().mockReturnValue({ setText: endButtonSetTextSpy })
            } as unknown as Dialog);

            expect(openSpy).toHaveBeenCalledTimes(1);
            expect(showInVsCodeSetVisibleSpy).toHaveBeenCalledWith(false);
        });
    });
});
