'use strict';
// CJS re-implementation of agent-base@9 (ESM-only).
// The real agent-base overrides http.Agent.createSocket() to route all connections
// through an async connect() method. Without this, subclasses like @npmcli/agent
// never get their connect() called and connections fail or hang.
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');

const INTERNAL = Symbol('AgentBaseInternalState');

class Agent extends http.Agent {
    constructor(opts) {
        super(opts);
        this[INTERNAL] = {};
    }

    isSecureEndpoint(options) {
        if (options) {
            if (typeof options.secureEndpoint === 'boolean') return options.secureEndpoint;
            if (typeof options.protocol === 'string') return options.protocol === 'https:';
        }
        const { stack } = new Error();
        if (typeof stack !== 'string') return false;
        return stack.split('\n').some(
            (l) => l.indexOf('(https.js:') !== -1 || l.indexOf('node:https:') !== -1
        );
    }

    getName(options) {
        if (this.isSecureEndpoint(options)) {
            return https.Agent.prototype.getName.call(this, options);
        }
        return super.getName(options);
    }

    incrementSockets(name) {
        if (this.maxSockets === Infinity && this.maxTotalSockets === Infinity) return null;
        if (!this.sockets[name]) this.sockets[name] = [];
        const fakeSocket = new net.Socket({ writable: false });
        this.sockets[name].push(fakeSocket);
        this.totalSocketCount = (this.totalSocketCount || 0) + 1;
        return fakeSocket;
    }

    decrementSockets(name, socket) {
        if (!this.sockets[name] || socket === null) return;
        const sockets = this.sockets[name];
        const index = sockets.indexOf(socket);
        if (index !== -1) {
            sockets.splice(index, 1);
            this.totalSocketCount = (this.totalSocketCount || 1) - 1;
            if (sockets.length === 0) delete this.sockets[name];
        }
    }

    createSocket(req, options, cb) {
        const connectOpts = { ...options, secureEndpoint: this.isSecureEndpoint(options) };
        const name = this.getName(connectOpts);
        const fakeSocket = this.incrementSockets(name);
        Promise.resolve()
            .then(() => this.connect(req, connectOpts))
            .then((socket) => {
                this.decrementSockets(name, fakeSocket);
                if (typeof socket.addRequest === 'function') {
                    try { return socket.addRequest(req, connectOpts); }
                    catch (err) { return cb(err); }
                }
                this[INTERNAL].currentSocket = socket;
                super.createSocket(req, options, cb);
            }, (err) => {
                this.decrementSockets(name, fakeSocket);
                cb(err);
            });
    }

    createConnection() {
        const socket = this[INTERNAL].currentSocket;
        this[INTERNAL].currentSocket = undefined;
        if (!socket) throw new Error('No socket was returned in the `connect()` function');
        return socket;
    }

    async connect() {
        throw new Error('agent-base stub: connect() not implemented — subclass must override');
    }

    get defaultPort() {
        return this[INTERNAL].defaultPort ?? (this.protocol === 'https:' ? 443 : 80);
    }
    set defaultPort(v) { if (this[INTERNAL]) this[INTERNAL].defaultPort = v; }

    get protocol() {
        return this[INTERNAL].protocol ?? (this.isSecureEndpoint() ? 'https:' : 'http:');
    }
    set protocol(v) { if (this[INTERNAL]) this[INTERNAL].protocol = v; }
}

module.exports = { Agent };
