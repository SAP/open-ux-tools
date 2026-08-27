export default jest.fn().mockImplementation((arg1, arg2, arg3) => {
    return {
        ...arg1,
        ...arg2,
        ...arg3
    };
});
