import { RuleVisitor } from '@eslint/core';
import {
    Edm,
    elementsWithName,
    Element,
    getElementAttributeValue,
    elements,
    toFullyQualifiedName,
    parseIdentifier
} from '@sap-ux/odata-annotation-core';
import { MemberNode } from '@humanwhocodes/momoa';

import { createMixedRule } from '../language/rule-factory';
import type { FioriRuleDefinition } from '../types';
import {
    REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
    RequireWidthIncludingColumnHeaderDiagnostic
} from '../language/diagnostics';

export type RequireWidthIncludingColumnHeaderOptions = {
    form: string;
};

/**
 * Validates that a manifest path exists down to the specified minimum depth.
 * Returns the deepest existing path and the missing segments.
 * @param manifest - The manifest object to validate against
 * @param fullPath - The complete path to validate
 * @param minRequiredDepth - Minimum number of segments that must exist (e.g., 6 for path ending at 'settings')
 * @returns Object with validatedPath (deepest existing) and missingSegments, or null if minimum depth not met
 */
function findDeepestExistingPath(
    manifest: any,
    fullPath: string[],
    minRequiredDepth: number
): { validatedPath: string[]; missingSegments: string[] } | null {
    let current: any = manifest;
    let depth = 0;

    // Walk the path to find the deepest existing level
    for (let i = 0; i < fullPath.length; i++) {
        const segment = fullPath[i];
        if (!current || typeof current !== 'object' || !(segment in current)) {
            // Path doesn't exist at this level
            if (i < minRequiredDepth) {
                // Required depth not met, skip this table
                return null;
            }
            // Return the deepest existing path and the missing segments
            return {
                validatedPath: fullPath.slice(0, i),
                missingSegments: fullPath.slice(i)
            };
        }
        current = current[segment];
        depth = i + 1;
    }

    // Full path exists
    return {
        validatedPath: fullPath,
        missingSegments: []
    };
}

