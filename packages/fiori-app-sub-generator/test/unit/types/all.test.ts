import type { CapRuntime } from '@sap-ux/odata-service-inquirer';
import { capTypeConversion, LEGACY_CAP_TYPE_NODE, LEGACY_CAP_TYPE_JAVA } from '../../../src/types';

describe('Test types', () => {
    test('capTypeConversion', () => {
        expect(capTypeConversion('Node.js' as CapRuntime)).toBe('Node.js');
        expect(capTypeConversion('Java' as CapRuntime)).toBe('Java');
        expect(capTypeConversion(LEGACY_CAP_TYPE_JAVA)).toBe('Java');
        expect(capTypeConversion(LEGACY_CAP_TYPE_NODE)).toBe('Node.js');
        expect(capTypeConversion('Invalid')).toBe('Node.js');
    });
});
