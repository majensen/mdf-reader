import { MDFReader } from './MDFReader.js';
import 'axios';
import 'js-yaml';

async function newMDFReader(...yamls) {
  const mdf = new MDFReader(...yamls);
  await mdf._loaded;
  return mdf;
}

export { newMDFReader as default };
