export type Value = string | Record<string, string>;

const colors = {
    sapShell_Category_1_Background: '#fff',
    sapContent_Illustrative_Color14: '#fff',
    sapContent_Illustrative_Color19: '#fff',
    sapContent_Illustrative_Color2: '#fff',
    sapContent_Illustrative_Color13: '#fff',
    sapContent_Illustrative_Color7: '#fff',
    sapContent_Illustrative_Color22: '#fff'
};

export default {
    get: jest.fn(({ callback }: { callback?: (value: Value) => void }) => {
        callback?.(colors);
        return colors;
    })
};
