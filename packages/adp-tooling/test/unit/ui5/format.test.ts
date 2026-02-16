import {
    getOfficialBaseUI5VersionUrl,
    getFormattedVersion,
    buildSystemVersionLabel,
    removeBracketsFromVersion,
    removeMicroPart,
    addSnapshot,
    parseUI5Version,
    isFeatureSupportedVersion,
    formatUi5Version
} from '../../../src/ui5/format';

import { CURRENT_SYSTEM_VERSION, SNAPSHOT_CDN_URL, UI5_CDN_URL } from '../../../src/base/constants';
import { format } from 'node:path';

describe('getOfficialBaseUI5VersionUrl', () => {
    it('returns SNAPSHOT_CDN_URL for snapshot versions', () => {
        expect(getOfficialBaseUI5VersionUrl('1.120.0-snapshot')).toBe(SNAPSHOT_CDN_URL);
    });

    it('returns UI5_CDN_URL for non-snapshot versions', () => {
        expect(getOfficialBaseUI5VersionUrl('1.120.0')).toBe(UI5_CDN_URL);
    });
});

describe('getFormattedVersion', () => {
    it('removes brackets and formats snapshot version correctly', () => {
        expect(getFormattedVersion('1.120.0-snapshot')).toBe('snapshot-1.120');
    });

    it('returns non-snapshot version as is', () => {
        expect(getFormattedVersion('1.118.5')).toBe('1.118.5');
    });

    it('removes bracketed suffix like (latest)', () => {
        expect(getFormattedVersion('1.120.0 (latest)')).toBe('1.120.0');
    });
});

describe('buildSystemVersionLabel', () => {
    it('combines version, snapshot, and label correctly', () => {
        const result = buildSystemVersionLabel('1.120.0', '-snapshot', ' (latest)');
        expect(result).toBe(`1.120.0-snapshot ${CURRENT_SYSTEM_VERSION} (latest)`);
    });
});

describe('removeBracketsFromVersion', () => {
    it('removes anything after opening bracket', () => {
        expect(removeBracketsFromVersion('1.120.0 (latest)')).toBe('1.120.0');
    });

    it('returns original version if no brackets', () => {
        expect(removeBracketsFromVersion('1.118.5')).toBe('1.118.5');
    });
});

describe('removeMicroPart', () => {
    it('returns major.minor only', () => {
        expect(removeMicroPart('1.87.3')).toBe('1.87');
    });
});

describe('formatUi5Version', () => {
    it('removes the fourth segment if exists', () => {
        expect(formatUi5Version('1.95.0.1234567890')).toBe('1.95.0');
    });
    it('removes the snapshot from the patch number', () => {
        expect(formatUi5Version('1.96.0-snapshot')).toBe('1.96.0');
        expect(formatUi5Version('1.96.123-snapshot')).toBe('1.96.123');
        expect(formatUi5Version('1.96.3-SNAPSHOT')).toBe('1.96.3');
    });

    it('returns original if only 3 segments', () => {
        expect(formatUi5Version('1.120.1')).toBe('1.120.1');
    });
});

describe('addSnapshot', () => {
    it('returns -snapshot if version has timestamp and differs from latest', () => {
        expect(addSnapshot('1.95.0.1234567890', '1.96.0')).toBe('-snapshot');
    });

    it('returns empty string if no timestamp', () => {
        expect(addSnapshot('1.95.0', '1.95.0')).toBe('');
    });

    it('returns empty string if timestamp version matches latest version', () => {
        expect(addSnapshot('1.95.0.1234567890', '1.95.0')).toBe('');
    });
});

describe('parseUI5Version', () => {
    it('parses regular version correctly', () => {
        const result = parseUI5Version('1.86.11');
        expect(result).toEqual({ major: 1, minor: 86, patch: 11 });
    });

    it('parses snapshot version correctly', () => {
        const result = parseUI5Version('snapshot-1.86.11');
        expect(result).toEqual({ major: 1, minor: 86, patch: 11 });
    });

    it('returns NaN values for non-numeric version', () => {
        const result = parseUI5Version('snapshot');
        expect(result).toEqual({ major: NaN, minor: NaN, patch: NaN });
    });
});

describe('isFeatureSupportedVersion', () => {
    it('returns true if current version is greater than feature version', () => {
        expect(isFeatureSupportedVersion('1.80.0', '1.85.0')).toBe(true);
    });

    it('returns true if current version is equal to feature version', () => {
        expect(isFeatureSupportedVersion('1.85.0', '1.85.0')).toBe(true);
    });

    it('returns false if current version is less than feature version', () => {
        expect(isFeatureSupportedVersion('1.90.0', '1.85.0')).toBe(false);
    });

    it('returns false if version is not provided', () => {
        expect(isFeatureSupportedVersion('1.90.0')).toBe(false);
    });

    it('returns true if parsed version is NaN (i.e. snapshot)', () => {
        expect(isFeatureSupportedVersion('1.85.0', 'snapshot')).toBe(true);
    });
});