const rule: FioriRuleDefinition = createMixedRule({
    ruleId: 'sap-require-width-including-column-header',
    meta: {
        type: 'suggestion',
        docs: {
            recommended: true,
            description:
                'By default, the column width is calculated based on the type of the content. You can include the column header in the width calculation by setting this property to true',
            url: 'https://ui5.sap.com/#/topic/c0f6592a592e47f9bb6d09900de47412'
        },
        messages: {
            ['require-width-including-column-header']:
                'Small tables (< 6 columns) should use widthIncludingColumnHeader: true for better column width calculation.'
        },
        fixable: 'code'
    },
    check(context) {
        const problems: RequireWidthIncludingColumnHeaderDiagnostic[] = [];
console.log("DEBUG; Checking apps", context.sourceCode.projectContext.linkedModel.apps);
        for (const [appKey, app] of Object.entries(context.sourceCode.projectContext.linkedModel.apps)) {
            if (app.type !== 'fe-v4') {
                continue;
            }
            for (const page of app.pages) {
                const parsedApp = context.sourceCode.projectContext.index.apps[appKey];
                const parsedService = context.sourceCode.projectContext.getIndexedServiceForMainService(parsedApp);
                if (!parsedService) {
                    continue;
                }

                // Get the manifest to validate paths
                const manifest = parsedApp.manifestObject;
                if (!manifest) {
                    continue;
                }

                for (const table of page.tables) {
                    const aliasInfo = parsedService.artifacts.aliasInfo[table.annotation.top.uri];

                    const [collection] = elementsWithName(Edm.Collection, table.annotation.top.value);
                    if (!collection) {
                        continue;
                    }

                    const records = elements((element) => {
                        if (element.name !== Edm.Record) {
                            return false;
                        }
                        const recordType = getElementAttributeValue(element, Edm.Type);

                        if (recordType.includes('/')) {
                            // do not support paths as types
                            return false;
                        }

                        if (recordType) {
                            const fullyQualifiedName = toFullyQualifiedName(
                                aliasInfo.aliasMap,
                                '', // it should be qualified identifier
                                parseIdentifier(recordType)
                            );
                            return fullyQualifiedName === 'com.sap.vocabularies.UI.v1.DataField';
                        }
                        return false;
                    }, collection);

                    if (records.length < 6 && records.length > 0 && table.widthIncludingColumnHeader !== true) {
                        const fullPath = [
                            'sap.ui5',
                            'routing',
                            'targets',
                            page.targetName,
                            'options',
                            'settings',
                            'controlConfiguration',
                            table.controlConfigurationKey,
                            'tableSettings'
                        ];
                        
                        // Validate path exists down to 'settings' (index 5, so depth 6)
                        const pathInfo = findDeepestExistingPath(manifest, fullPath, 6);
                        
                        if (!pathInfo) {
                            // Required path down to 'settings' doesn't exist, skip this table
                            console.log('DEBUG; Skipping table - path does not exist down to settings:', fullPath.join('/'));
                            continue;
                        }
                        
                        console.log('DEBUG; Reporting problem for table at path', pathInfo.validatedPath.join('/'), 
                                    'missing segments:', pathInfo.missingSegments.join('/'));
                        problems.push({
                            type: REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
                            manifestPropertyPath: pathInfo.validatedPath,
                            missingPathSegments: pathInfo.missingSegments,
                            propertyName: 'widthIncludingColumnHeader',
                            annotation: {
                                file: table.annotation.source,
                                annotationPath: table.annotationPath,
                                reference: table.annotation.top
                            }
                        });
                    }
                }
            }
        }

        return problems;
    },
    createJson(context, diagnostics) {
        if (diagnostics.length === 0) {
            return {};
        }
        const matchers: RuleVisitor = {};
        
        // Group diagnostics by their manifestPropertyPath to handle multiple tables at same depth
        const diagnosticsByPath = new Map<string, RequireWidthIncludingColumnHeaderDiagnostic[]>();
        for (const diagnostic of diagnostics) {
            const pathKey = diagnostic.manifestPropertyPath.join('/');
            if (!diagnosticsByPath.has(pathKey)) {
                diagnosticsByPath.set(pathKey, []);
            }
            diagnosticsByPath.get(pathKey)!.push(diagnostic);
        }
        
        for (const [pathKey, pathDiagnostics] of diagnosticsByPath) {
            const diagnostic = pathDiagnostics[0]; // Use first diagnostic for path info
            const missingSegments = diagnostic.missingPathSegments || [];
            
            function createReportFunction(missing: string[]) {
                return function report(node: MemberNode) {
                    // The selector matches a Member node, we need its value (the Object)
                    const parentObject = node.value;

                    if (parentObject.type !== 'Object') {
                        return;
                    }

                    // Check if the property already has the correct value
                    if (missing.length === 0) {
                        // We're at tableSettings level, check if widthIncludingColumnHeader exists with correct value
                        const property = parentObject.members.find(
                            (member: MemberNode) =>
                                member.name.type === 'String' && member.name.value === 'widthIncludingColumnHeader'
                        );
                        if (property?.value?.type === 'Boolean' && property.value.value === true) {
                            // Already has the correct value, skip
                            return;
                        }
                    } else {
                        // We're missing some segments - need to drill down to check
                        let currentObj: any = parentObject;
                        let segmentIndex = 0;
                        
                        // Navigate through missing segments
                        while (segmentIndex < missing.length && currentObj && currentObj.type === 'Object') {
                            const segment = missing[segmentIndex];
                            const foundMember = currentObj.members.find(
                                (member: MemberNode) =>
                                    member.name.type === 'String' && member.name.value === segment
                            );
                            
                            if (!foundMember) {
                                // Segment doesn't exist, we need to create it
                                break;
                            }
                            
                            if (segmentIndex === missing.length - 1) {
                                // This is the last missing segment - check if it has widthIncludingColumnHeader: true
                                if (foundMember.value.type === 'Object') {
                                    const widthProp = foundMember.value.members.find(
                                        (member: MemberNode) =>
                                            member.name.type === 'String' && member.name.value === 'widthIncludingColumnHeader'
                                    );
                                    if (widthProp?.value?.type === 'Boolean' && widthProp.value.value === true) {
                                        // Already has the correct value, skip
                                        return;
                                    }
                                }
                            }
                            
                            currentObj = foundMember.value;
                            segmentIndex++;
                        }
                    }

                    context.report({
                        node: parentObject,
                        messageId: 'require-width-including-column-header',
                        fix(fixer) {
                            // Check if required properties exist
                            if (!parentObject.loc || !parentObject.range) {
                                return null;
                            }

                            // Calculate indentation
                            let propertyIndent = '';
                            let baseIndent = '';

                            if (parentObject.members.length > 0 && parentObject.members[0].loc) {
                                propertyIndent = ' '.repeat(parentObject.members[0].loc.start.column);
                                baseIndent = ' '.repeat(Math.max(0, parentObject.members[0].loc.start.column - 2));
                            } else {
                                baseIndent = ' '.repeat(parentObject.loc.start.column);
                                propertyIndent = baseIndent + '  ';
                            }

                            // Build the nested structure for missing segments
                            let newPropertyValue: string;
                            if (missing.length === 0) {
                                // Just add widthIncludingColumnHeader
                                newPropertyValue = 'true';
                            } else {
                                // Build nested structure
                                newPropertyValue = buildNestedStructure(missing, propertyIndent);
                            }

                            if (parentObject.members.length === 0) {
                                // Empty object - add the full structure
                                if (missing.length === 0) {
                                    return fixer.replaceTextRange(
                                        parentObject.range,
                                        `{\n${propertyIndent}"widthIncludingColumnHeader": true\n${baseIndent}}`
                                    );
                                } else {
                                    return fixer.replaceTextRange(
                                        parentObject.range,
                                        `{\n${propertyIndent}"${missing[0]}": ${newPropertyValue}\n${baseIndent}}`
                                    );
                                }
                            }

                            // Build new object with existing properties + new structure
                            const properties: string[] = [];
                            let propertyAdded = false;
                            
                            for (const member of parentObject.members) {
                                if (!member.range) {
                                    continue;
                                }
                                const memberStart = member.range[0];
                                const memberEnd = member.range[1];
                                const memberText = context.sourceCode.text.substring(memberStart, memberEnd);
                                
                                // Check if this is the property we need to update/merge
                                if (missing.length > 0 && member.name.type === 'String' && member.name.value === missing[0]) {
                                    // Merge with existing property
                                    if (member.value.type === 'Object') {
                                        // Need to merge into existing object
                                        const existingObj = member.value;
                                        const mergedContent = mergeIntoObject(existingObj, missing.slice(1), propertyIndent, context);
                                        properties.push(`${propertyIndent}"${missing[0]}": ${mergedContent}`);
                                    } else {
                                        // Replace with nested structure
                                        properties.push(`${propertyIndent}"${missing[0]}": ${newPropertyValue}`);
                                    }
                                    propertyAdded = true;
                                } else if (missing.length === 0 && member.name.type === 'String' && member.name.value === 'widthIncludingColumnHeader') {
                                    // Update existing widthIncludingColumnHeader
                                    properties.push(`${propertyIndent}"widthIncludingColumnHeader": true`);
                                    propertyAdded = true;
                                } else {
                                    // Preserve existing property
                                    properties.push(`${propertyIndent}${memberText.trim()}`);
                                }
                            }
                            
                            if (!propertyAdded) {
                                // Add new property
                                if (missing.length === 0) {
                                    properties.push(`${propertyIndent}"widthIncludingColumnHeader": true`);
                                } else {
                                    properties.push(`${propertyIndent}"${missing[0]}": ${newPropertyValue}`);
                                }
                            }

                            const newContent = `{\n${properties.join(',\n')}\n${baseIndent}}`;
                            return fixer.replaceTextRange(parentObject.range, newContent);
                        }
                    });
                };
            }
            
            matchers[context.sourceCode.createMatcherString(diagnostic.manifestPropertyPath)] = createReportFunction(missingSegments);
        }
        return matchers;
    },
    createAnnotations(context, validationResult) {
        if (validationResult.length === 0) {
            return {};
        }

        const lookup = new Set<Element>();
        console.log(validationResult);
        for (const diagnostic of validationResult) {
            lookup.add(diagnostic.annotation?.reference?.value);
        }
        return {
            ['target>element[name="Annotation"]'](node: Element) {
                if (!lookup.has(node)) {
                    return;
                }

                context.report({
                    node: node,
                    messageId: 'require-width-including-column-header'
                });
            }
        };
    }
});

