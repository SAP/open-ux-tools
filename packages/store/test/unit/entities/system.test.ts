import type { BackendSystem } from '../../../src/entities/backend-system';
import { BackendSystemKey } from '../../../src/entities/backend-system';

describe('getSystemEntityKey', () => {
    describe('getId', () => {
        it('returns key containing url only', () => {
            const sys: BackendSystem = { name: 'sys', url: 'http://system1' };
            expect(new BackendSystemKey(sys).getId()).toEqual('http://system1');
        });

        it('trims any whitespace in the system url', () => {
            const sys: BackendSystem = { name: 'sys', url: '    http://system1    \t' };
            expect(new BackendSystemKey(sys).getId()).toEqual('http://system1');
        });

        it('leading / in the url is handled', () => {
            const sys: BackendSystem = { name: 'sys', url: '    http://system1/    \t' };
            expect(new BackendSystemKey(sys).getId()).toEqual('http://system1');
        });

        it('returns key containing url & client', () => {
            const sys: BackendSystem = { name: 'sys', url: 'http://system1', client: '100' };
            expect(new BackendSystemKey(sys).getId()).toEqual('http://system1/100');
        });

        it('trims any whitespace in the system url', () => {
            const sys: BackendSystem = { name: 'sys', url: '    http://system1    \t', client: '100' };
            expect(new BackendSystemKey(sys).getId()).toEqual('http://system1/100');
        });

        it('leading / in the url is handled', () => {
            const sys: BackendSystem = { name: 'sys', url: '    http://system1/    \t', client: '100' };
            expect(new BackendSystemKey(sys).getId()).toEqual('http://system1/100');
        });
    });
});
