import FlexChange from 'sap/ui/fl/Change';

export default {
    createFromFileContent: jest.fn().mockImplementation((oFileContent: {selector: object, changeType: string, layer: string}): FlexChange => {
        return {
            getSelector: jest.fn().mockReturnValue(oFileContent.selector),
            getChangeType: jest.fn().mockReturnValue(oFileContent.changeType),
            getLayer: jest.fn().mockReturnValue(oFileContent.layer),
            getDefinition: jest.fn()
        }
    })
}