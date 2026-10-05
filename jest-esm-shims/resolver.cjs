// Jest custom resolver: redirect ESM-only packages in the pacote/make-fetch-happen/@npmcli
// chain to CJS stubs when loaded from that chain. axios and other packages that do direct
// imports of these packages get their normal CJS-compatible versions.
//
// ESM-only packages that @npmcli/agent requires synchronously:
//   agent-base@9, http-proxy-agent@9, https-proxy-agent@9, socks-proxy-agent@10
//
// @npmcli/agent resolves all of these from its own pnpm virtual store directory:
//   node_modules/.pnpm/@npmcli+agent@5.0.2_supports-color@8.1.1/node_modules/<pkg>
// which in turn symlinks to:
//   node_modules/.pnpm/<pkg>@<version>*/node_modules/<pkg>
//
// We detect this by checking that the requesting file's path contains @npmcli+agent or
// one of the other packages in the chain, and redirect to CJS stubs.

'use strict';

const path = require('node:path');
const shimDir = path.join(__dirname);

const ESM_ONLY_PACKAGES = new Set(['agent-base', 'http-proxy-agent', 'https-proxy-agent', 'socks-proxy-agent']);

// Packages in the ESM chain that trigger shimming for their dependencies
const ESM_CHAIN_PATTERNS = [
    '@npmcli+agent',
    'http-proxy-agent@9',
    'https-proxy-agent@9',
    'socks-proxy-agent@10',
    'agent-base@9',
];

const SHIM_MAP = {
    'agent-base': path.join(shimDir, 'agent-base.cjs'),
    'http-proxy-agent': path.join(shimDir, 'http-proxy-agent.cjs'),
    'https-proxy-agent': path.join(shimDir, 'https-proxy-agent.cjs'),
    'socks-proxy-agent': path.join(shimDir, 'socks-proxy-agent.cjs'),
};

module.exports = (request, options) => {
    if (ESM_ONLY_PACKAGES.has(request)) {
        const from = options.basedir || '';
        const isFromEsmChain = ESM_CHAIN_PATTERNS.some((p) => from.includes(p));
        if (isFromEsmChain && SHIM_MAP[request]) {
            return SHIM_MAP[request];
        }
    }
    return options.defaultResolver(request, options);
};
