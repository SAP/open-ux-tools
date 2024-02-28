import { propertiesToI18nEntry } from '../../../../src';
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
});
