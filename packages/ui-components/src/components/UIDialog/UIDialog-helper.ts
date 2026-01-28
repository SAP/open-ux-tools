/**
 * Adds or replaces a `scale(...)` transformation in a CSS transform string.
 *
 * @param transform The current CSS transform string (can be empty or contain other transforms like `translate(...)`).
 * @param scale The scale value to apply (e.g., `1.5` for 150% scale).
 * @returns The updated CSS transform string with the new `scale(...)` applied.
 */
export function addScaleToTransform(transform: string, scale: number): string {
    let updatedTransform = transform.trim();
    // Remove any existing scale() from the transform string
    const scaleRegex = /scale\([^)]+\)/;
    updatedTransform = updatedTransform.replace(scaleRegex, '').trim();
    // Append the new scale at the end
    if (updatedTransform.length > 0) {
        updatedTransform += ' ';
    }
    updatedTransform += `scale(${scale})`;
    return updatedTransform;
}
