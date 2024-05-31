import type { SecureContext } from 'tls';
import tls from 'tls';
import { sapGlobalRootCaCert } from '../cacerts/sap-global-root-ca';

/**
 * Test for sap domains and patching to trust SAPs root certificate
 *
 */
export class TlsPatch {
    private static _patched: boolean;

    /**
     * Test if the patch is already applied.
     *
     * @returns true if the patch is already applied
     */
    public static get isPatched(): boolean {
        return TlsPatch._patched;
    }

    /**
     * Test if the patch is required.
     *
     * @param url the url to test
     * @returns true if the patch is required
     */
    public static isPatchRequired(url: string): boolean {
        return !TlsPatch.isPatched && url && (url.includes('.sap.corp') || url.includes('.net.sap'));
    }

    /**
     * Monkey patching the secure context to also support SAPs root CA.
     */
    public static apply(): void {
        if (TlsPatch.isPatched) {
            return;
        }

        const origCreateSecureContext = tls.createSecureContext;
        tls.createSecureContext = (options): SecureContext => {
            const context = origCreateSecureContext(options);
            const pem = sapGlobalRootCaCert.replace(/\r\n/g, '\n');
            const certs = pem.match(/-----BEGIN CERTIFICATE-----\n[\s\S]+?\n-----END CERTIFICATE-----/g);
            certs.forEach((cert) => {
                context.context.addCACert(cert.trim());
            });
            return context;
        };

        TlsPatch._patched = true;
    }
}
