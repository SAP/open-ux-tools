import type { BackendSystem } from '../../../src/entities/backend-system';
import { BackendSystemKey } from '../../../src/entities/backend-system';

describe('getSystemEntityKey', () => {
    describe('getId', () => {
        it('returns key containing name only', () => {
            const sys: BackendSystem = { name: 'system name', url: 'http://system1' };
            expect(new BackendSystemKey(sys).getId()).toEqual('system name');
        });

        it('trims any whitespace in the system name', () => {
            const sys: BackendSystem = { name: 'system name 1 ', url: 'http://system' };
            expect(new BackendSystemKey(sys).getId()).toEqual('system name 1');
        });
    });
});
