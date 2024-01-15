import { promptGeneratorInput } from '../src';

promptGeneratorInput({
    url: 'https://iccsrm.sap.com:44300',
    client: '100',
    ignoreCertErrors: true
})
    .then((result) => console.info(result))
    .catch((e) => console.error(e));
