import os from 'os';
import { insertTextAtPosition } from '../../src/common/utils';

describe('insertTextAtPosition', () => {
    const content = `Line 0,${os.EOL}Line 1,${os.EOL}Line 2,${os.EOL}Line 3`;
    test('Insert at beginning', () => {
        const text = 'dummy';
        const newContent = insertTextAtPosition(text, content, {
            line: 0,
            character: 0
        });
        expect(newContent).toEqual(`${text}${content}`);
    });

    test('Insert at end', () => {
        const text = 'dummy';
        const newContent = insertTextAtPosition(text, content, {
            line: 3,
            character: 6
        });
        expect(newContent).toEqual(`${content}${text}`);
    });

    test('Insert at middle', () => {
        const text = 'dummy';
        const newContent = insertTextAtPosition(text, content, {
            line: 1,
            character: 2
        });
        expect(newContent).toEqual(`Line 0,${os.EOL}Li${text}ne 1,${os.EOL}Line 2,${os.EOL}Line 3`);
    });

    test('Line and char out of range', () => {
        const text = 'dummy';
        const newContent = insertTextAtPosition(text, '', {
            line: 10,
            character: 5
        });
        expect(newContent).toEqual(
            `${os.EOL}${os.EOL}${os.EOL}${os.EOL}${os.EOL}${os.EOL}${os.EOL}${os.EOL}${os.EOL}${os.EOL}     ${text}`
        );
    });

    const negativeValues = [
        {
            line: -1,
            character: 1
        },
        {
            line: 1,
            character: -1
        },
        {
            line: -1,
            character: -1
        }
    ];
    for (const negativeValue of negativeValues) {
        test(`Negative values - line=${negativeValue.line}, character=${negativeValue.character}`, () => {
            const text = 'dummy';
            const newContent = insertTextAtPosition(text, content, negativeValue);
            expect(newContent).toEqual(content);
        });
    }
});
