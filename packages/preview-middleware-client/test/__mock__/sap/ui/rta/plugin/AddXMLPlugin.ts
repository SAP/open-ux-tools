const AddXMLPlugin = jest.fn().mockImplementation(() => {
    return {
        execute: jest.fn(),
        add: jest.fn()
    };
});

export default AddXMLPlugin;