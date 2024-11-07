import { join } from 'path';
import { checkProjectIntegrity } from '../../../src';

describe('Test checkProjectIntegrity()', () => {
    test('Valid project', async () => {
        const projectRoot = join(__dirname, '../../test-input/valid-project');
        const result = await checkProjectIntegrity(projectRoot);
        expect(result.differentFiles.length).toBe(0);
        expect(result.equalFiles.find((ef) => ef.includes('test.txt'))).toBeDefined();
    });

    test('Invalid project', async () => {
        const projectRoot = join(__dirname, '../../test-input/invalid-project');
        const result = await checkProjectIntegrity(projectRoot);
        expect(result.differentFiles.length).toBeGreaterThan(0);
        expect(result.differentFiles.find((df) => df.includes('non-existing'))).toBeDefined();
    });
});
