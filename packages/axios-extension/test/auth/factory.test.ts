import { AbapServiceProvider } from '../../src/abap';
import { AbapCloudEnvironment, createForAbapOnCloud } from '../../src/factory';
import * as Auth from '../../src/auth';

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
