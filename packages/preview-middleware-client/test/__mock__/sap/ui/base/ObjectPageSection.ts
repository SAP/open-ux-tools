import ObjectPageSection from 'sap/uxap/ObjectPageSection';

// add required functionality for testing here
export class ObjectPageSectionMock {
    getSubSections = jest.fn().mockReturnValueOnce(['subsection']);
}

export default ObjectPageSectionMock as unknown as ObjectPageSection & typeof ObjectPageSection;
