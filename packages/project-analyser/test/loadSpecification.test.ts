import { getSpecification } from './uxSpecificationSchemaLoader';

describe('load specification', () => {
    it('returns contents of a specification json files sample', async () => {
        const result = getSpecification('./test/fixtures/lrop-v4');
        expect(result).toBeDefined();
        expect(result.schemas).toBeDefined();
        expect(result.pages).toBeDefined();

        expect(result.schemas.App).toBeDefined();
        expect(result.schemas.BuildingBlocks).toBeDefined();
        expect(result.schemas.ListReport).toBeDefined();
        expect(result.schemas.ListReport_TravelList).toBeDefined();
        expect(result.schemas.ObjectPage).toBeDefined();
        expect(result.schemas.ObjectPage_BookingObjectPage).toBeDefined();
        expect(result.schemas.ObjectPage_TravelObjectPage).toBeDefined();

        expect(result.pages.app).toBeDefined();
        expect(result.pages.BookingObjectPage).toBeDefined();
        expect(result.pages.TravelList).toBeDefined();
        expect(result.pages.TravelObjectPage).toBeDefined();
    });
});
