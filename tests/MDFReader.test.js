let { MDFReader } = require('../dist/node/mdf-reader');

const fs = require('node:fs');

const icdc_yamls = [
  "tests/icdc-model.yml",
  "tests/icdc-model-props.yml",
  "tests/icdc-manifest-props.yml",
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

// MDFReader.add_parse_hook(
//   function() {
//     Object.keys(this.nodes_).
//       forEach( (handle) => {
//         this.nodes_[handle].exports = () => {
//           return this.mdf.Nodes[handle].Export ?
//             this.mdf.Nodes[handle].Export : [];
//         };
//       });
//   }
// );

MDFReader.add_parse_hook(
  function() {
    this.nodes().
      forEach( (node) => {
        node.exports = () => {
          return this.mdf.Nodes[node.handle].Export ?
            this.mdf.Nodes[node.handle].Export : [];
        };
      });
  }
);

let mdf = new MDFReader(...icdc_data);

it('merge works correctly', () => {
  expect(mdf.mdf.Nodes.file.Export).toBeTruthy();
  expect(mdf.mdf.Nodes.file.Export).toContain('drs_uri');
  expect(mdf.mdf.Nodes.lab_exam.Export).toBeFalsy();
});

it('check PVs', () => {
  expect(mdf.nodes('demographic').props('breed').type)
    .toBe('value_set');
  expect(mdf.nodes('demographic').props('breed').valueSet())
    .toContain('Beagle');
});

it('tags are present', () => {
  expect(mdf.tag_kvs().length).toBeGreaterThan(10);
});

it('get tag key-value pairs for one key', () => {
  expect(mdf.tag_kvs('Assignment').map( (elt) => elt[0] )
         .every(x => x === 'Assignment'))
    .toBeTruthy();
});

it('get some tagged items', () => {
  expect(mdf.tagged_items('Category','study').length).toBeGreaterThan(3);
  expect(mdf.tagged_items('Category','study').map( x => x._kind )
         .every( x => x === 'Node')).toBeTruthy();
});

it('own tags() works', () => {
  expect(mdf.nodes('program').tags().length).toBe(4);
  expect(mdf.nodes('program').tags('Category')).toBe('administrative');
});

it('get outgoing and incoming edges', () => {
  expect(mdf.outgoing_edges('sample').map( x => x.src )
         .every( x => x === 'sample')).toBeTruthy();
  expect(mdf.incoming_edges('sample').map( x => x.dst )
         .every( x => x === 'sample')).toBeTruthy();
  
});

it('get a node, see that prop.owner is that node for all its props', () => {
  const study = mdf.nodes('study');
  expect(study.props().every( p => p.owner === study )).toBeTruthy();
});

it('description captured', () => {
  const study = mdf.nodes('study');
  expect(study.desc).toMatch(/required to characterize each study/);
});

it('added parse hook and works', () => {
  expect(mdf.nodes('file').exports()).toStrictEqual([
    'file_name', 'drs_uri',
    'file_type', 'file_description',
    'file_format', 'file_size', 'md5sum',
    'uuid', 'file_location']);
  expect(mdf.nodes('lab_exam').exports()).toStrictEqual([]);
});

it('no properties handled', () => {
  const assay = mdf.nodes('assay');
  expect(assay.props()).toStrictEqual([]);
});

if('unpropdeffed prop ok', () => {
  const aa = mdf.nodes('agent_administration');
  expect(aa.props('phase')._kind).toBe('Property');
  expect(aa.props('phase').tags()).toStrictEqual([]);
});

it('all nodes are nodes', () => {
  expect(mdf.nodes().every( n => n._kind === 'Node' )).toBeTruthy();
});

it('all props are props', () => {
  expect(mdf.props().every( n => n._kind === 'Property' )).toBeTruthy();
});

