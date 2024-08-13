import { getUi5Version, isLowerThanMinimalUi5Version, getUI5VersionValidationMessage } from 'open/ux/preview/client/utils/version';
import VersionInfo from 'mock/sap/ui/VersionInfo';

describe('utils/version', () => {

    test('getUi5Version', async () => {
        const versionInfoLoadMock = jest.spyOn(VersionInfo, 'load').mockResolvedValueOnce({
            name: 'sap.ui.core',
            version: '1.124.0'
        });
        const version = await getUi5Version();
        expect(versionInfoLoadMock).toBeCalledWith({ library: 'sap.ui.core' });
        expect(version.majorUi5Version).toEqual(1);
        expect(version.minorUi5Version).toEqual(124);
    });

    test('getUi5Version fallback to 1.121.0', async () => {
        const version = await getUi5Version();
        expect(version.majorUi5Version).toEqual(1);
        expect(version.minorUi5Version).toEqual(121);
    });

    test('getUi5Version for snapshot', async () => {
        const versionInfoLoadMock = jest.spyOn(VersionInfo, 'load').mockResolvedValueOnce({
            name: 'sap.ui.core',
            version: '1.128.0-SNAPSHOT'
        });
        const version = await getUi5Version();
        expect(versionInfoLoadMock).toBeCalledWith({ library: 'sap.ui.core' });
        expect(version.majorUi5Version).toEqual(1);
        expect(version.minorUi5Version).toEqual(128);
    });

    test('test minimal UI5 version return value for different use cases', () => {
        //returns false for higher major versions using default
        expect(isLowerThanMinimalUi5Version({majorUi5Version:2, minorUi5Version:0})).toBeFalsy();
        //returns false for higher major versions
        expect(isLowerThanMinimalUi5Version({majorUi5Version:2, minorUi5Version:70},
            {majorUi5Version:2, minorUi5Version:69})).toBeFalsy();
        //returns false for higher minor versions using default
        expect(isLowerThanMinimalUi5Version({majorUi5Version:1, minorUi5Version:71})).toBeFalsy();
        //returns false for higher minor versions
        expect(isLowerThanMinimalUi5Version({majorUi5Version:1, minorUi5Version:71},
            {majorUi5Version:1, minorUi5Version:70})).toBeFalsy();
        //returns false for minimum versions using default
        expect(isLowerThanMinimalUi5Version({majorUi5Version:1, minorUi5Version:71})).toBeFalsy();
        //returns false when version is empty using default
        expect(isLowerThanMinimalUi5Version({majorUi5Version:NaN, minorUi5Version:NaN})).toBeFalsy();
        //returns true for lower minor versions using default
        expect(isLowerThanMinimalUi5Version({majorUi5Version:1, minorUi5Version:70})).toBeTruthy();
        //returns true for lower major versions using default
        expect(isLowerThanMinimalUi5Version({majorUi5Version:0, minorUi5Version:70})).toBeTruthy();
    });

    test('test validation message', () => {
        //return message for lower version when app ui5 version is lower than 1.71
        expect(getUI5VersionValidationMessage({majorUi5Version:1, minorUi5Version:70})).toBe(
            'The current SAPUI5 version set for this Adaptation project is 1.70. The minimum version to use for SAPUI5 Adaptation Project and its SAPUI5 Visual Editor is 1.71'
        );
    });
});
