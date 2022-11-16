import { handleCreateFioriCommand } from '../../../src/cli';

describe('Test handleCreateFioriCommand()', () => {
    test('Command without argv, should throw error', () => {
        expect(() => handleCreateFioriCommand([])).toThrowError('argv');
    });
});
