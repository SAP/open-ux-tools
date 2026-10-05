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
//
// Both `sync` (require) and `async` (dynamic import) named exports are provided so that
// Jest 30's findNodeModuleAsync path (used for `await import(...)`) also applies the shims.

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

function resolveRequest(request, options, defaultResolverFn) {
    if (ESM_ONLY_PACKAGES.has(request)) {
        const from = options.basedir || '';
        const isFromEsmChain = ESM_CHAIN_PATTERNS.some((p) => from.includes(p));
        if (isFromEsmChain && SHIM_MAP[request]) {
            return SHIM_MAP[request];
        }
    }
    return defaultResolverFn(request, options);
}

// sync export: used by Jest for require() and as fallback for import() when no async export
const sync = (request, options) => resolveRequest(request, options, options.defaultResolver);

// async export: used by Jest 30+ for dynamic import() calls — without this, the shims are
// never applied to the `await import('@ui5/project/graph')` chain in ui5MappingStrategy.js
const async_ = async (request, options) => resolveRequest(request, options, options.defaultAsyncResolver);

// Default export keeps backward compatibility with any config that references this file
// as a plain function resolver (Jest treats a plain function as sync-only).
module.exports = sync;
module.exports.sync = sync;
module.exports.async = async_;
