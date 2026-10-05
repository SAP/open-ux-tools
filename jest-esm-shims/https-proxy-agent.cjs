'use strict';
// CJS stub for https-proxy-agent@9 (ESM-only) — see http-proxy-agent.cjs for rationale.
const https = require('node:https');

class HttpsProxyAgent extends https.Agent {
    constructor(proxy, opts) {
        super(opts);
        this.proxy = typeof proxy === 'string' ? new URL(proxy) : proxy;
    }
}
HttpsProxyAgent.protocols = ['https'];

module.exports = { HttpsProxyAgent };
