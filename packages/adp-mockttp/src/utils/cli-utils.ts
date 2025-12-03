type CliParamValue = string | number | boolean | undefined;

export function getCliParamValueByName<T extends CliParamValue>(name: string): T {
    const arg = process.argv.find((arg) => arg.startsWith(`--${name}`));

    if (!arg) {
        return undefined as T;
    }

    const value = arg.split('=')[1];

    if (!value) {
        // If we have param without a value we return true, e.g. --record.
        return true as T;
    }

    const valueToLowerCase = value.toLowerCase();
    if (valueToLowerCase === 'true') {
        return true as T;
    }

    if (valueToLowerCase === 'false') {
        return false as T;
    }

    const numericValue = Number(value);
    if (!isNaN(numericValue)) {
        return numericValue as T;
    }

    return value as T;
}
