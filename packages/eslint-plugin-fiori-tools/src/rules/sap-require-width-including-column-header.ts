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
 * Validates that a path exists and returns the deepest existing level.
 * @param startObject - The object to start validation from (e.g., settings object)
 * @param pathSegments - The path segments to validate
 * @returns Object with validatedPath (deepest existing) and missingSegments
 */
function findDeepestExistingPath(
    startObject: any,
    pathSegments: string[]
): { validatedPath: string[]; missingSegments: string[] } {
    let current: any = startObject;

    for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        if (!current || typeof current !== 'object' || !(segment in current)) {
            return {
                validatedPath: pathSegments.slice(0, i),
                missingSegments: pathSegments.slice(i)
            };
        }
        current = current[segment];
    }

    return {
        validatedPath: pathSegments,
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
                        // The linker already validated that settings exists, so we start validation from there
                        const settingsPath = (manifest?.['sap.ui5'] as any)?.routing?.targets?.[page.targetName]?.options?.settings;
                        
                        if (!settingsPath) {
                            // Settings doesn't exist in manifest (shouldn't happen if linker created the page)
                            console.log('DEBUG; Skipping table - settings does not exist for target:', page.targetName);
                            continue;
                        }
                        
                        // Only validate the optional parts: controlConfiguration -> [key] -> tableSettings
                        const optionalPath = [
                            'controlConfiguration',
                            table.controlConfigurationKey,
                            'tableSettings'
                        ];
                        
                        const pathInfo = findDeepestExistingPath(settingsPath, optionalPath);
                        
                        // Build the full manifest path for the matcher (needed for ESLint selector)
                        const fullManifestPath = [
                            'sap.ui5',
                            'routing',
                            'targets',
                            page.targetName,
                            'options',
                            'settings',
                            ...pathInfo.validatedPath
                        ];
                        
                        console.log('DEBUG; Reporting problem for table at path', fullManifestPath.join('/'), 
                                    'missing segments:', pathInfo.missingSegments.join('/'));
                        problems.push({
                            type: REQUIRE_WIDTH_INCLUDING_COLUMN_HEADER_RULE_TYPE,
                            manifestPropertyPath: fullManifestPath,
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
                    const parentObject = node.value;

                    if (parentObject.type !== 'Object') {
                        return;
                    }

                    // Check if fix is already applied
                    if (shouldSkipFix(parentObject, missing)) {
                        return;
                    }

                    context.report({
                        node: parentObject,
                        messageId: 'require-width-including-column-header',
                        fix(fixer) {
                            if (!parentObject.loc || !parentObject.range) {
                                return null;
                            }

                            const indentation = getIndentation(parentObject);
                            const newContent = generateFixedContent(parentObject, missing, indentation, context);
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
 * Check if the fix should be skipped (already has correct value)
 */
function shouldSkipFix(parentObject: any, missingSegments: string[]): boolean {
    if (missingSegments.length === 0) {
        // At tableSettings level, check if widthIncludingColumnHeader is already true
        const property = parentObject.members.find(
            (member: any) => member.name.type === 'String' && member.name.value === 'widthIncludingColumnHeader'
        );
        return property?.value?.type === 'Boolean' && property.value.value === true;
    }
    
    // Navigate through missing segments to check if fix is already applied
    let currentObj: any = parentObject;
    let segmentIndex = 0;
    
    while (segmentIndex < missingSegments.length && currentObj && currentObj.type === 'Object') {
        const segment = missingSegments[segmentIndex];
        const foundMember = currentObj.members.find(
            (member: any) => member.name.type === 'String' && member.name.value === segment
        );
        
        if (!foundMember) {
            return false; // Segment doesn't exist, fix needed
        }
        
        if (segmentIndex === missingSegments.length - 1) {
            // Last segment - check if it has widthIncludingColumnHeader: true
            if (foundMember.value.type === 'Object') {
                const widthProp = foundMember.value.members.find(
                    (member: any) => member.name.type === 'String' && member.name.value === 'widthIncludingColumnHeader'
                );
                return widthProp?.value?.type === 'Boolean' && widthProp.value.value === true;
            }
        }
        
        currentObj = foundMember.value;
        segmentIndex++;
    }
    
    return false;
}

/**
 * Calculate indentation for JSON formatting
 */
function getIndentation(parentObject: any): { baseIndent: string; propertyIndent: string } {
    let propertyIndent = '';
    let baseIndent = '';

    if (parentObject.members.length > 0 && parentObject.members[0].loc) {
        propertyIndent = ' '.repeat(parentObject.members[0].loc.start.column);
        baseIndent = ' '.repeat(Math.max(0, parentObject.members[0].loc.start.column - 2));
    } else {
        baseIndent = ' '.repeat(parentObject.loc.start.column);
        propertyIndent = baseIndent + '  ';
    }

    return { baseIndent, propertyIndent };
}

/**
 * Generate the fixed JSON content for the parent object
 */
function generateFixedContent(
    parentObject: any,
    missingSegments: string[],
    indentation: { baseIndent: string; propertyIndent: string },
    context: any
): string {
    const { baseIndent, propertyIndent } = indentation;
    const newPropertyValue = missingSegments.length === 0 
        ? 'true' 
        : buildNestedStructure(missingSegments, propertyIndent);

    if (parentObject.members.length === 0) {
        // Empty object - add the full structure
        if (missingSegments.length === 0) {
            return `{\n${propertyIndent}"widthIncludingColumnHeader": true\n${baseIndent}}`;
        }
        return `{\n${propertyIndent}"${missingSegments[0]}": ${newPropertyValue}\n${baseIndent}}`;
    }

    // Build new object with existing properties + new structure
    const properties: string[] = [];
    let propertyAdded = false;
    
    for (const member of parentObject.members) {
        if (!member.range) continue;
        
        const memberText = context.sourceCode.text.substring(member.range[0], member.range[1]);
        
        if (missingSegments.length > 0 && member.name.type === 'String' && member.name.value === missingSegments[0]) {
            // Merge with or replace existing property
            if (member.value.type === 'Object') {
                const mergedContent = mergeIntoObject(member.value, missingSegments.slice(1), propertyIndent, context);
                properties.push(`${propertyIndent}"${missingSegments[0]}": ${mergedContent}`);
            } else {
                properties.push(`${propertyIndent}"${missingSegments[0]}": ${newPropertyValue}`);
            }
            propertyAdded = true;
        } else if (missingSegments.length === 0 && member.name.type === 'String' && member.name.value === 'widthIncludingColumnHeader') {
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
        if (missingSegments.length === 0) {
            properties.push(`${propertyIndent}"widthIncludingColumnHeader": true`);
        } else {
            properties.push(`${propertyIndent}"${missingSegments[0]}": ${newPropertyValue}`);
        }
    }

    return `{\n${properties.join(',\n')}\n${baseIndent}}`;
}

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
