import type { Editor } from 'mem-fs-editor';
import type { Logger } from '@sap-ux/logger';
import { xml2js, js2xml, type Element, type ElementCompact } from 'xml-js';

/**
 * Checks if the specified name exists in the array of elements.
 *
 * @param {Element[]} data The array of elements to search.
 * @param {string} name The name to search for.
 * @returns {boolean} Returns true if the name exists in the array, otherwise false.
 */
function checkIfNameExists(data: Element[], name: string): boolean {
    return data?.some((obj) => obj.name === name);
}

/**
 * Adds a workspace element to the provided data if it doesn't already exist.
 *
 * @param {Element} data The data to which the workspace element should be added.
 * @returns {boolean} Returns true if the workspace element was successfully added, otherwise false.
 */
function addWorkspaceElement(data: Element): boolean {
    if (!data?.elements || checkIfNameExists(data.elements, 'workingDirectory')) {
        return false;
    }
    data.elements.push({ type: 'element', name: 'workingDirectory', elements: [{ type: 'text', text: '..' }] });
    return true;
}

/**
 * Reads the contents of the pom xml file and returns it as a string.
 *
 * @param {Editor} fs - The file system editor.
 * @param {string} pomPath - The path to the pom.xml file.
 * @returns {string} The contents of the pom.xml file as a string.
 */
function readPomXml(fs: Editor, pomPath: string): string {
    return fs.read(pomPath).toString();
}

/**
 * Writes the provided XML structure to the pom xml file.
 *
 * @param {Editor} fs - The file system editor.
 * @param {string} pomPath - The path to the pom.xml file.
 * @param {ElementCompact} pomContentsJson - The XML structure to be written to the pom.xml file.
 * @returns {void}
 */
function writePomXml(fs: Editor, pomPath: string, pomContentsJson: ElementCompact): void {
    const pomXML = js2xml(pomContentsJson, { compact: false, ignoreComment: false, spaces: 4 });
    const ampersandReplace = /&amp;gt/g; // Sanitize
    fs.write(pomPath, pomXML.replace(ampersandReplace, '&gt'));
}

/**
 * Updates the pom.xml file for Java-based CAP projects.
 *
 * @param {Editor} fs The file system editor instance.
 * @param {string} pomPath The path to the pom.xml file.
 * @param {Logger} [logger] The logger instance for logging errors.
 * @returns {void}
 */
export function updatePomXml(fs: Editor, pomPath: string, logger?: Logger): void {
    try {
        const pomContents = readPomXml(fs, pomPath);
        const pomContentsJson: Element | ElementCompact = xml2js(pomContents, { compact: false, ignoreComment: false });
        const springBootMavenPlugin = 'spring-boot-maven-plugin';
        if (Object.keys(pomContentsJson).length === 0) {
            return;
        }
        // find the spring-boot-maven-plugin in the pom.xml
        const pomPlugin = pomContentsJson.elements
            .filter((element: Element) => element.name === 'project')?.[0]
            .elements.filter((element: Element) => element.name === 'build')?.[0]
            .elements.filter((element: Element) => element.name === 'plugins')?.[0]
            .elements.filter((element: Element) => element.name === 'plugin')
            ?.filter((obj: Element) =>
                obj?.elements?.some(
                    (element: Element) =>
                        element.name === 'artifactId' &&
                        (element.elements ?? []).some((element: Element) => element.text === springBootMavenPlugin)
                )
            )?.[0]
            .elements?.filter((element: Element) => element.name === 'configuration')?.[0];

        if (pomPlugin) {
            addWorkspaceElement(pomPlugin);
            writePomXml(fs, pomPath, pomContentsJson);
        }
    } catch (error) {
        logger?.error(error);
    }
}
