import { isExtensionInstalled } from '../src/installedCheck';

describe('Installed module checker', () => {
    test('isExtensionInstalled', () => {
        expect(isExtensionInstalled(undefined, 'wont.be.found.extension')).toBe(false);

        const mockVSCodeRef = {
            extensions: {
                getExtension: () => ({
                    packageJSON: {
                        version: '1.2.3'
                    }
                })
            }
        };

        expect(isExtensionInstalled(mockVSCodeRef, 'will.be.found.extension')).toBe(true);
        expect(isExtensionInstalled(mockVSCodeRef, 'version.not.satisfied.extension', '1.2.4')).toBe(false);
        expect(isExtensionInstalled(mockVSCodeRef, 'version.equal.extension', '1.2.3')).toBe(true);
        expect(isExtensionInstalled(mockVSCodeRef, 'version.lower.extension', '0.0.1')).toBe(true);
    });
});
