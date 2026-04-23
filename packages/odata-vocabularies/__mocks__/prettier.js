// Stub for prettier — prevents dynamic import() error when running Jest in CJS mode.
// The only consumer (tools/update.ts) is only exercised by a skipped debug test.
module.exports = {
    format: async (source) => source,
    resolveConfig: async () => ({})
};
