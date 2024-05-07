let { MDFReader } = require('../dist/node/mdf-reader');

const fs = require('node:fs');

const icdc_yamls = [
  "./icdc-model.yml",
  "./icdc-model-props.yml",
];

const icdc_data = icdc_yamls.map( (fn) => {
  try {
    let dta = fs.readFileSync(fn);
    return dta.toString();
  } catch (err) {
    throw new Error(err);
  }
});

it('is imported', () => {
  expect(typeof(MDFReader)).toBe('function');
});

let mdf = new MDFReader(...icdc_data);

it('tags are present', () => {
  expect(mdf.tag_kvs().length).toBeGreaterThan(10);
});

it('get some tagged items', () => {
  expect(mdf.tagged_items('Category','study').length).toBeGreaterThan(3);
  expect(mdf.tagged_items('Category','study').map( x => x._kind )
         .every( x => x === 'Node')).toBeTruthy();
});

it('get outgoing and incoming edges', () => {
  expect(mdf.outgoing_edges('sample').map( x => x.src )
         .every( x => x === 'sample')).toBeTruthy();
  expect(mdf.incoming_edges('sample').map( x => x.dst )
         .every( x => x === 'sample')).toBeTruthy();
  
});
