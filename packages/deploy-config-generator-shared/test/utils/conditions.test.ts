import { showOverwriteQuestion } from '../../src/utils';

describe('Test condition functions', () => {
    const testCases = [
        // Format: [configExists, launchDeployConfigAsSubGenerator, launchStandaloneFromYui, overwriteOption, expectedResult]

        // Case 1: configExists is true, launchDeployConfigAsSubGenerator is true
        [true, true, false, undefined, false], // Question is not shown when standalone from YUI is false
        [true, true, true, undefined, true], // Question is shown when standalone from YUI is true
        [true, true, false, true, false], // Question is not shown when overwriteOption is true

        // Case 2: configExists is false, launchDeployConfigAsSubGenerator is true
        [false, true, false, undefined, false], // No config to overwrite, question not shown
        [false, true, true, undefined, false], // Same as above
        [false, true, false, true, false], // Same as above

        // Case 3: launchDeployConfigAsSubGenerator is false
        [true, false, false, undefined, true], // Question is shown regardless of standaloneFromYui
        [true, false, true, undefined, true], // Same as above
        [true, false, false, true, false], // Question is not shown when overwriteOption is true
        [false, false, false, undefined, false], // No config, question not shown

        // Case 4: Edge cases with undefined or default parameters
        [true, true, undefined, undefined, false], // Default behavior with no standaloneFromYui or overwriteOption
        [true, true, undefined, true, false], // overwriteOption prevents the question
        [false, false, undefined, undefined, false] // No config, question not shown
    ];

    test.each(testCases)(
        'showOverwriteQuestion(%s, %s, %s, %s) should return %s',
        (configExists, launchDeployConfigAsSubGenerator, launchStandaloneFromYui, overwriteOption, expected) => {
            const result = showOverwriteQuestion(
                configExists as boolean,
                launchDeployConfigAsSubGenerator,
                launchStandaloneFromYui,
                overwriteOption
            );
            expect(result).toBe(expected);
        }
    );
});
