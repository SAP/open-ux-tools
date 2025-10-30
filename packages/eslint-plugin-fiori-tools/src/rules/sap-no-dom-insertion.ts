/**
 * @file Detect direct DOM insertion
 * @ESLint Version 0.22.1 / June 2015
 */

import type { Rule } from 'eslint';

// ------------------------------------------------------------------------------
// Rule Disablement
// ------------------------------------------------------------------------------

// ------------------------------------------------------------------------------
// Invoking global form of strict mode syntax for whole script
// ------------------------------------------------------------------------------
// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------
const rule: Rule.RuleModule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Fiori custom ESLint rule',
            category: 'Best Practices',
            recommended: false
        },
        messages: {
            domInsertion: 'Direct DOM insertion is forbidden!'
        },
        schema: []
    },
    create(context: Rule.RuleContext) {
        const FORBIDDEN_DOM_INSERTION = ['insertBefore', 'appendChild', 'replaceChild'],
            FORBIDDEN_DOM_JQUERY_INSERTION = [
                'after',
                'before',
                'insertAfter',
                'insertBefore',
                'append',
                'prepend',
                'appendTo',
                'prependTo'
            ];
        const FULL_BLACKLIST: string[] = ([] as string[]).concat(
            FORBIDDEN_DOM_INSERTION,
            FORBIDDEN_DOM_JQUERY_INSERTION
        );

        //    const FORBIDDEN_DOCUMENT_OBJECT = [], FORBIDDEN_JQUERY_OBJECT = [];

        // --------------------------------------------------------------------------
        // Helpers
        // --------------------------------------------------------------------------
        /**
         *
         * @param node
         * @param type
         */
        function isType(node: any, type: any) {
            return node && node.type === type;
        }
        /**
         *
         * @param node
         */
        function isIdentifier(node: any) {
            return isType(node, 'Identifier');
        }
        /**
         *
         * @param node
         */
        function isMember(node: any) {
            return isType(node, 'MemberExpression');
        }
        //    function isCall(node: any) {
        //        return isType(node, "CallExpression");
        //    }
        //    function isCondition(node: any) {
        //        return isType(node, "IfStatement") || isType(node, "ConditionalExpression");
        //    }
        //    function isUnary(node: any) {
        //        return isType(node, "UnaryExpression");
        //    }
        //    function isLiteral(node: any) {
        //        return isType(node, "Literal");
        //    }

        //    function contains(a, obj) {
        //        for (let i = 0; i < a.length; i++) {
        //            if (obj === a[i]) {
        //                return true;
        //            }
        //        }
        //        return false;
        //    }

        //    function isDomAccess(methodName) {
        //        return contains(FORBIDDEN_DOM_ACCESS, methodName);
        //    }

        //    function isDocument(node: any, justDocument: any) {
        //        if (isIdentifier(node)) {
        //            return node.name === "document"
        //                    || (!justDocument && contains(FORBIDDEN_DOCUMENT_OBJECT,
        //                            node.name));
        //        } else if (isMember(node)) {
        //            return isWindow(node.object) && isIdentifier(node.property)
        //                    && isDocument(node.property, true);
        //        }
        //        return false;
        //    }

        /*
            function processVariableDeclarator(node: any) {
                if (node.init) {
                    if (isMember(node.init)) {
                        const firstElement = node.init.object.name, secondElement = node.init.property.name;
    
                        if (firstElement + "." + secondElement === "window.document") {
                            FORBIDDEN_DOCUMENT_OBJECT.push(node.id.name);
                        } else if (firstElement + "." + secondElement === "window.history") {
                            FORBIDDEN_HISTORY_OBJECT.push(node.id.name);
                        } else if (firstElement + "." + secondElement === "window.location") {
                            FORBIDDEN_LOCATION_OBJECT.push(node.id.name);
                        } else if (firstElement + "." + secondElement === "window.screen") {
                            FORBIDDEN_SCREEN_OBJECT.push(node.id.name);
                        } else if ((secondElement === "body")
                                && (node.init.object.property)) {
                            firstElement = node.init.object.property.name;
                            if (firstElement + "." + secondElement === "document.body") {
                                context.report({ node: node, messageId: 'domInsertion' });
                                FORBIDDEN_BODY_OBJECT.push(node.id.name);
                            }
                        }
                    } else if (isIdentifier(node.init)
                            && (node.init.name === "document")) {
                        FORBIDDEN_DOCUMENT_OBJECT.push(node.id.name);
                    } else if (isIdentifier(node.init) && (node.init.name === "screen")) {
                        FORBIDDEN_SCREEN_OBJECT.push(node.id.name);
                    } else if (isIdentifier(node.init)
                            && (node.init.name === "location")) {
                        FORBIDDEN_LOCATION_OBJECT.push(node.id.name);
                    } else if (isIdentifier(node.init)
                            && (node.init.name === "history")) {
                        FORBIDDEN_HISTORY_OBJECT.push(node.id.name);
                    }
                }
            }
        function isForbiddenObviousApi(calleePath) {
            const elementArray = calleePath.split(".");
            const lastElement = elementArray[elementArray.length - 1];
            return lastElement;
        }
            function checkAssignmentAgainstOverride(node: any) {
                const identifier = node.left;
                if (isLocation(identifier)) { // location
                    context.report({ node: node, messageId: 'domInsertion' });
                } else if (isMember(identifier)) {
                    
        if (isIdentifier(identifier.property)
                            && identifier.property.name === "href") {
                        if (isLocation(identifier.object)) { // location.href
                            context.report({ node: node, messageId: 'domInsertion' });
                        } else if (isMember(identifier.object)
                                && isWindow(identifier.object.object)
                                && isLocation(identifier.object.property, true)) { // window.location.href
                            context.report({ node: node, messageId: 'domInsertion' });
                        }
                    } else if (isWindow(identifier.object)
                            && isLocation(identifier.property, true)) { // window.location
                        context.report({ node: node, messageId: 'domInsertion' });
                    }
                }
            }
        */

        /**
         *
         * @param node
         */
        function processDomInsertion(node: any) {
            const callee = node.callee;
            if (isMember(callee)) {
                // process window.history.back() | history.forward() | const h = history; h.go()
                if (/*isHistory(callee.object) && */ isIdentifier(callee.property) && 'name' in callee.property) {
                    if (FULL_BLACKLIST.indexOf(callee.property.name) > -1) {
                        context.report({ node: node, messageId: 'domInsertion' });
                        //                    console.log("found one.. " + sourceCode.getText(node));
                    }
                }
                // ELSE:
                // TODO: check if node.callee is identifier and identifier is a reference to history.back / .go / .forward
                // processing const go = history.go; go();
            }
        }

        // --------------------------------------------------------------------------
        // Public
        // --------------------------------------------------------------------------

        return {
            'CallExpression': function (node) {
                processDomInsertion(node);
            }
        };
    }
};

export default rule;
