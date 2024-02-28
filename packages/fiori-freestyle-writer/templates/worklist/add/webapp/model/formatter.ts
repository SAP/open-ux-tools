/**
* Rounds the currency value to 2 digits
*
* @param value value to be formatted
* @returns formatted currency value with 2 digits
*/
export function numberUnit(value: string): string {
    if (!value) {
        return "";
    }

    return parseFloat(value).toFixed(2);
}