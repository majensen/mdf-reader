let { MDFReader } = require('../dist/node/mdf-reader');

const fs = require('node:fs');

const gold_yaml = "tests/crdc_datahub_mdf.yml";

it('is imported', () => {
  expect(typeof(MDFReader)).toBe("function");
});

let dta = fs.readFileSync(gold_yaml);
let mdf = new MDFReader(dta.toString());

it('yaml is parsed', () => {
  expect(mdf.constructor.name)
    .toBe("MDFReader");
});

it('there are 8 nodes', () => {
  expect(mdf.nodes().length)
    .toStrictEqual(8);
});

it('collection_method is a property', () => {
  let pr = mdf.props()
      .filter( (pr) => pr.handle == 'collection_method' );
  expect(pr.length)
    .toStrictEqual(1);
  expect(pr[0].type[0])
    .toStrictEqual('/path/to/collection/methods');
});

it('is_key is set/clear', () => {
  let pr = mdf.nodes('diagnosis');
  expect(pr.props('diagnosis_id').is_key)
    .toBeTruthy();
  expect(pr.props('transaction_date').is_key)
    .toBeFalsy();
  expect(pr.props('diagnosis').is_key)
    .toBeFalsy();
});

it('list property with enum', () => {
  let pr = mdf.nodes('study').props('study_data_types');
  expect(pr.valueSet())
    .toStrictEqual([ 'Genomic', 'Imaging', 'Clinical' ]);
  expect(pr.item_type)
    .toBe('value_set');
  pr = mdf.nodes('study').props('study_data_types_enum');
  expect(pr.valueSet())
    .toStrictEqual([ 'Genomic', 'Imaging', 'Clinical' ]);
  expect(pr.item_type)
    .toBe('value_set');
});

it('is_strict is set/clear', () => {
  let pr = mdf.nodes('study').props('adult_or_childhood_study');
  expect(pr.is_strict)
    .toBeFalsy();
  pr = mdf.nodes('participant').props('race');
  expect(pr.is_strict)
    .toBeTruthy();
});

it('is_required is set/clear', () => {
  let nd =  mdf.nodes('diagnosis');
  let prs = ['diagnosis','id','date','transaction_id','transaction_date']
      .map(pr => [pr, nd.props(pr)]);
  prs = Object.fromEntries(prs);
  expect(prs.diagnosis.is_required == 'Preferred')
    .toBeTruthy();
  expect(prs.id.is_required)
    .toBeTruthy();
  expect(prs.date.is_required)
    .toBeTruthy();
  expect(prs.transaction_id.is_required)
    .toBeFalsy();  
  expect(prs.transaction_date.is_required)
    .toStrictEqual('No');
});
