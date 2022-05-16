import { AbapServiceProvider } from '@src/abap';
import { Authentication, createForAbapOnCloud } from '@src/factory';
import * as Auth from '@src/auth';

describe('createForAbapCloud', () => {
    it('returns an AbapServiceProvider instance', () => {
        expect(
            createForAbapOnCloud({ authentication: Authentication.ReentranceTicket, url: 'someUrl' })
        ).toBeInstanceOf(AbapServiceProvider);
    });

    it('adds reentrace ticket interceptor', () => {
        const reentraceTicketInterceptorSpy = jest.spyOn(Auth, 'attachReentranceTicketAuthInterceptor');
        expect(
            createForAbapOnCloud({ authentication: Authentication.ReentranceTicket, url: 'someUrl' })
        ).toBeInstanceOf(AbapServiceProvider);
        expect(reentraceTicketInterceptorSpy).toBeCalledTimes(1);
    });
});