/**
 * Build nested JSON structure for missing path segments
 */
function buildNestedStructure(segments: string[], indent: string): string {
    if (segments.length === 0) {
        return 'true';
    }
    
    if (segments.length === 1 && segments[0] === 'widthIncludingColumnHeader') {
        return 'true';
    }
    
    const [first, ...rest] = segments;
    const nextIndent = indent + '  ';
    
    if (rest.length === 0) {
        // Last segment - add widthIncludingColumnHeader
        return `{\n${nextIndent}"widthIncludingColumnHeader": true\n${indent}}`;
    }
    
    if (rest[0] === 'widthIncludingColumnHeader') {
        return `{\n${nextIndent}"widthIncludingColumnHeader": true\n${indent}}`;
    }
    
    const nestedValue = buildNestedStructure(rest, nextIndent);
    return `{\n${nextIndent}"${rest[0]}": ${nestedValue}\n${indent}}`;
}

/**
 * Merge new structure into an existing object node
 */
function mergeIntoObject(existingObj: any, remainingSegments: string[], indent: string, context: any): string {
    if (!existingObj.range) {
        return buildNestedStructure(remainingSegments, indent);
    }
    
    const objStart = existingObj.range[0];
    const objEnd = existingObj.range[1];
    const existingText = context.sourceCode.text.substring(objStart, objEnd);
    
    // Parse the existing object and add the new property
    const properties: string[] = [];
    const nextIndent = indent + '  ';
    let propertyAdded = false;
    
    for (const member of existingObj.members) {
        if (!member.range) continue;
        
        const memberStart = member.range[0];
        const memberEnd = member.range[1];
        const memberText = context.sourceCode.text.substring(memberStart, memberEnd);
        
        if (remainingSegments.length > 0 && member.name.type === 'String' && member.name.value === remainingSegments[0]) {
            // Merge deeper
            if (member.value.type === 'Object' && remainingSegments.length > 1) {
                const merged = mergeIntoObject(member.value, remainingSegments.slice(1), nextIndent, context);
                properties.push(`${nextIndent}"${remainingSegments[0]}": ${merged}`);
            } else {
                const nestedValue = buildNestedStructure(remainingSegments.slice(1), nextIndent);
                properties.push(`${nextIndent}"${remainingSegments[0]}": ${nestedValue}`);
            }
            propertyAdded = true;
        } else if (remainingSegments.length === 0 && member.name.type === 'String' && member.name.value === 'widthIncludingColumnHeader') {
            properties.push(`${nextIndent}"widthIncludingColumnHeader": true`);
            propertyAdded = true;
        } else {
            properties.push(`${nextIndent}${memberText.trim()}`);
        }
    }
    
    if (!propertyAdded) {
        if (remainingSegments.length === 0) {
            properties.push(`${nextIndent}"widthIncludingColumnHeader": true`);
        } else if (remainingSegments.length === 1 && remainingSegments[0] === 'widthIncludingColumnHeader') {
            properties.push(`${nextIndent}"widthIncludingColumnHeader": true`);
        } else {
            const nestedValue = buildNestedStructure(remainingSegments.slice(1), nextIndent);
            properties.push(`${nextIndent}"${remainingSegments[0]}": ${nestedValue}`);
        }
    }
    
    return `{\n${properties.join(',\n')}\n${indent}}`;
}

export default rule;
