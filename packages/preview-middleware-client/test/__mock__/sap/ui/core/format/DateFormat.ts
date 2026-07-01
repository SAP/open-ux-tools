const formatter = {
    format: jest.fn().mockReturnValue('formatted date')
};

export default {
    getDateTimeInstance: jest.fn().mockReturnValue(formatter),
    getDateInstance: jest.fn().mockReturnValue(formatter)
};
