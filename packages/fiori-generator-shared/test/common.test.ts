import { getResourceUrlsForUi5Bootstrap } from '../src/index';

describe('getResourceUrlsForUi5Bootstrap', () => {
    it('should return relative paths for Edmx projects', () => {
        const result = getResourceUrlsForUi5Bootstrap(true);
        expect(result).toEqual({
            uShellBootstrapResourceUrl: '../test-resources/sap/ushell/bootstrap/sandbox.js',
            uiBootsrapResourceUrl: '../resources/sap-ui-core.js'
        });
    });

    it('should return framework paths when frameworkUrl and version are provided for non-Edmx projects', () => {
        const result = getResourceUrlsForUi5Bootstrap(false, 'https://ui5.sap.com', '1.84.0');
        expect(result).toEqual({
            uShellBootstrapResourceUrl: 'https://ui5.sap.com/1.84.0/test-resources/sap/ushell/bootstrap/sandbox.js',
            uiBootsrapResourceUrl: 'https://ui5.sap.com/1.84.0/resources/sap-ui-core.js'
        });
    });

    it('should return absolute paths when frameworkUrl is not provided for non-Edmx projects', () => {
        const result = getResourceUrlsForUi5Bootstrap(false);
        expect(result).toEqual({
            uShellBootstrapResourceUrl: '../test-resources/sap/ushell/bootstrap/sandbox.js',
            uiBootsrapResourceUrl: '../resources/sap-ui-core.js'
        });
    });

    it('should handle cases where only frameworkUrl is provided without version', () => {
        const result = getResourceUrlsForUi5Bootstrap(false, 'https://ui5.sap.com');
        expect(result).toEqual({
            uShellBootstrapResourceUrl: 'https://ui5.sap.com/test-resources/sap/ushell/bootstrap/sandbox.js',
            uiBootsrapResourceUrl: 'https://ui5.sap.com/resources/sap-ui-core.js'
        });
    });

    it('should handle cases where only version is provided without frameworkUrl', () => {
        // Not a typical scenario, but included for completeness
        const result = getResourceUrlsForUi5Bootstrap(false, undefined, '1.84.0');
        expect(result).toEqual({
            uShellBootstrapResourceUrl: '../test-resources/sap/ushell/bootstrap/sandbox.js',
            uiBootsrapResourceUrl: '../resources/sap-ui-core.js'
        });
    });
});
