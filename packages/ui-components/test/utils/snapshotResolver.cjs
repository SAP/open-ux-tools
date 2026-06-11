/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');

module.exports = {
    /**
     * resolves from test to snapshot path
     * @param testPath
     * @param snapshotExtension
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
     * @param snapshotFilePath
     * @param snapshotExtension
     */
    resolveTestPath: (snapshotFilePath, snapshotExtension) => {
        return snapshotFilePath
            .replace('test/__snapshots__/', 'test/unit/components/')
            .replace('test\\__snapshots__\\', 'test\\unit\\components\\')
            .slice(0, -snapshotExtension.length);
    },
    testPathForConsistencyCheck: 'some/__tests__/example.test.js'
};
