import { promptGeneratorInput } from '../src';

promptGeneratorInput({
    url: 'https://ldciec1.devint.net.sap:44300'
})
    .then((result) => console.info(result))
    .catch((e) => console.error(e));
