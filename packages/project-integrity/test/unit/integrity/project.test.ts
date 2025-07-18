import { join } from 'path';
import {
    checkProjectIntegrity,
    disableProjectIntegrity,
    enableProjectIntegrity,
    initProject,
    isProjectIntegrityEnabled,
    updateProjectIntegrity
} from '../../../src';
import * as persistence from '../../../src/integrity/persistence';

describe('Test initProject()', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Test initProject() with valid project', async () => {
        const integrityFilePath = join(__dirname, '../../test-input/valid-project/.integrity.json');
        const targetIntegrityData = await persistence.readIntegrityData(integrityFilePath);
        await initProject({
            integrityFilePath,
            fileList: [join(__dirname, '../../test-input/valid-project/test.txt')],
            additionalStringContent: { 'key1': 'value1', 'key2': 'value2' }
        });
        const newIntegrityData = await persistence.readIntegrityData(integrityFilePath);
        expect(newIntegrityData).toStrictEqual(targetIntegrityData);
    });
});

describe('Test checkProjectIntegrity()', () => {
    test('Valid project, valid additional content', async () => {
        const integrityFilePath = join(__dirname, '../../test-input/valid-project/.integrity.json');
        const result = await checkProjectIntegrity(integrityFilePath, { 'key1': 'value1', 'key2': 'value2' });
        expect(result.files.differentFiles.length).toBe(0);
        expect(result.files.equalFiles.find((ef) => ef.includes('test.txt'))).toBeDefined();
        expect(result.additionalStringContent.differentContent.length).toBe(0);
        expect(result.additionalStringContent.equalContent).toEqual(['key1', 'key2']);
    });

    test('Invalid project', async () => {
        const integrityFilePath = join(__dirname, '../../test-input/invalid-project/integrity.json');
        const result = await checkProjectIntegrity(integrityFilePath, {
            'one': 'value one',
            'two': 'not value two',
            'four': 'non existing'
        });
        const bad = result.files.differentFiles.find((df) => df.filePath.includes('bad.xml'));
        const noneExistingFile = result.files.differentFiles.find((df) => df.filePath.includes('non-existing.file'));
        expect(result.files.equalFiles.length).toBe(1);
        expect(result.files.equalFiles.find((ef) => ef.includes('good.txt'))).toBeDefined();
        expect(bad?.newContent).toBe('<xml>\n    <text>Changed XML</text>\n</xml>');
        expect(bad?.oldContent).toBe('<xml>\n    <text>Test XML file</text>\n</xml>');
        expect(noneExistingFile?.oldContent).toBe('Non existing');
        expect(result.additionalStringContent.equalContent).toContain('one');
        expect(result.additionalStringContent.differentContent).toStrictEqual([
            { 'key': 'two', 'newContent': 'not value two', 'oldContent': 'value two' },
            { 'key': 'four', 'newContent': 'non existing', 'oldContent': undefined },
            { 'key': 'three', 'newContent': undefined, 'oldContent': 'value three' }
        ]);
    });

    test('Disabled project', async () => {
        const integrityFilePath = join(__dirname, '../../test-input/disabled-project/integrity.json');
        try {
            await checkProjectIntegrity(integrityFilePath);
            expect(false).toBe('checkProjectIntegrity() should have thrown error but did not');
        } catch (error) {
            expect(error.message).toBe(
                `Integrity is disabled for the project with integrity data ${integrityFilePath}`
            );
        }
    });
});

describe('Test updateProjectIntegrity()', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    test('Update invalid project', async () => {
        const writeSpy = jest.spyOn(persistence, 'writeIntegrityData').mockResolvedValueOnce();

        const integrityFilePath = join(__dirname, '../../test-input/update-project/integrity.json');
        await updateProjectIntegrity(integrityFilePath, { 'key': 'new string' });
        expect(writeSpy).toBeCalledWith(expect.stringContaining('integrity.json'), {
            'enabled': true,
            'fileIntegrity': [
                {
                    'filePath': expect.stringContaining('file-to-update.txt') as string,
                    'hash': '96c15c2bb2921193bf290df8cd85e2ba',
                    'content': 'new content'
                }
            ],
            'contentIntegrity': [
                { 'contentKey': 'key', 'hash': 'b200a3adbe85fe848b920dc35d5a69b2', 'content': 'new string' }
            ]
        });
    });

    test('Update with non existing additional string content', async () => {
        const integrityFilePath = join(__dirname, '../../test-input/valid-project/.integrity.json');
        try {
            await updateProjectIntegrity(integrityFilePath, { 'key1': 'value1', 'wrong': 'wrong content' });
            expect(false).toBe('updateProjectIntegrity() should have thrown error but did not');
        } catch (error) {
            expect(error.message).toBe(
                'There is a mismatch of additional content keys.\nStored content keys: key1, key2\nNew content keys: key1, wrong'
            );
        }
    });

    test('Update with non existing integrity file', async () => {
        try {
            await updateProjectIntegrity('non-existing');
            expect(false).toBe('updateProjectIntegrity() should have thrown error but did not');
        } catch (error) {
            expect(error.message).toBe('Integrity data not found at non-existing');
        }
    });

    test('Update disabled project', async () => {
        const integrityFilePath = join(__dirname, '../../test-input/disabled-project/integrity.json');
        try {
            await updateProjectIntegrity(integrityFilePath);
            expect(false).toBe('updateProjectIntegrity() should have thrown error but did not');
        } catch (error) {
            expect(error.message).toBe(
                `Integrity is disabled for the project with integrity data ${integrityFilePath}`
            );
        }
    });
});

