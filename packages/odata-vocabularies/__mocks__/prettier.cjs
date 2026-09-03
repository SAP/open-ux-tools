// Stub for prettier — prevents dynamic import() error when running Jest in CJS mode.
// The only consumer (tools/update.ts) is only exercised by a skipped debug test.
// version must be present: jest-snapshot calls semver.gte(prettier.version, ...) when updating snapshots.
module.exports = {
    version: '3.0.0',
    format: async (source) => source,
    resolveConfig: async () => ({})
};
