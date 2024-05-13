axios = require('axios');
let { MDFReader } = require('../dist/node/mdf-reader');

const ccdi_yamls_urls = [
  "https://github.com/CBIIT/ccdi-model/raw/main/model-desc/ccdi-model.yml",
  "https://github.com/CBIIT/ccdi-model/raw/main/model-desc/ccdi-model-props.yml",
  "https://github.com/CBIIT/ccdi-model/raw/main/model-desc/terms.yaml",  
];

var mdf;

let ps = ccdi_yamls_urls.map( (url) => {
  return axios.get(url)
    .then( (r) => { return r.data; } );
});

let p = Promise.all(ps)
    .then( (results) => {
      let dta = [];
      results.forEach( (result) => {
        dta.push(result);
      });
      return dta;
    })
    .then( (dta) =>
      { mdf = new MDFReader(...dta); }
    )
    .catch( (e) => { throw new Error(e); } );


it('mdf loads', () => {
  return p.then( () => {
    expect(Object.entries(mdf.nodes_).length).toBeGreaterThan(0);
    expect(Object.entries(mdf.edges_).length).toBeGreaterThan(0);
    expect(Object.entries(mdf.props_).length).toBeGreaterThan(0);
  });
});

it('stored the sources', () => {
  return p.then( () => {
    expect(mdf.sources.length).toBe(3);
  });
});

it('loaded the mdf attrib', () => {
  return p.then( () => {
    expect(Object.keys(mdf.mdf)).toStrictEqual(
      ['Handle', 'Version',
       'Nodes','Relationships','PropDefinitions','Terms']);
  });
});

it('lists entities', () => {
  return p.then( () => {
    expect(mdf.nodes().length).toBeGreaterThan(0);
  });
});

it('knows its entities', () => {
  return p.then( () => {
    expect(mdf.nodes().map( x => x._kind ).every( k => k === "Node" )).toBeTruthy();
    expect(mdf.props().map( x => x._kind ).every( k => k === "Property" )).toBeTruthy();
    expect(mdf.terms().map( x => x._kind ).every( k => k === "Term" )).toBeTruthy();
    expect(mdf.edges().map( x => x._kind ).every( k => k === "Edge" )).toBeTruthy();
  });
});

it('can filter edges by source and type', () => {
  return p.then( () => {
    expect(mdf.edges().filter( edge => edge.dst === 'sample').length)
      .toBe(mdf.incoming_edges('sample').length);
    expect(mdf.edges().filter( edge => edge.dst === 'sample' && edge.type === 'of_pdx')
          .length)
      .toBe(mdf.edges('of_pdx').filter( edge => edge.dst === 'sample').length);
    expect(mdf.edges('of_pdx').filter( edge => edge.dst === 'sample').length).
      toBe(mdf.incoming_edges('sample').filter( edge => edge.type === 'of_pdx')
           .length);
  });
});
                 

it('understands annotation Terms',  () => {
  return p.then( () => {
    expect(mdf.props('cytogenomic_platform').terms().map((t)=>t.handle))
      .toStrictEqual(['Cytogenomic Analysis Instrumentation Text','cytogenomic_platform']);
    expect(mdf.terms('Cytogenomic Analysis Instrumentation Text').origin_name)
      .toBe('caDSR');
  });
});

it('nodes have own props()', () => {
  return p.then( () => {
    expect(mdf.nodes('sample').props().map( (p) => p.handle ))
      .toStrictEqual(['sample_id', 'anatomic_site', 'participant_age_at_collection',
                      'sample_tumor_status', 'tumor_classification',
                      'sample_description', 'id']);
  });
});

