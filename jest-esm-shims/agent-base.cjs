'use strict';
// CJS stub for agent-base@9 (ESM-only) — see http-proxy-agent.cjs for rationale.
const http = require('node:http');

class Agent extends http.Agent {
    constructor(opts) {
        super(opts);
    }
    async connect() {
        throw new Error('agent-base stub: connect() not implemented');
    }
}

module.exports = { Agent };
