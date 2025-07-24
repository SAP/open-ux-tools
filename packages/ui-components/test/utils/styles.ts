export const getStylesByElement = (element?: Element): CSSStyleDeclaration => {
    return element ? window.getComputedStyle(element) : ({} as CSSStyleDeclaration);
};

const toKebabCase = (prop: string): string => {
    return prop.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
};

export const findStyleFromStyleSheets = (styleProperty: string, element?: Element, selector?: string) => {
    styleProperty = toKebabCase(styleProperty);
    const classNames = element ? Array.from(element.classList) : [];
    for (let className of classNames) {
        if (selector) {
            className += selector;
        }
        for (let i = 0; i < document.styleSheets.length; i++) {
            const sheet = document.styleSheets[i];
            for (let j = 0; j < sheet.cssRules.length; j++) {
                const rule = sheet.cssRules[j];
                if (rule instanceof CSSStyleRule && rule.selectorText?.includes(className)) {
                    return rule.style[styleProperty];
                }
            }
        }
    }
};

export const compareStyles = (
    styles: CSSStyleDeclaration,
    expectedStyles: Partial<CSSStyleDeclaration>,
    element?: Element
): void => {
    for (const name in expectedStyles) {
        if (typeof expectedStyles[name] === 'string' && expectedStyles[name].startsWith('var(')) {
            expect(findStyleFromStyleSheets(name, element)).toEqual(expectedStyles[name]);
        } else {
            expect(styles[name]).toEqual(expectedStyles[name]);
        }
    }
};

export const compareStylesByElement = (
    element: Element | undefined,
    expectedStyles: Partial<CSSStyleDeclaration>
): void => {
    const styles = getStylesByElement(element);
    compareStyles(styles, expectedStyles, element);
};

export const compareStylesBySelector = (selector: string, expectedStyles: Partial<CSSStyleDeclaration>): void => {
    const element = document.body.querySelector(selector);
    expect(element).toBeInTheDocument();
    const styles = getStylesByElement(element);
    compareStyles(styles, expectedStyles, element);
};
