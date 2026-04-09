// CJS proxy for @sap-ux/odata-annotation-core-types loaded via require() by @sap/ux-cds-compiler-facade
module.exports = {
    DiagnosticSeverity: {
        Error: 1,
        Warning: 2,
        Information: 3,
        Hint: 4
    },
    Range: {
        create: function() { return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }; }
    },
    Position: {
        create: function() { return { line: 0, character: 0 }; }
    },
    Location: {
        create: function() { return { uri: '', range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } }; }
    }
};
