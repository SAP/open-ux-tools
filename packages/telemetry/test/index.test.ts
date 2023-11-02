jest.disableAutomock();

import { EventHeader } from '../src/client/model/EventHeader';

describe('Telemetry API Tests', () => {
    test('Test EventHeader class', () => {
        const eventHeader = new EventHeader('my-extension', 'my-event');
        expect(eventHeader.getExtensionName()).toEqual('my-extension');
        expect(eventHeader.getEventName()).toEqual('my-event');
        expect(eventHeader.toString()).toEqual('my-extension/my-event');
    });
});
