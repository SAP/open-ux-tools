const path = require('path');

const rootDir = path.resolve(__dirname, '..');

module.exports = {
    /** resolves from test to snapshot path */
    resolveSnapshotPath: (testPath, snapshotExtension) => {
        return (
            testPath
                .replace('test/unit/components/', 'test/__snapshots__/')
                .replace('test\\unit\\components\\', 'test\\__snapshots__\\') + snapshotExtension
        );
    },

    /** resolves from snapshot to test path */
    resolveTestPath: (snapshotFilePath, snapshotExtension) => {
        return snapshotFilePath
            .replace('test/__snapshots__/', 'test/unit/components/')
            .replace('test\\__snapshots__\\', 'test\\unit\\components\\')
            .slice(0, -snapshotExtension.length);
    },
    testPathForConsistencyCheck: 'some/__tests__/example.test.js'
};
