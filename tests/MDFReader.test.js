let { MDFReader } = require('../src/MDFReader');

const ccdi_yamls = [
  "https://github.com/CBIIT/ccdi-model/raw/main/model-desc/ccdi-model.yml",
  "https://github.com/CBIIT/ccdi-model/raw/main/model-desc/ccdi-model-props.yml",
  "https://github.com/CBIIT/ccdi-model/raw/main/model-desc/terms.yaml",  
];

const icdc_yamls = [
  "https://github.com/CBIIT/icdc-model-tool/raw/master/model-desc/icdc-model.yml",
  "https://github.com/CBIIT/icdc-model-tool/raw/master/model-desc/icdc-model-props.yml",
];

let mdf = new MDFReader(...ccdi_yamls);

function chill(ms) {
  return new Promise(r => setTimeout(r, ms));
}

chill();

it('is imported', () => {
  expect(typeof(MDFReader)).toBe('function');
})

it('loads remote yamls', async () => {
  await chill(1500);
  expect(Object.entries(mdf.nodes_).length).toBeGreaterThan(0);
  expect(Object.entries(mdf.edges_).length).toBeGreaterThan(0);
  expect(Object.entries(mdf.props_).length).toBeGreaterThan(0);
});

it('stored the sources', async () => {
  //await chill(1000);
  expect(mdf.sources.length).toBe(3);
});

it('loaded the mdf attrib', () => {
  expect(Object.keys(mdf.mdf)).toStrictEqual(
    ['Handle', 'Version',
     'Nodes','Relationships','PropDefinitions','Terms']);
});
    
it('lists entities', () => {
  expect(mdf.nodes().length).toBeGreaterThan(0);
});

it('knows its entities', () => {
  expect(mdf.nodes().map( x => x._kind ).every( k => k === "Node" )).toBeTruthy();
  expect(mdf.props().map( x => x._kind ).every( k => k === "Property" )).toBeTruthy();
  expect(mdf.terms().map( x => x._kind ).every( k => k === "Term" )).toBeTruthy();
  expect(mdf.edges().map( x => x._kind ).every( k => k === "EdgeType" )).toBeTruthy();
});

it('understands annotation Terms', async () => {
  expect(mdf.props('cytogenomic_platform').terms)
    .toStrictEqual(['Cytogenomic Analysis Instrumentation Text','cytogenomic_platform']);
  expect(mdf.terms('Cytogenomic Analysis Instrumentation Text').origin_name)
    .toBe('caDSR');
});

it('nodes have own props()', () => {
  expect(mdf.nodes('sample').props().map( (p) => p.handle ))
        .toStrictEqual(['sample_id', 'anatomic_site', 'participant_age_at_collection',
                         'sample_tumor_status', 'tumor_classification',
                         'sample_description', 'id']);
});

let mdf2 = new MDFReader(...icdc_yamls);

it('tags are present', async () => {
  await chill(1200);
  expect(mdf2.tag_kvs().length).toBeGreaterThan(10);
});

it('get some tagged items', () => {
  expect(mdf2.tagged_items('Category','study').length).toBeGreaterThan(3);
  expect(mdf2.tagged_items('Category','study').map( x => x._kind )
         .every( x => x === 'Node')).toBeTruthy();
});

it('get outgoing and incoming edges', () => {
  expect(mdf2.outgoing_edges('sample').map( x => x.src )
         .every( x => x === 'sample')).toBeTruthy();
  expect(mdf2.incoming_edges('sample').map( x => x.dst )
         .every( x => x === 'sample')).toBeTruthy();
  
});
