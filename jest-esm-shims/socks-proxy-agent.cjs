'use strict';
// CJS stub for socks-proxy-agent@10 (ESM-only) — see http-proxy-agent.cjs for rationale.
const net = require('node:net');

class SocksProxyAgent extends net.Socket {
    constructor(proxy, opts) {
        super(opts);
        this.proxy = typeof proxy === 'string' ? new URL(proxy) : proxy;
    }
}
SocksProxyAgent.protocols = ['socks', 'socks4', 'socks4a', 'socks5', 'socks5h'];

module.exports = SocksProxyAgent;
module.exports.SocksProxyAgent = SocksProxyAgent;
