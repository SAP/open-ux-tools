/**
 * @fileoverview Rule to ensure the usage ot the correct method options for
 *               sap.m.MessageToast.show
 * @author Christopher Fenner - C5224075
 * @ESLint Version 0.17.1 / April 2015
 */

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
module.exports = function (context) {
    'use strict';

    var X_MEMBER = 'MemberExpression';
    // var X_CALL = "CallExpression";
    var X_IDENTIFIER = 'Identifier';
    // var X_LITERAL = "Literal";
    // var P_OBJECT = "ObjectPattern";
    // var P_ARRAY = "ArrayPattern";

    var VARIABLES = {};
    var INTRESTING_PATH = {
        'sap': {
            'm': {
                'MessageToast': {
                    'show': {}
                }
            }
        }
    };

    var CALLEE_NAME = 'sap.m.MessageToast.show';

    var DURATION_MIN = 3000;
    var WIDTH_MAX = 35;
    var POSITION_DEFAULT = 'center bottom';

    function isInteger(i) {
        return Number(i) === i && i % 1 === 0;
    }

    function endsWith(s, sub) {
        return typeof s === 'string' && typeof sub === 'string' && s.substring(s.length - sub.length, s.length) === sub;
    }

    function getEMValue(value) {
        if (endsWith(value, 'em')) {
            return Number(value.replace('em', ''));
        }
        return 0;
    }

    function getLiteralOrIdentifiertName(node) {
        var result = '';
        if (node.type === X_IDENTIFIER) {
            result = node.name;
        } else {
            result = node.value;
        }
        return result;
    }

    function getIdentifierPath(node) {
        var result = '';
        if (node) {
            switch (node.type) {
                case X_IDENTIFIER:
                    result = node.name;
                    break;
                case X_MEMBER:
                    result = getIdentifierPath(node.object) + '.' + getLiteralOrIdentifiertName(node.property);
                    break;
                default:
            }
        }
        return result;
    }

    // Method resolved IdentifierNames with known variables
    function resolveIdentifierPath(path) {
        var parts = path.split('.');
        var substitution = false;
        // check if current identifier is remembered as an intresting variable
        for (var name in VARIABLES) {
            if (name === parts[0]) {
                // get last stored variable value
                substitution = VARIABLES[name].slice(-1).pop();
            }
        }
        // if so, replace current identifier with its value
        if (substitution) {
            parts[0] = substitution;
            path = parts.join('.');
        }
        return path;
    }

    function isIntrestingPath(path) {
        var parts = path.split('.');
        var isIntresting = false;
        var intrestingPath = INTRESTING_PATH;
        for (var key in parts) {
            if (intrestingPath.hasOwnProperty(parts[key])) {
                isIntresting = true;
                intrestingPath = intrestingPath[parts[key]];
            } else {
                isIntresting = false;
                break;
            }
        }
        return isIntresting;
    }

    function rememberIntrestingVariable(node, name) {
        //        if (node.id.type === X_IDENTIFIER) {
        if (typeof VARIABLES[node.id.name] === 'undefined') {
            VARIABLES[node.id.name] = [];
        }
        VARIABLES[node.id.name].push(name);
        //        }
    }

    function processVariableDeclarator(node) {
        //        if (node.init) {
        var path = getIdentifierPath(node.init);
        path = resolveIdentifierPath(path);
        // if declaration is intresting, remember identifier and resolved value
        if (isIntrestingPath(path)) {
            rememberIntrestingVariable(node, path);
        }
        //        }
    }

    function validateFunctionOptions(node) {
        if (node.arguments.length === 2) {
            var optionList = node.arguments[1].properties;
            for (var key in optionList) {
                if (optionList.hasOwnProperty(key) && optionList[key].type === 'Property') {
                    var property = optionList[key];
                    var name = property.key.name;
                    var value = property.value.value;
                    switch (name) {
                        case 'duration':
                            if (isInteger(value) && value < DURATION_MIN) {
                                context.report(
                                    node,
                                    'Value for ' +
                                        name +
                                        ' of ' +
                                        CALLEE_NAME +
                                        ' should be greater or equal to ' +
                                        DURATION_MIN +
                                        '!'
                                );
                            }
                            break;
                        case 'width':
                            if (getEMValue(value) > WIDTH_MAX) {
                                context.report(
                                    node,
                                    'Value for ' +
                                        name +
                                        ' of ' +
                                        CALLEE_NAME +
                                        ' should be less or equal to ' +
                                        WIDTH_MAX +
                                        'em' +
                                        '!'
                                );
                            }
                            break;
                        case 'my':
                        case 'at':
                            if (typeof value === 'string' && value !== POSITION_DEFAULT) {
                                context.report(
                                    node,
                                    'Value for ' + name + ' of ' + CALLEE_NAME + ' should be ' + POSITION_DEFAULT + '!'
                                );
                            }
                            break;
                        default:
                    }
                }
            }
        }
    }

    function processCallExpression(node) {
        //        if (node && node.type === X_CALL) {
        var path = getIdentifierPath(node.callee);
        path = resolveIdentifierPath(path);

        if (isIntrestingPath(path)) {
            validateFunctionOptions(node);
        }
        //        }
    }

    return {
        'VariableDeclarator': processVariableDeclarator,
        'CallExpression': processCallExpression
    };
};
