import { getUi5Version, isLowerThanMinimalUi5Version, getUI5VersionValidationMessage } from 'open/ux/preview/client/utils/version';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import { SingleVersionInfo } from '../../../types/global';

describe('utils/version', () => {

    test('getUi5Version', async () => {
        const versionInfoLoadMock = jest.spyOn(VersionInfo, 'load').mockResolvedValueOnce({
            name: 'sap.ui.core',
            version: '1.124.0'
        } as SingleVersionInfo);
        const version = await getUi5Version();
        expect(versionInfoLoadMock).toBeCalledWith({ library: 'sap.ui.core' });
        expect(version.version).toEqual('1.124.0');
        expect(version.majorUi5Version).toEqual(1);
        expect(version.minorUi5Version).toEqual(124);
    });

    test('getUi5Version fallback to 1.121.0', async () => {
        const version = await getUi5Version();
        expect(version.version).toEqual('1.121.0');
        expect(version.majorUi5Version).toEqual(1);
        expect(version.minorUi5Version).toEqual(121);
    });

    test('getUi5Version for snapshot', async () => {
        const versionInfoLoadMock = jest.spyOn(VersionInfo, 'load').mockResolvedValueOnce({
            name: 'sap.ui.core',
            version: '1.128.0-SNAPSHOT'
        } as SingleVersionInfo);
        const version = await getUi5Version();
        expect(versionInfoLoadMock).toBeCalledWith({ library: 'sap.ui.core' });
        expect(version.version).toEqual('1.128.0-SNAPSHOT');
        expect(version.majorUi5Version).toEqual(1);
        expect(version.minorUi5Version).toEqual(128);
    });

    test('test minimal UI5 version return value for different use cases', () => {
        //returns false for higher major versions
        expect(isLowerThanMinimalUi5Version({majorUi5Version:2, minorUi5Version:0, version:'2.0'})).toBeFalsy();
        //returns false for higher minor versions
        expect(isLowerThanMinimalUi5Version({majorUi5Version:1, minorUi5Version:71, version:'1.72'})).toBeFalsy();
        //returns false for minimum versions
        expect(isLowerThanMinimalUi5Version({majorUi5Version:1, minorUi5Version:71, version:'1.71'})).toBeFalsy();
        //returns false when version is empty
        expect(isLowerThanMinimalUi5Version({majorUi5Version:NaN, minorUi5Version:NaN, version:''})).toBeFalsy();
        //returns true for lower minor versions
        expect(isLowerThanMinimalUi5Version({majorUi5Version:1, minorUi5Version:70, version:'1.70'})).toBeTruthy();
        //returns true for lower major versions
        expect(isLowerThanMinimalUi5Version({majorUi5Version:0, minorUi5Version:70, version:'0.70'})).toBeTruthy();
    });

    test('test validation message', () => {
        //return message for lower version when app ui5 version is lower than 1.71
        expect(getUI5VersionValidationMessage('1.70')).toBe(
            'The current SAPUI5 version set for this Adaptation project is 1.70. The minimum version to use for SAPUI5 Adaptation Project and its SAPUI5 Visual Editor is 1.71'
        );
    });
});
