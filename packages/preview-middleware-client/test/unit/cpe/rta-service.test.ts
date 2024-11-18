import { RtaService } from '../../../src/cpe/rta-service';
import { ActionHandler } from '../../../src/cpe/types';
import { setAppMode, undo, redo, save, reloadApplication, appLoaded } from '@sap-ux-private/control-property-editor-common';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { fetchMock } from 'mock/window';
import RuntimeAuthoring, { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';

describe('rta-service', () => {
    let sendActionMock: jest.Mock;
    let subscribeMock: jest.Mock<void, [ActionHandler]>;

    beforeEach(() => {
        sendActionMock = jest.fn();
        subscribeMock = jest.fn<void, [ActionHandler]>();
        fetchMock.mockRestore();
    });
    test('setMode - navigation', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const rtaService = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        rtaService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](setAppMode('navigation'));

        expect(rtaMock.setMode).toBeCalledWith('navigation');
    });

    test('setMode - adaptation', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const rtaService = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        rtaService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](setAppMode('adaptation'));

        expect(rtaMock.setMode).toBeCalledWith('adaptation');
    });

    test('undo', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const rtaService = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        rtaService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](undo());

        expect(rtaMock.undo).toBeCalledWith();
    });

    test('redo', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const rtaService = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        rtaService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](redo());

        expect(rtaMock.redo).toBeCalledWith();
    });

    test('save', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const rtaService = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        rtaService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](save());

        expect(rtaMock.save).toBeCalledWith();
    });

    test('save - _serializeToLrep', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        (rtaMock as unknown as RuntimeAuthoring).save = undefined;
        const rtaService = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        rtaService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](save());

        expect(rtaMock._serializeToLrep).toBeCalledWith();
    });

    test('reload application', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const service = new RtaService(rtaMock as unknown as RuntimeAuthoring);

        service.init(sendActionMock, subscribeMock);
        await subscribeMock.mock.calls[0][0](reloadApplication({ save: false }));
        expect(rtaMock.stop).toHaveBeenNthCalledWith(1, false, true);
    });

    test('attach stop callback check', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const service = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        const reloadSpy = jest.fn();
        const location = window.location;
        Object.defineProperty(window, 'location', {
            value: {
                reload: reloadSpy
            }
        });
        service.init(sendActionMock, subscribeMock);
        expect(rtaMock.attachStop).toBeCalledTimes(1);

        rtaMock.attachStop.mock.calls[0][0]();
        expect(reloadSpy).toHaveBeenCalled();
        Object.defineProperty(window, 'location', {
            value: location
        });
    });

    test('attach start callback check', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const service = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        const reloadSpy = jest.fn();
        Object.defineProperty(window, 'location', {
            value: {
                reload: reloadSpy
            }
        });
        service.init(sendActionMock, subscribeMock);
        expect(rtaMock.attachStart).toBeCalledTimes(1);

        rtaMock.attachStart.mock.calls[0][0]();
        expect(sendActionMock).toHaveBeenNthCalledWith(2, appLoaded());
    });
});
