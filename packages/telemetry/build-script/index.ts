import * as fs from 'fs';

const buildQuality = process.env.build_quality;

if (buildQuality && buildQuality.toLowerCase() === 'release') {
    console.log('Release build identified. Use Azure resource ID for prod environment.');

    const rawdata = fs.readFileSync('./package.json');
    const packageJSON = JSON.parse(rawdata.toString());
    packageJSON.azureInstrumentationKey = process.env.azureProdKey;
    fs.writeFileSync('./package.json', JSON.stringify(packageJSON, null, 2));
}
