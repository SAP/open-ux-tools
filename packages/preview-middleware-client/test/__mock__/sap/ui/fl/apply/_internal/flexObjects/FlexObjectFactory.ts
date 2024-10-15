import FlexChange from 'sap/ui/fl/Change';
interface ChangeContent {
    property: string;
    newValue: string;
    newBinding: string;
}

export default {
    createFromFileContent: jest.fn().mockImplementation((oFileContent: {selector: object, changeType: string, layer: string}): FlexChange<ChangeContent> => {
        return {
            getSelector: jest.fn().mockReturnValue(oFileContent.selector),
            getChangeType: jest.fn().mockReturnValue(oFileContent.changeType),
            getLayer: jest.fn().mockReturnValue(oFileContent.layer),
            getDefinition: jest.fn(),
            getContent: jest.fn(),
            setContent: jest.fn()
        }
    })
}