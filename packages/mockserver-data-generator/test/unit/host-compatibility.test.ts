import {
    HOST_COMPATIBILITY_ERROR,
    MOCK_DATA_GENERATOR_HOST_PACKAGE,
    REQUIRED_MOCK_DATA_GENERATOR_API_VERSION,
    assertCompatibleMockserver
} from '../../src/host-compatibility.js';

describe('mockserver host compatibility', () => {
    test('accepts the application middleware with API version 1', () => {
        const middleware = Object.assign(() => undefined, { MOCK_DATA_GENERATOR_API_VERSION: 1 });
        const load = jest.fn(() => middleware);

        expect(() => assertCompatibleMockserver({ cwd: '/application', load })).not.toThrow();
        expect(load).toHaveBeenCalledWith('/application', MOCK_DATA_GENERATOR_HOST_PACKAGE);
        expect(REQUIRED_MOCK_DATA_GENERATOR_API_VERSION).toBe(1);
    });

    test.each([
        ['missing marker', {}],
        ['wrong marker', { MOCK_DATA_GENERATOR_API_VERSION: 2 }],
        ['non-module value', null]
    ])('rejects a host with a %s', (_label, hostModule) => {
        expect(() => assertCompatibleMockserver({ load: () => hostModule })).toThrow(HOST_COMPATIBILITY_ERROR);
    });

    test('replaces module-loading details with the stable compatibility error', () => {
        let message = '';

        try {
            assertCompatibleMockserver({
                load: () => {
                    throw new Error('Cannot find module at /private/developer/application/node_modules');
                }
            });
        } catch (error) {
            message = error instanceof Error ? error.message : String(error);
        }

        expect(message).toBe(HOST_COMPATIBILITY_ERROR);
        expect(message).not.toContain('/private/developer');
    });

    test('replaces marker-inspection details with the stable compatibility error', () => {
        const hostModule = new Proxy(() => undefined, {
            getOwnPropertyDescriptor: () => {
                throw new Error('private /developer/path');
            }
        });

        expect(() => assertCompatibleMockserver({ load: () => hostModule })).toThrow(HOST_COMPATIBILITY_ERROR);
    });
});
