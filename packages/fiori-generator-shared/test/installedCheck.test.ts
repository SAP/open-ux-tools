import { isExtensionInstalled } from '../src/vscode-helpers/vscode-helpers';

describe('Installed module checker', () => {
    test('isExtensionInstalled', () => {
        expect(isExtensionInstalled(undefined, 'wont.be.found.extension')).toBe(false);

        const mockVSCodeRef = {
            extensions: {
                getExtension: () => ({
                    packageJSON: {
                        version: '1.2.3'
                    },
                    isActive: true
                })
            }
        };

        expect(isExtensionInstalled(mockVSCodeRef, 'will.be.found.extension')).toBe(true);
        expect(isExtensionInstalled(mockVSCodeRef, 'version.not.satisfied.extension', '1.2.4')).toBe(false);
        expect(isExtensionInstalled(mockVSCodeRef, 'version.equal.extension', '1.2.3')).toBe(true);
        expect(isExtensionInstalled(mockVSCodeRef, 'version.lower.extension', '0.0.1')).toBe(true);
    });

    test('isExtensionInstalled with isActive parameter', () => {
        const mockVSCodeRefActive = {
            extensions: {
                getExtension: () => ({
                    packageJSON: {
                        version: '1.2.3'
                    },
                    isActive: true
                })
            }
        };

        const mockVSCodeRefInactive = {
            extensions: {
                getExtension: () => ({
                    packageJSON: {
                        version: '1.2.3'
                    },
                    isActive: false
                })
            }
        };

        // active extension checks
        expect(isExtensionInstalled(mockVSCodeRefActive, 'active.extension', undefined, true)).toBe(true);
        expect(isExtensionInstalled(mockVSCodeRefActive, 'active.extension', '1.2.3', true)).toBe(true);

        // inactive extension checks
        expect(isExtensionInstalled(mockVSCodeRefInactive, 'inactive.extension', undefined, true)).toBe(false);
        expect(isExtensionInstalled(mockVSCodeRefInactive, 'inactive.extension', '1.2.3', true)).toBe(false);
    });
});
