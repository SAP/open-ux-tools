export default jest.fn().mockImplementation((arg1: object, arg2: object, arg3: object) => {
    return {
        ...arg1,
        ...arg2,
        ...arg3
    };
});
