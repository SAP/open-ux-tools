import { isLowerThanMinimalUi5Version, getUI5VersionValidationMessage } from '../../../src/adp/ui5-version-utils';

describe('isLowerThanMinimalUi5Version', () => {
    it('test return value for different use cases', () => {
        //returns false when version is empty
        expect(isLowerThanMinimalUi5Version('', '1.71')).toBeFalsy();
        //returns false when minVersion is empty
        expect(isLowerThanMinimalUi5Version('1.71', '')).toBeFalsy();
        //returns false for snapshot
        expect(isLowerThanMinimalUi5Version('snapshot', '1.71')).toBeFalsy();
        //returns false for snapshot-untested
        expect(isLowerThanMinimalUi5Version('snapshot-untested', '1.71')).toBeFalsy();
        //returns false for snapshot-{ higher}
        expect(isLowerThanMinimalUi5Version('snapshot-1.72', '1.71')).toBeFalsy();
        //returns true for lower versions
        expect(isLowerThanMinimalUi5Version('1.70', '1.71')).toBeTruthy();
    });
});

describe('getUI5VersionValidationMessage', () => {
    it('test return value for different use cases', () => {
        //return message for lower version when app ui5 version is lower than 1.71
        expect(getUI5VersionValidationMessage('1.70')).toBe(
            'The current SAPUI5 version set for this Adaptation project is 1.70. The minimum version to use for SAPUI5 Adaptation Project and its SAPUI5 Visual Editor is 1.71'
        );
        //return undefined when neither condition is met
        expect(getUI5VersionValidationMessage('1.91')).toBeUndefined();
    });
});
