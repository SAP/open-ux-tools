export const isQuickNavigationEnabled = (event: KeyboardEvent): boolean => {
    if ((event.ctrlKey || event.metaKey) && event.altKey) {
        return true;
    }
    return false;
};

export function resolveKeyCode(keyCode: string): string | undefined {
    return keyCode.replace('Digit', '').replace('Key', '').toUpperCase();
}
