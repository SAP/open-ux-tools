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

// Export the class as the default (for `import HttpsProxyAgent from 'https-proxy-agent'`)
// and as a named export (for `import { HttpsProxyAgent } from 'https-proxy-agent'`).
module.exports = HttpsProxyAgent;
module.exports.HttpsProxyAgent = HttpsProxyAgent;
