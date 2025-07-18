import { showOverwriteQuestion } from '../../src/utils';

describe('Test condition functions', () => {
    const testCases = [
        [true, true, false, undefined, false],
        [true, true, true, undefined, true],
        [true, true, false, true, false],
        [false, true, false, undefined, false],
        [false, true, true, undefined, false],
        [false, true, false, true, false],
        [true, false, false, undefined, true],
        [true, false, true, undefined, true],
        [true, false, false, true, false],
        [false, false, false, undefined, false],
        [true, true, undefined, undefined, false],
        [true, true, undefined, true, false],
        [false, false, undefined, undefined, false]
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
