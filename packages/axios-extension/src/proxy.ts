import type { AxiosRequestConfig } from 'axios';
import { HttpProxyAgent } from 'http-proxy-agent';
import { type AgentOptions } from 'node:https';
import { type HttpsProxyAgentOptions, HttpsProxyAgent } from 'https-proxy-agent';
import { getProxyForUrl } from 'proxy-from-env';
import { isAppStudio } from '@sap-ux/btp-utils';

/**
 * PatchedHttpsProxyAgent is a custom implementation of HttpsProxyAgent that allows to pass additional options, currently not supported by the original implementation when calling tls.connect
 */
export class PatchedHttpsProxyAgent<Uri extends string> extends HttpsProxyAgent<Uri> {
    private readonly extraOptions: any;

    /**
     * Extension of the base constructor.
     *
     * @param proxy
     * @param opts
     */
    constructor(proxy: Uri | URL, opts?: HttpsProxyAgentOptions<Uri>) {
        super(proxy, opts);
        this.extraOptions = opts;
    }

    /**
     * Performs transparent encryption of written data and all required TLS negotiation.
     *
     * @param req
     * @param opts
     * @returns {Promise<net.Socket>}
     */
    async connect(req: any, opts: any) {
        return super.connect(req, { ...this.extraOptions, ...opts });
    }
}

/**
 * Returns axios config that routes a request through the environment-configured proxy
 * using a custom agent with axios' own (unreliable) proxy handling disabled. Honours
 * NO_PROXY and never applies a proxy inside SAP Business Application Studio. Returns an
 * empty object when no proxy applies, so it can be spread/merged into a request config.
 *
 * @param url - The full target URL, used for NO_PROXY hostname matching.
 * @param agentOptions - Optional agent options (e.g. rejectUnauthorized) passed to the https agent.
 * @returns Partial axios request config with proxy agents, or an empty object.
 */
export function getProxyAgentConfig(url: string, agentOptions?: AgentOptions): Partial<AxiosRequestConfig> {
    const localProxy = getProxyForUrl(url);
    if (localProxy && !isAppStudio()) {
        // axios doesn't handle proxies correctly, instead use a custom agent with axios proxy disabled
        return {
            httpsAgent: new PatchedHttpsProxyAgent(localProxy, agentOptions as HttpsProxyAgentOptions<string>),
            httpAgent: new HttpProxyAgent(localProxy),
            proxy: false
        };
    }
    return {};
}
