// false positive
// eslint-disable-next-line no-spaced-func
export const on = jest.fn<void, [string, (event: string, path: string) => void]>();
export const watch = jest.fn().mockReturnValue({
    on
});
export default {
    watch
};
