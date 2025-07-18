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
