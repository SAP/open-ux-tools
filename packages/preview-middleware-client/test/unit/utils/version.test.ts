import {
    getUi5Version,
    isLowerThanMinimalUi5Version,
    isVersionEqualOrHasNewerPatch
} from 'open/ux/preview/client/utils/version';
import VersionInfo from 'mock/sap/ui/VersionInfo';
import { sendInfoCenterMessage } from '../../../src//utils/info-center-message';
import { MessageBarType } from '@sap-ux-private/control-property-editor-common';

describe('utils/version', () => {
    test('getUi5Version with lib sap.m', async () => {
        const versionInfoLoadMock = jest.spyOn(VersionInfo, 'load').mockResolvedValueOnce({
            name: 'sap.m',
            version: '1.124.11'
        });
        const version = await getUi5Version('sap.m');
        expect(versionInfoLoadMock).toHaveBeenCalledWith({ library: 'sap.m' });
        expect(version.major).toEqual(1);
        expect(version.minor).toEqual(124);
        expect(version.patch).toEqual(11);
    });

    test('getUi5Version with fallback to sap.ui.core', async () => {
        const versionInfoLoadMock = jest.spyOn(VersionInfo, 'load');
        versionInfoLoadMock.mockResolvedValueOnce({
            name: 'sap.ui.core',
            version: '1.124.11'
        });
        const version = await getUi5Version();
        expect(versionInfoLoadMock).toHaveBeenCalledWith({ library: 'sap.ui.core' });
        expect(version.major).toEqual(1);
        expect(version.minor).toEqual(124);
        expect(version.patch).toEqual(11);
    });

    test('getUi5Version fallback to 1.130.0', async () => {
        const version = await getUi5Version();
        expect(version.major).toEqual(1);
        expect(version.minor).toEqual(130);
        expect(sendInfoCenterMessage).toHaveBeenCalledWith({
            title: { key: 'FLP_UI_VERSION_RETRIEVAL_FAILURE_TITLE' },
            description: { key: 'FLP_UI_VERSION_RETRIEVAL_FAILURE_DESCRIPTION', params: ['1.130.0'] },
            type: MessageBarType.error
        });
    });

    test('getUi5Version for snapshot', async () => {
        const versionInfoLoadMock = jest.spyOn(VersionInfo, 'load').mockResolvedValueOnce({
            name: 'sap.ui.core',
            version: '1.128.0-SNAPSHOT'
        });
        const version = await getUi5Version();
        expect(versionInfoLoadMock).toHaveBeenCalledWith({ library: 'sap.ui.core' });
        expect(version.major).toEqual(1);
        expect(version.minor).toEqual(128);
    });

    test('test minimal UI5 version return value for different use cases', () => {
        //returns false for higher major versions using default
        expect(isLowerThanMinimalUi5Version({ major: 2, minor: 0 })).toBeFalsy();
        //returns false for higher major versions
        expect(
            isLowerThanMinimalUi5Version(
                { major: 2, minor: 70 },
                { major: 2, minor: 69 }
            )
        ).toBeFalsy();
        //returns false for higher minor versions using default
        expect(isLowerThanMinimalUi5Version({ major: 1, minor: 71 })).toBeFalsy();
        //returns false for higher minor versions
        expect(
            isLowerThanMinimalUi5Version(
                { major: 1, minor: 71 },
                { major: 1, minor: 70 }
            )
        ).toBeFalsy();
        //returns false for minimum versions using default
        expect(isLowerThanMinimalUi5Version({ major: 1, minor: 71 })).toBeFalsy();
        //throw error in case on NaN
        expect(() => isLowerThanMinimalUi5Version({ major: NaN, minor: NaN })).toThrow();
        //returns true for lower minor versions using default
        expect(isLowerThanMinimalUi5Version({ major: 1, minor: 70 })).toBeTruthy();
        //returns true for lower major versions using default
        expect(isLowerThanMinimalUi5Version({ major: 0, minor: 70 })).toBeTruthy();
    });

    test('test higher patch for equal UI5 version return value for different use cases', () => {
        //returns false for higher major version using default
        expect(isVersionEqualOrHasNewerPatch({ major: 2, minor: 0 })).toBeFalsy();
        //returns true for higher patch version using default
        expect(isVersionEqualOrHasNewerPatch({ major: 1, minor: 71, patch: 3 })).toBeTruthy();
        //returns true for higher patch version
        expect(
            isVersionEqualOrHasNewerPatch(
                { major: 1, minor: 124, patch: 4 },
                { major: 1, minor: 124, patch: 3 }
            )
        ).toBeTruthy();
        //returns true for same patch version
        expect(
            isVersionEqualOrHasNewerPatch(
                { major: 1, minor: 124, patch: 3 },
                { major: 1, minor: 124, patch: 3 }
            )
        ).toBeTruthy();
        //returns false for lower patch version
        expect(
            isVersionEqualOrHasNewerPatch(
                { major: 1, minor: 124, patch: 3 },
                { major: 1, minor: 124, patch: 4 }
            )
        ).toBeFalsy();
        //throw error in case on NaN
        expect(() => isLowerThanMinimalUi5Version({ major: NaN, minor: NaN })).toThrow();
        //throw error in case on NaN
        expect(() => isLowerThanMinimalUi5Version({ major: 1, minor: 1, patch: NaN })).toThrowError();
        expect(sendInfoCenterMessage).toHaveBeenCalledWith({
            title: { key: 'FLP_UI_VERSION_RETRIEVAL_FAILURE_TITLE' },
            description: {
                key: 'FLP_UI_INVALID_UI5_VERSION_DESCRIPTION',
            },
            type: MessageBarType.error
        });
    });
});
