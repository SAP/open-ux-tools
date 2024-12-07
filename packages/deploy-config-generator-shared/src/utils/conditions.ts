/**
 * Show overwrite question if certain conditions are met.
 *
 * @param configExists - if the config file already exists
 * @param launchDeployConfigAsSubGenerator - if the generator is launched as a subgenerator
 * @param launchStandaloneFromYui - if the generator is launched as a standalone generator in YUI
 * @param overwriteOption - if the overwrite option is set
 * @returns - if the overwrite question should be shown
 */
export function showOverwriteQuestion(
    configExists: boolean,
    launchDeployConfigAsSubGenerator = true,
    launchStandaloneFromYui?: boolean,
    overwriteOption?: boolean
): boolean {
    // Don't show this question in wrapper generator
    const showQuestion =
        launchDeployConfigAsSubGenerator && !launchStandaloneFromYui ? false : Boolean(!overwriteOption);

    return showQuestion && configExists;
}
