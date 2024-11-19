const MetadataExchange = require('./metadataExchange');

/**
 * Defines a function called `info` on the global `test` object.
 * This function allows to annotate tests with metadata.
 * @returns {{currentTestName: string, annotations: *[]}} An object containing the current test name and the annotations array.
 */
global.test.info = function () {
    const annotations = [];
    const currentTestName = expect.getState().currentTestName;
    if (currentTestName === undefined) {
        throw new Error('ERROR: test.annotate() can only be called in individual tests.');
    }
    annotations.push = function (annotation) {
        let currentAnnotations = MetadataExchange.getTestMetadata(currentTestName);
        currentAnnotations ??= [];
        currentAnnotations.push(annotation);
        MetadataExchange.storeTestMetadata(currentTestName, currentAnnotations);
    };
    return {
        currentTestName: currentTestName,
        annotations: annotations
    };
};
