import { propertiesToI18nEntry } from '../../../../src/index.js';
describe('properties', () => {
    test('propertiesToI18nEntry', () => {
        // arrange
        const content = `
            # This is the resource bundle for test

            #XTIT: Application name
            appTitle=App Title
            
            #YDES,30: Application description
            appDescription=A Fiori application

            productCategory=product category
        `;
        // act
        const result = propertiesToI18nEntry(content);
        // assert
        expect(result).toMatchSnapshot();
    });

    describe('values that start with a comment or separator character', () => {
        const read = (content: string) => propertiesToI18nEntry(content).map((e) => [e.key.value, e.value.value]);

        test.each([
            ['k=#x', [['k', '#x']]],
            ['k=!x', [['k', '!x']]],
            ['k = #x', [['k', '#x']]],
            ['k==v', [['k', '=v']]],
            ['k=:v', [['k', ':v']]],
            ['k:=v', [['k', '=v']]],
            [
                ['k=#x', 'a=b'].join('\n'),
                [
                    ['k', '#x'],
                    ['a', 'b']
                ]
            ],
            [
                ['k=#x', '#comment', 'a=!y'].join('\n'),
                [
                    ['k', '#x'],
                    ['a', '!y']
                ]
            ]
        ])('%j', (content, expected) => {
            expect(read(content)).toEqual(expected);
        });

        test('comments at the start of a line are still comments', () => {
            expect(read(['#c1', '  !c2', 'k=v', '# c3', 'a=b'].join('\n'))).toEqual([
                ['k', 'v'],
                ['a', 'b']
            ]);
        });
    });
});
