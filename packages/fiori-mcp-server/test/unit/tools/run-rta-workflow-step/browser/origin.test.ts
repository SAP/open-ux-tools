import { isLoopbackHost, originKey } from '../../../../../src/tools/run-rta-workflow-step/browser/origin.js';

describe('originKey', () => {
    test('reduces a full URL to its origin', () => {
        expect(originKey('http://localhost:8080/test/adaptation-editor.html?x=1')).toBe('http://localhost:8080');
    });

    test('returns the input unchanged when it cannot be parsed', () => {
        expect(originKey('not-a-url')).toBe('not-a-url');
    });
});

describe('isLoopbackHost', () => {
    test.each(['localhost', '127.0.0.1', '::1', '[::1]'])('accepts loopback host %s', (host) => {
        expect(isLoopbackHost(host)).toBe(true);
    });

    test.each(['example.com', '192.168.1.1', '0.0.0.0', ''])('rejects non-loopback host %s', (host) => {
        expect(isLoopbackHost(host)).toBe(false);
    });
});
