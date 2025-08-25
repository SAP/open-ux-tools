import { readFile } from 'fs/promises';
import { FioriFeature } from './types';

/**
 * Analyze a CDS file content for matches with a specific feature
 */
function analyzeFileForFeature(content: string, feature: FioriFeature): string[] {
    const matches: string[] = [];
    const contentLower = content.toLowerCase();

    // Check for annotation matches
    for (const annotation of feature.implementation.annotations) {
        const annotationLower = annotation.toLowerCase();
        if (contentLower.includes(annotationLower)) {
            matches.push(`Annotation: ${annotation}`);
        }
    }

    // Check for search term matches
    // for (const term of feature.searchTerms) {
    //     const termLower = term.toLowerCase();
    //     if (contentLower.includes(termLower)) {
    //         matches.push(`Search term: ${term}`);
    //     }
    // }

    // Check for manifest settings in comments or similar
    if (feature.implementation.manifestSettings) {
        for (const setting of feature.implementation.manifestSettings) {
            const settingLower = setting.toLowerCase();
            if (contentLower.includes(settingLower)) {
                matches.push(`Manifest setting reference: ${setting}`);
            }
        }
    }

    return matches;
}

/**
 * Extract relevant code snippets that contain feature-related annotations
 */
function extractRelevantSnippets(content: string, feature: FioriFeature): string[] {
    const snippets: string[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const lineLower = line.toLowerCase();

        // Check if this line contains any of our target annotations
        const hasMatch = feature.implementation.annotations.some((annotation) =>
            lineLower.includes(annotation.toLowerCase())
        );
        // feature.searchTerms.some((term) => lineLower.includes(term.toLowerCase()));

        if (hasMatch) {
            // Extract a snippet around this line (5 lines before and after)
            const start = Math.max(0, i - 5);
            const end = Math.min(lines.length, i + 6);
            const snippet = lines.slice(start, end).join('\n');
            snippets.push(snippet);
        }
    }

    return snippets;
}

/**
 * Search for CDS files in the given path and analyze them for feature matches
 */
export async function searchCDSFiles(
    cdsFiles: string[],
    feature: FioriFeature,
    appPath: string,
    metadataInfo: { path: string; kind: string; properties: { name: string; type: string }[] }[]
): Promise<string> {
    // const fs = await import('fs/promises');
    // const path = await import('path');

    // try {
    //   // Check if the app path exists
    //   await fs.access(appPath);
    // } catch (error) {
    //   return `Error: Application path "${appPath}" does not exist or is not accessible.`;
    // }

    // // Find all CDS files in the directory and subdirectories
    // const cdsFiles = await this.findCDSFiles(appPath);

    if (cdsFiles.length === 0) {
        return `No CDS files found in "${appPath}".`;
    }
    const metadataMsg = `
**Available Metadata Targets:** Annotation is only applied on one of these targets \n\n${metadataInfo
        .map(
            (info) => `kind: ${info.kind} targetPath: ${info.path} 
**Available Properties:**\n\n${info.properties
                .map((prop) => `name: ${prop.name} type: ${prop.type}\n\n`)
                .join('- ')}`
        )
        .join('\n')}
`;

    let result = `## Feature Analysis: ${feature.name}\n\n`;
    result += `**Feature ID:** ${feature.id}\n\n`;
    result += `**Description:** ${feature.description}\n\n`;
    result += `**Search Path:** ${appPath}\n\n`;
    result += `**Found ${cdsFiles.length} CDS file(s)**\n\n`;

    // Analyze each CDS file for feature matches
    const matches: Array<{ file: string; matches: string[]; content?: string }> = [];

    for (const filePath of cdsFiles) {
        try {
            const content = await readFile(filePath, 'utf-8');
            const fileMatches = analyzeFileForFeature(content, feature);

            if (fileMatches.length > 0) {
                matches.push({
                    file: filePath,
                    matches: fileMatches,
                    content: content
                });
            }
        } catch (error) {
            result += `⚠️ Error reading file ${filePath}: ${error}\n\n`;
        }
    }
    let snippets = [];
    if (matches.length === 0) {
        result += `### No matches found\n\n`;
        result += `The feature "${feature.name}" was not found in any CDS files.\n\n`;
        result += `**Searched for:**\n`;
        result += `- Annotations: ${feature.implementation.annotations.join(', ')}\n`;
        // result += `- Search terms: ${feature.searchTerms.join(', ')}\n\n`;
        // result += `**Suggestion:** Use ### 💡 Implementation Suggestions as hint to model application. Usually annotation target is annotated like annotate service.RootEntities where service is namespace and  RootEntities is target.
        //   Check if existing file has only one target, use that target and apply annotation to that target.\n\n if there are multiple targets, ask user which targets annotation should be applied. Suggest list of targets to user.\n\n`;
        //   result += `**Suggestion:** You may need to implement this feature. Use the generate_annotation tool to get implementation code.`;
        result += `\n### 💡 Implementation Suggestions\n\n`;
        result += metadataMsg;
    } else {
        result += `### 🎯 Found ${matches.length} file(s) with matches:\n\n`;

        for (const match of matches) {
            result += `#### 📄 ${match.file}\n`;
            result += `**Matches found:**\n`;
            for (const matchText of match.matches) {
                result += `- ${matchText}\n`;
            }

            // Show relevant code snippets
            if (match.content) {
                snippets = extractRelevantSnippets(match.content, feature);
                if (snippets.length > 0) {
                    result += `\n\n**Code snippets:**\n`;
                    for (const snippet of snippets) {
                        result += `\`\`\`cds\n${snippet}\n\`\`\`\n`;
                    }
                }
            }
            result += `\n`;
        }
    }

    // Add implementation suggestions
    result += `\n### 💡 Implementation Suggestions\n\n`;
    result += metadataMsg;
    if (feature.implementation.cdsExample) {
        if (snippets.length > 1) {
            result += `Analysis **Code snippets:** Ask user which of **Available Metadata Targets:** annotation should be applied. Suggest list of targets **Available Metadata Targets:** to user.\n\n`;
        }
        result += `\n\n**Expected annotation pattern:**\n\n`;
        result += `\`\`\`cds\n${feature.implementation.cdsExample}\n\`\`\`\n\n`;
    }

    if (feature.implementation.notes && feature.implementation.notes.length > 0) {
        result += `**Implementation notes:**\n`;
        for (const note of feature.implementation.notes) {
            result += `- ${note}\n`;
        }
    }

    return result;
}
