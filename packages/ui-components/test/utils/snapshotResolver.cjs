module.exports = {
    /**
     * resolves from test to snapshot path
     * @param {string}testPath - the test path
     * @param {string}snapshotExtension - the snapshot extension
     * @returns {string} snapshot path
     */
    resolveSnapshotPath: (testPath, snapshotExtension) => {
        return (
            testPath
                .replace('test/unit/components/', 'test/__snapshots__/')
                .replace('test\\unit\\components\\', 'test\\__snapshots__\\') + snapshotExtension
        );
    },

    /**
     * resolves from snapshot to test path
     * @param {string}snapshotFilePath - the snapshot path
     * @param {string}snapshotExtension - the snapshot extension
     * @returns {string} test path
     */
    resolveTestPath: (snapshotFilePath, snapshotExtension) => {
        return snapshotFilePath
            .replace('test/__snapshots__/', 'test/unit/components/')
            .replace('test\\__snapshots__\\', 'test\\unit\\components\\')
            .slice(0, -snapshotExtension.length);
    },
    testPathForConsistencyCheck: 'some/__tests__/example.test.js'
};
