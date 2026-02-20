import { getSystemDisplayName } from '../src';

describe('Test SystemUtils', () => {
    describe('getSystemDisplayName', () => {
        test.each([
            // Basic scenario
            ['System1', undefined, undefined, 'System1'],
            ['System1', 'User1', undefined, 'System1 [User1]'],

            // ABAP Cloud
            ['System1', undefined, 'AbapCloud', 'System1 (ABAP Cloud)'],
            ['System1', 'User1', 'AbapCloud', 'System1 (ABAP Cloud) [User1]'],

            // Legacy stored BTP scenario
            ['System2', undefined, 'BTP', 'System2 (ABAP Cloud)'],
            ['System2', 'User2', 'BTP', 'System2 (ABAP Cloud) [User2]'],

            // Legacy stored S/4HANA Cloud scenario
            ['System3', undefined, 'S4HC', 'System3 (ABAP Cloud)'],
            ['System3', 'User3', 'S4HC', 'System3 (ABAP Cloud) [User3]'],

            // No suffix scenario
            ['System5', undefined, undefined, 'System5'],
            ['System5', 'User5', undefined, 'System5 [User5]']
        ])(
            'returns correct display name for systemName: %s, displayUsername: %s, systemType: %s',
            (systemName, displayUsername, systemType, expected) => {
                const result = getSystemDisplayName(systemName, displayUsername, systemType);
                expect(result).toBe(expected);
            }
        );
    });
});
