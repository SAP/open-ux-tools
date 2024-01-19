import { EDMX_ELEMENT_NAMES, EdmxElementName } from '@sap-ux/odata-annotation-core-types';

describe('names', () => {
    it('EDMX_ELEMENT_NAMES', () => {
        expect(EDMX_ELEMENT_NAMES.has(EdmxElementName.DataServices)).toBeTruthy();
        expect(EDMX_ELEMENT_NAMES.has(EdmxElementName.Edmx)).toBeTruthy();
        expect(EDMX_ELEMENT_NAMES.has(EdmxElementName.Include)).toBeTruthy();
        expect(EDMX_ELEMENT_NAMES.has(EdmxElementName.IncludeAnnotations)).toBeTruthy();
        expect(EDMX_ELEMENT_NAMES.has(EdmxElementName.Reference)).toBeTruthy();
    });
});
