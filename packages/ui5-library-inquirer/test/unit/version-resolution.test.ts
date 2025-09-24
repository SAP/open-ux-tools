import { findNearestNpmVersion } from '../../src/index';
import * as commands from '@sap-ux/ui5-info/dist/commands';

/**
 * Tests for version comparison and resolution utilities
 */
describe('Version Comparison Utilities', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Version Comparison Logic', () => {
        const mockVersions = [
            '1.84.0',
            '1.96.0',
            '1.108.0',
            '1.116.0',
            '1.117.0',
            '1.118.0',
            '1.118.1',
            '1.119.0',
            '1.120.0',
            '1.120.1'
        ];

        beforeEach(() => {
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(mockVersions);
        });

        it('should correctly compare major versions', async () => {
            const result = await findNearestNpmVersion('2.0.0');
            expect(result).toBe('1.120.1'); // Should return highest available 1.x version
        });

        it('should correctly compare minor versions', async () => {
            const result = await findNearestNpmVersion('1.118.5');
            expect(result).toBe('1.118.1'); // Should return nearest lower patch version
        });

        it('should correctly compare patch versions', async () => {
            const result = await findNearestNpmVersion('1.120.0');
            expect(result).toBe('1.120.0'); // Exact match
        });

        it('should handle versions with different number of segments', async () => {
            const mixedVersions = ['1.84.0', '1.96.0', '1.108.0', '1.116.0'];
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(mixedVersions);

            const result = await findNearestNpmVersion('1.95.0');
            expect(result).toBe('1.84.0'); // Should find nearest lower version
        });

        it('should sort versions correctly', async () => {
            const unsortedVersions = ['1.120.0', '1.84.0', '1.118.0', '1.96.0', '1.119.0'];
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(unsortedVersions);

            const result = await findNearestNpmVersion('1.118.5');
            expect(result).toBe('1.118.0'); // Should find correct version despite unsorted input
        });

        it('should handle edge cases with zero versions', async () => {
            const zeroVersions = ['1.0.0', '1.0.1', '1.1.0', '2.0.0'];
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(zeroVersions);

            const result = await findNearestNpmVersion('1.0.5');
            expect(result).toBe('1.0.1');
        });

        it('should handle pre-release version patterns gracefully', async () => {
            const versionsWithInvalid = ['1.116.0', '1.117.0-beta', '1.118.0', '1.119.0-snapshot', '1.120.0'];
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(versionsWithInvalid);

            const result = await findNearestNpmVersion('1.119.0');
            expect(result).toBe('1.118.0'); // Should filter out pre-release and find nearest valid version
        });
    });

    describe('Error Handling', () => {
        it('should handle network errors gracefully', async () => {
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockRejectedValue(
                new Error('ENOTFOUND registry.npmjs.org')
            );

            const result = await findNearestNpmVersion('1.118.0');
            expect(result).toBe('1.118.0'); // Should fallback to original version
        });

        it('should handle timeout errors', async () => {
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockRejectedValue(new Error('Request timeout'));

            const result = await findNearestNpmVersion('1.118.0');
            expect(result).toBe('1.118.0');
        });

        it('should handle empty response from npm', async () => {
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue([]);

            const result = await findNearestNpmVersion('1.118.0');
            expect(result).toBe('1.118.0');
        });

        it('should handle malformed version responses', async () => {
            const malformedVersions = ['invalid', '', null, undefined, '1.118.0'].filter(Boolean) as string[];
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(malformedVersions);

            const result = await findNearestNpmVersion('1.119.0');
            expect(result).toBe('1.118.0'); // Should filter out invalid versions
        });
    });

    describe('Real-world Scenarios', () => {
        it('should handle typical SAP UI5 version patterns', async () => {
            const sapUI5Versions = [
                '1.84.0',
                '1.96.0',
                '1.108.0',
                '1.116.0',
                '1.117.0',
                '1.118.0',
                '1.119.0',
                '1.120.0'
            ];
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(sapUI5Versions);

            // Test common user selections
            expect(await findNearestNpmVersion('1.118.5')).toBe('1.118.0');
            expect(await findNearestNpmVersion('1.121.0')).toBe('1.120.0');
            expect(await findNearestNpmVersion('1.80.0')).toBe('1.84.0'); // Should go to lowest if below all
        });

        it('should handle Fiori tools version requirements', async () => {
            const fioriVersions = [
                '1.84.0', // Min for some templates
                '1.90.0', // Min for ALP v4 template
                '1.94.0', // Min for FPM template
                '1.96.8', // Min for Overview v4 template
                '1.99.0', // Min for Worklist v4 template
                '1.104.0', // Recent maintained
                '1.120.0' // Latest
            ];
            jest.spyOn(commands, 'executeNpmUI5VersionsCmd').mockResolvedValue(fioriVersions);

            // Test template requirements
            expect(await findNearestNpmVersion('1.96.0')).toBe('1.94.0'); // FPM template fallback
            expect(await findNearestNpmVersion('1.100.0')).toBe('1.99.0'); // Worklist template fallback
        });
    });
});
