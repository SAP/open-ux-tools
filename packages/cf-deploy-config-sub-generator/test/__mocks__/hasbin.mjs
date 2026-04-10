export function sync() {
    return true;
}

export default {
    sync,
    async: function() {},
    all: { sync: function() { return true; } },
    some: { sync: function() { return true; } },
    first: { sync: function() {} },
    every: { sync: function() { return true; } },
    any: { sync: function() { return true; } }
};
