const MetadataExchange = require('./metadataExchange');

global.test.info = function () {
    const annotations = [];
    const currentTestName = expect.getState().currentTestName;
    if (currentTestName === undefined) {
        throw new Error('ERROR: test.annotate() can only be called in individual tests.');
    }
    annotations.push = function (annotation) {
        let currentAnnotations = MetadataExchange.getTestMetadata(currentTestName);
        // TODO: this comparison is always true, if exchanged with Array.isArray, then tests fail
        // eslint-disable-next-line valid-typeof
        if (typeof currentAnnotations !== 'array') {
            currentAnnotations = [];
        }
        currentAnnotations.push(annotation);
        MetadataExchange.storeTestMetadata(currentTestName, currentAnnotations);
    };
    return {
        currentTestName: currentTestName,
        annotations: annotations
    };
};