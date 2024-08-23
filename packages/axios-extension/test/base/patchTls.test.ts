import { TlsPatch } from '../../src/base/patchTls';
import tls from 'tls';

describe('Test for TLS patch isPatchRequired()', () => {
    it('should return true for internal URLs containing .sap.corp', () => {
        expect(TlsPatch.isPatchRequired('https://anyhost.wdf.sap.corp:54321/')).toBe(true);
    });

    it('should return true for internal URLs containing .net.sap', () => {
        expect(TlsPatch.isPatchRequired('host.devint.net.sap:12345/any/path')).toBe(true);
    });

    it('should return false for external URLs', () => {
        expect(TlsPatch.isPatchRequired('host.net:1')).toBe(false);
    });

    it('should not require patching after patch is applied', () => {
        expect(TlsPatch.isPatchRequired('host.devint.net.sap:12345/any/path')).toBe(true);
        TlsPatch.apply();
        tls.createSecureContext();
        expect(TlsPatch.isPatched).toBe(true);
    });
});
