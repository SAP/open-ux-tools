export const localDatetimeToUTC = (): string => {
    const timeInMs = Date.now();
    return new Date(timeInMs).toISOString();
};
