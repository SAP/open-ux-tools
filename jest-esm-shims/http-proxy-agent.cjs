'use strict';
// Minimal CJS stub for http-proxy-agent@9 (ESM-only).
// Tests that transitively load pacote -> make-fetch-happen -> @npmcli/agent
// don't exercise actual proxy functionality, so a no-op class suffices.
const http = require('node:http');

class HttpProxyAgent extends http.Agent {
    constructor(proxy, opts) {
        super(opts);
        this.proxy = typeof proxy === 'string' ? new URL(proxy) : proxy;
    }
}
HttpProxyAgent.protocols = ['http'];

module.exports = { HttpProxyAgent };
