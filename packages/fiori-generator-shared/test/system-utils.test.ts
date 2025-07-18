import { getSystemDisplayName } from '../src';

describe('Test SystemUtils', () => {
    describe('getSystemDisplayName', () => {
        test.each([
            // Basic scenario
            ['System1', undefined, false, false, 'System1'],
            ['System1', 'User1', false, false, 'System1 [User1]'],

            // BTP scenario
            ['System2', undefined, true, false, 'System2 (BTP)'],
            ['System2', 'User2', true, false, 'System2 (BTP) [User2]'],

            // S/4HANA Cloud scenario
            ['System3', undefined, false, true, 'System3 (S4HC)'],
            ['System3', 'User3', false, true, 'System3 (S4HC) [User3]'],

            // No suffix scenario
            ['System5', undefined, false, false, 'System5'],
            ['System5', 'User5', false, false, 'System5 [User5]']
        ])(
            'returns correct display name for systemName: %s, displayUsername: %s, isBtp: %s, isS4HC: %s',
            (systemName, displayUsername, isBtp, isS4HC, expected) => {
                const result = getSystemDisplayName(systemName, displayUsername, isBtp, isS4HC);
                expect(result).toBe(expected);
            }
        );
    });
});