describe('Test isProjectIntegrityEnabled()', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    test('Check enabled project', async () => {
        const integrityFilePath = join(__dirname, '../../test-input/enabled-project/integrity.json');
        const enabled = await isProjectIntegrityEnabled(integrityFilePath);
        expect(enabled).toBe(true);
    });

    test('Check disabled project', async () => {
        const integrityFilePath = join(__dirname, '../../test-input/disabled-project/integrity.json');
        const enabled = await isProjectIntegrityEnabled(integrityFilePath);
        expect(enabled).toBe(false);
    });

    test('Check non existing project', async () => {
        try {
            await isProjectIntegrityEnabled('non-existing');
            expect(false).toBe('isProjectIntegrityEnabled() should have thrown error but did not');
        } catch (error) {
            expect(error.message).toBe('Integrity data not found at non-existing');
        }
    });
});

describe('Test enableProjectIntegrity()', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    test('Enable integrity for disabled project', async () => {
        const writeSpy = jest.spyOn(persistence, 'writeIntegrityData').mockResolvedValueOnce();
        const integrityFilePath = join(__dirname, '../../test-input/disabled-project/integrity.json');
        await enableProjectIntegrity(integrityFilePath);
        expect(writeSpy).toBeCalledWith(expect.stringContaining('integrity.json'), {
            'enabled': true,
            'fileIntegrity': [],
            'contentIntegrity': []
        });
    });

    test('Enable integrity for enabled project', async () => {
        const writeSpy = jest.spyOn(persistence, 'writeIntegrityData').mockResolvedValueOnce();
        const integrityFilePath = join(__dirname, '../../test-input/enabled-project/integrity.json');
        await enableProjectIntegrity(integrityFilePath);
        // project already enabled, so writeIntegrityData should not be called
        expect(writeSpy).not.toBeCalled();
    });

    test('Enable integrity for non existing project', async () => {
        try {
            await enableProjectIntegrity('non-existing');
            expect(false).toBe('enableProjectIntegrity() should have thrown error but did not');
        } catch (error) {
            expect(error.message).toBe('Integrity data not found at non-existing');
        }
    });
});

describe('Test disableProjectIntegrity()', () => {
    afterEach(() => {
        jest.resetAllMocks();
    });

    test('Disable integrity for enabled project', async () => {
        const writeSpy = jest.spyOn(persistence, 'writeIntegrityData').mockResolvedValueOnce();
        const integrityFilePath = join(__dirname, '../../test-input/enabled-project/integrity.json');
        await disableProjectIntegrity(integrityFilePath);
        expect(writeSpy).toBeCalledWith(expect.stringContaining('integrity.json'), {
            'enabled': false,
            'fileIntegrity': [],
            'contentIntegrity': []
        });
    });

    test('Disable integrity for disabled project', async () => {
        const writeSpy = jest.spyOn(persistence, 'writeIntegrityData').mockResolvedValueOnce();
        const integrityFilePath = join(__dirname, '../../test-input/disabled-project/integrity.json');
        await disableProjectIntegrity(integrityFilePath);
        // project already disabled, so writeIntegrityData should not be called
        expect(writeSpy).not.toBeCalled();
    });

    test('Disable integrity for non existing project', async () => {
        try {
            await disableProjectIntegrity('non-existing');
            expect(false).toBe('disableProjectIntegrity() should have thrown error but did not');
        } catch (error) {
            expect(error.message).toBe('Integrity data not found at non-existing');
        }
    });
});
