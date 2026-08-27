// CJS-compatible prompts mock for tests
const prompt = async () => ({});
module.exports = prompt;
module.exports.prompt = prompt;
module.exports.default = prompt;
