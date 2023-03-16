import { AbapServiceProvider } from '../../src/abap';
import * as Auth from '../../src/auth';
import { AbapCloudEnvironment, createForAbapOnCloud } from '../../src/factory';

describe('createForAbapCloud', () => {
    it('returns an AbapServiceProvider instance', () => {
        expect(
            createForAbapOnCloud({ environment: AbapCloudEnvironment.EmbeddedSteampunk, url: 'someUrl' })
        ).toBeInstanceOf(AbapServiceProvider);
    });

    it('adds reentrace ticket interceptor', () => {
        const reentraceTicketInterceptorSpy = jest.spyOn(Auth, 'attachReentranceTicketAuthInterceptor');
        expect(
            createForAbapOnCloud({ environment: AbapCloudEnvironment.EmbeddedSteampunk, url: 'someUrl.example' })
        ).toBeInstanceOf(AbapServiceProvider);
        expect(reentraceTicketInterceptorSpy).toBeCalledTimes(1);
    });
});
