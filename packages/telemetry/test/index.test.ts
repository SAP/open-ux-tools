import { EventHeader } from '../src/base/types/event-header';

describe('Telemetry API Tests', () => {
    test('Test EventHeader class', () => {
        const eventHeader = new EventHeader('my-extension', 'my-event');
        expect(eventHeader.getExtensionName()).toEqual('my-extension');
        expect(eventHeader.getEventName()).toEqual('my-event');
        expect(eventHeader.toString()).toEqual('my-extension/my-event');
    });
});
