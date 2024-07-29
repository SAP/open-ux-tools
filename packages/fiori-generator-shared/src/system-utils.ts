/**
 * Relevant values for display extended system properties to the UI
 */
export enum Suffix {
    S4HC = 'S4HC',
    BTP = 'BTP'
}

/**
 * Escape any special RegExp character that we want to use literally.
 *
 * @param str string input
 * @returns string a cleansed version of the input
 */
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Trim, cleanse and return a system name appended with the appropriate suffix i.e. BTP | S4HC.
 *
 * @param destinationName name of the system
 * @param suffix the appropriate suffix appended, BTP | S4HC
 * @returns string return an escaped string, appended with the appropriate suffix
 */
function addSuffix(systemName: string, suffix: Suffix): string {
    const suffixStr = ` (${suffix})`;
    return RegExp(`${escapeRegExp(suffixStr)}$`).exec(systemName.trim()) ? systemName : `${systemName} (${suffix})`;
}

/**
 * Generate a display name using the destination name, username if supplied and the appropriate suffix i.e. BTP | S4HC.
 *
 * @param destination destination info
 * @param displayUsername name to display with destination
 * @returns string a newly generated string value with the name of the destination, username if present and the system type
 */
export function getSystemDisplayName(
    systemName: string,
    displayUsername?: string,
    isBtp = false,
    isS4HC = false
): string {
    const userDisplayName = displayUsername ? ` [${displayUsername}]` : '';
    let systemDisplayName: string;
    if (isBtp) {
        systemDisplayName = addSuffix(systemName, Suffix.BTP);
    } else if (isS4HC) {
        systemDisplayName = addSuffix(systemName, Suffix.S4HC);
    } else {
        systemDisplayName = systemName;
    }
    return `${systemDisplayName}${userDisplayName}`;
}
