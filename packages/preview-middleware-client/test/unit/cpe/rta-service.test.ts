import { RtaService } from '../../../src/cpe/rta-service';
import * as common from '@sap-ux-private/control-property-editor-common';
import RuntimeAuthoringMock from 'mock/sap/ui/rta/RuntimeAuthoring';
import { fetchMock } from 'mock/window';
import RuntimeAuthoring, { RTAOptions } from 'sap/ui/rta/RuntimeAuthoring';

describe('rta-service', () => {
    let sendActionMock: jest.Mock;
    let subscribeMock: jest.Mock;
    let rtaMock: RuntimeAuthoring | undefined;

    beforeEach(() => {
        sendActionMock = jest.fn();
        subscribeMock = jest.fn();
        fetchMock.mockRestore();
        rtaMock = new RuntimeAuthoringMock({} as RTAOptions) as unknown as RuntimeAuthoring
    });
    test('setMode - navigation', async () => {
        const rtaMock = new RuntimeAuthoringMock({} as RTAOptions);
        const rtaService = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        await rtaService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](common.setAppMode('navigation'));

        expect(rtaMock.setMode).toBeCalledWith('navigation');
    });

    test('setMode - adaptation', async () => {
        const rtaService = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        await rtaService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](common.setAppMode('adaptation'));

        expect(rtaMock?.setMode).toBeCalledWith('adaptation');
    });

    test('undo', async () => {
        const rtaService = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        await rtaService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](common.undo());

        expect(rtaMock?.undo).toBeCalledWith();
    });

    test('redo', async () => {
        const rtaService = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        await rtaService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](common.redo());

        expect(rtaMock?.redo).toBeCalledWith();
    });

    test('save', async () => {
        const rtaService = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        await rtaService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](common.save());

        expect(rtaMock?.save).toBeCalledWith();
    });

    test('save - _serializeToLrep', async () => {
        (rtaMock as unknown as RuntimeAuthoring).save = undefined;
        const rtaService = new RtaService(rtaMock as unknown as RuntimeAuthoring);
        await rtaService.init(sendActionMock, subscribeMock);

        await subscribeMock.mock.calls[0][0](common.save());

        expect(rtaMock?._serializeToLrep).toBeCalledWith();
    });
});
