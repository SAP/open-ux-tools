/**
 * @fileoverview flag global variable declaration
 * @author Achref Kilani Jrad
 */

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------
module.exports = function (context) {
    'use strict';

    var ALLOWED_VARIABLES = ['undefined', 'NaN', 'arguments', 'PDFJS', 'console', 'Infinity'];

    //--------------------------------------------------------------------------
    // Helpers
    //--------------------------------------------------------------------------

    function contains(a, obj) {
        for (var i = 0; i < a.length; i++) {
            if (obj === a[i]) {
                return true;
            }
        }
        return false;
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------
    function isImplicitGlobal(variable) {
        return variable.defs.every(function (def) {
            return def.type === 'ImplicitGlobalVariable';
        });
    }

    /**
     * Gets the declared variable, defined in `scope`, that `ref` refers to.
     * @param {Scope} scope The scope in which to search.
     * @param {Reference} ref The reference to find in the scope.
     * @returns {Variable} The variable, or null if ref refers to an undeclared variable.
     */
    function getDeclaredGlobalVariable(scope, ref) {
        var declaredGlobal = null;
        scope.variables.some(function (variable) {
            if (variable.name === ref.identifier.name) {
                if (!isImplicitGlobal(variable)) {
                    declaredGlobal = variable;
                    return true;
                }
            }
            return false;
        });
        return declaredGlobal;
    }

    return {
        'Program': function (/*node*/) {
            var globalScope = context.getScope();

            globalScope.through.forEach(function (ref) {
                var variable = getDeclaredGlobalVariable(globalScope, ref),
                    name = ref.identifier.name;
                if (variable && ref.from.type !== 'function' && !contains(ALLOWED_VARIABLES, name)) {
                    context.report(ref.identifier, "Global variable '{{name}}' is not allowed", { name: name });
                }
            });
        }
    };
};
