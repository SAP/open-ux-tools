// CJS-compatible chalk mock for tests
// chalk v4 is CJS and named imports don't work in ESM mode.
// A Proxy returns an identity function for every colour/style accessor
// (including chainable and background variants such as `bgGreen`) so the
// mock stays in step with whatever chalk API the Yeoman adapter calls.
const identity = (s) => s;

const handler = {
    get(target, prop) {
        if (prop in target) {
            return target[prop];
        }
        return proxy;
    },
    apply(target, thisArg, args) {
        return args[0];
    }
};

const proxy = new Proxy(identity, handler);

module.exports = proxy;
module.exports.default = proxy;
