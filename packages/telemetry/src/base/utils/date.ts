export const localDatetimeToUTC = (): string => {
    const timeInMs = new Date().getTime();
    return new Date(timeInMs).toISOString();
};
