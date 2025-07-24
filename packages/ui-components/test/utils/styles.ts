export const getStylesByElement = (element?: Element): CSSStyleDeclaration => {
    return element ? window.getComputedStyle(element) : ({} as CSSStyleDeclaration);
};

export const getStylesBySelector = (selector: string): CSSStyleDeclaration => {
    const element = document.body.querySelector(selector);
    return getStylesByElement(element);
};

export const compareStyles = (styles: CSSStyleDeclaration, expectedStyles: Partial<CSSStyleDeclaration>): void => {
    for (const name in expectedStyles) {
        expect(styles[name]).toEqual(expectedStyles[name]);
    }
};

export const compareStylesByElement = (
    element: Element | undefined,
    expectedStyles: Partial<CSSStyleDeclaration>
): void => {
    const styles = getStylesByElement(element);
    compareStyles(styles, expectedStyles);
};

export const compareStylesBySelector = (selector: string, expectedStyles: Partial<CSSStyleDeclaration>): void => {
    const styles = getStylesBySelector(selector);
    compareStyles(styles, expectedStyles);
};
