import { startApprouter } from '../../../src/approuter';

const mockApprouterStart = jest.fn();
jest.mock('@sap/approuter', () => () => ({
    start: mockApprouterStart
}));

describe('approuter', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('startApprouter', () => {
        test('starts approuter with correct options', () => {
            const xsappConfig = { routes: [] };
            startApprouter({
                port: 5000,
                xsappConfig,
                rootPath: '/project/root',
                modules: []
            });

            expect(mockApprouterStart).toHaveBeenCalledTimes(1);
            expect(mockApprouterStart).toHaveBeenCalledWith({
                port: 5000,
                xsappConfig,
                workingDir: '/project/root',
                extensions: []
            });
        });

        test('registers approuter in globalThis when approuters array exists', () => {
            const g = globalThis as unknown as Record<string, { approuters: unknown[] }>;
            g['backend-proxy-middleware-cf'] = { approuters: [] };

            startApprouter({
                port: 5000,
                xsappConfig: { routes: [] },
                rootPath: '/project/root',
                modules: []
            });

            expect(g['backend-proxy-middleware-cf'].approuters).toHaveLength(1);
            delete g['backend-proxy-middleware-cf'];
        });

        test('does not fail when globalThis approuters is not set', () => {
            const g = globalThis as unknown as Record<string, unknown>;
            delete g['backend-proxy-middleware-cf'];

            expect(() =>
                startApprouter({
                    port: 5000,
                    xsappConfig: { routes: [] },
                    rootPath: '/project/root',
                    modules: []
                })
            ).not.toThrow();
        });
    });
});
