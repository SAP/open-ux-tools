// CJS-compatible chalk mock for tests
// chalk v4 is CJS and named imports don't work in ESM mode
const identity = (s) => s;

identity.cyan = identity;
identity.yellow = identity;
identity.red = identity;
identity.green = identity;
identity.blue = identity;
identity.magenta = identity;
identity.white = identity;
identity.gray = identity;
identity.bold = identity;
identity.dim = identity;
identity.underline = identity;

module.exports = identity;
module.exports.cyan = identity;
module.exports.yellow = identity;
module.exports.red = identity;
module.exports.green = identity;
module.exports.blue = identity;
module.exports.magenta = identity;
module.exports.white = identity;
module.exports.gray = identity;
module.exports.bold = identity;
module.exports.dim = identity;
module.exports.underline = identity;
module.exports.default = identity;
