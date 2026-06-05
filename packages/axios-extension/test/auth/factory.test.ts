import { jest } from '@jest/globals';

const actualAuth = await import('../../src/auth/index.js');
const mockAttachReentranceTicketAuthInterceptor = jest.fn(actualAuth.attachReentranceTicketAuthInterceptor);
jest.unstable_mockModule('../../src/auth', () => ({
    ...actualAuth,
    attachReentranceTicketAuthInterceptor: mockAttachReentranceTicketAuthInterceptor
}));

const { AbapServiceProvider } = await import('../../src/abap/index.js');
const { AbapCloudEnvironment, createForAbapOnCloud } = await import('../../src/factory.js');

describe('createForAbapCloud', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns an AbapServiceProvider instance', () => {
        expect(
            createForAbapOnCloud({ environment: AbapCloudEnvironment.EmbeddedSteampunk, url: 'someUrl' })
        ).toBeInstanceOf(AbapServiceProvider);
    });

    it('adds reentrace ticket interceptor', () => {
        const reentraceTicketInterceptorSpy = mockAttachReentranceTicketAuthInterceptor;
        expect(
            createForAbapOnCloud({ environment: AbapCloudEnvironment.EmbeddedSteampunk, url: 'someUrl.example' })
        ).toBeInstanceOf(AbapServiceProvider);
        expect(reentraceTicketInterceptorSpy).toHaveBeenCalledTimes(1);
    });
});
