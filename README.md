# mdf-reader

MDFReader is a small JavaScript class that will parse a set of [model description files](https://github.com/CBIIT/bento-mdf#model-description-files-mdf) (MDF) to provide a set of convenient methods to iterate and navigate the described graph.

It complies with the MDF [merge/"overlay" spec](https://github.com/CBIIT/bento-mdf#multiple-input-yaml-files-and-overlays), and processes an arbitrary number of input YAML/JSON formatted strings:

```js
let mdf = new MDFReader( model_yaml, model_props_yaml, model_terms_yaml, ... );
```

To avoid committing to a file access method in the module, you are on your own for acquiring those strings. See _Usage_ below for synchronous and async examples.

MDFReader out of the box attempts to comply with the MDF spec. To add implementation-specific info to the MDF, you're encouraged to use the built-in [Tags](https://github.com/CBIIT/bento-mdf#tagging-entities) feature of MDF. See _API_ below for tag accessors and finders.

However, MDF is flexible and you can add custom keys without invalidating it. To parse custom keys in MDFReader, you can add parsing hooks using the static function 
`MDFReader.add_parse_hook(<function>)`. See _API_ below for details and example.


## Installation

```bash
$ npm install mdf-reader
```

## Usage

```js
const model = new MDFReader(yaml_string1, yaml_string2, ...);
```

Synchronous example:

```js
const { MDFReader } = require('mdf-reader');
const fs = require('node:fs');

const yamls = [
  "./icdc-model.yml",
  "./icdc-model-props.yml",
];

const data = yamls.map( (fn) => {
  try {
    let dta = fs.readFileSync(fn);
    return dta.toString();
  } catch (err) {
    throw new Error(err);
  }
});

const model = new MDFReader(...data);
model.terms().forEach( (t) => {
    console.log("Value: %s\n  Definition: %s",
                t.value, t.definition);
});
```

Async example:

```js
import axios from 'axios';
import { MDFReader } from 'mdf-reader';

var model;
const yaml_urls = [
  "https://github.com/CBIIT/ccdi-model/raw/main/model-desc/ccdi-model.yml",
  "https://github.com/CBIIT/ccdi-model/raw/main/model-desc/ccdi-model-props.yml",
  "https://github.com/CBIIT/ccdi-model/raw/main/model-desc/terms.yaml",
];

let ps = yaml_urls.map( (url) => {
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
      { return new MDFReader(...dta); }
    )
    .catch( (e) => { throw new Error(e); } );

p.then( (model) => {
    model.nodes().forEach( (n) => {
        console.log("Node name: %s", n.handle);
        });
    });
```
    
## Objects

Nodes, properties, edges, and terms are represented by plain JS Objects. Each Object has a set of standard keys which correspond to similar keys in MDF for each entity:

```js
{ _kind = 'Node', handle, desc              } = node;
{ _kind = 'Edge', handle, src, dst, type    } = edge;
{ _kind = 'Property', handle, type, desc, 
  is_key, is_nullable, is_deprecated, 
  is_strict, owner                          } = prop;
{ _kind = 'Term', handle, desc,
  origin_name, origin_version, definition   } = term;
```

Property objects have an attribute `owner`, which points back to the Node or Edge object
to which they belong.

In general, such Objects are returned by the API calls described below.

## API

### MDFReader instance methods:

* `nodes()`, `nodes('mynode')`, `nodes('a_node', ...)`
* `edges()`, `edges('has_a', ...)` (see below)
* `props()`, `props('prop1')`, `props('a_prop', ...)`
* `terms()`, `terms('myterm')`, `terms('a_term", ...)`

Without arguments, return as an Array the entire set of nodes, props, edges, or terms (in Object form above) for a model.

With one entity handle argument, return the Object or null if no such object exists.

With multiple handles as arguments, return an Array of the Objects corresponding to the handles.

* `edges(<edge type>)`

In MDF, edges have a simple string "type" (such as `member_of`), a source or "from" node, 
and a destination or "to" node. The `edges` accessor will accept any number of edge types, 
and return all edges having those types. 

* `outgoing_edges(node_handle)`
* `incoming_edges(node_handle)`

Return an Array of edges for which the specified node is the source or destination, respectively.
For example, to get all outgoing edges for a node "sample" (i.e., all edges where sample is
the source nodes), with the edge type "member_of":

```JS
const sample_member_of_x = model.outgoing_edges('sample')
                             .filter( (edge) => edge.type === 'member_of' );
```

* `tagged_items(key, value)`

Returns an Array of Objects tagged in the MDF with the key-value pair, or an empty Array if no such tag exists. Use the `_kind` key to determine the entity type for each Object.

* `tag_kvs()`, `tag_kvs(key)`

Returns an Array of Arrays of the form `[key, value]`. Without an argument, 
all `[key, value]` pairs present in the model are returned. With a key argument, pairs
having the given key are returned.

Example: to get all nodes that have a Category tag:

```js
 let cat_nodes = model.tag_kvs('Category')
    .flatMap( (kv) => model.tagged_items(...kv) );
```

### Object own methods

* `node.props()`, `edge.props()`

Return an Array of a node's or edge's properties, if any.

* `node.terms()`, `edge.terms()`, `prop.terms()`

Return an Array of term Objects annotating these entities in the MDF.

* `prop.valueSet()`

_Composite Key feature_: Return an Array of properties that comprise a node's composite key

* `node.composite_key_props()`

Return an Array of acceptable values if a property has an acceptable value list or "Enum" (i.e., if `prop.type == 'value_set'`). Note these are the actual values to be used in data, not the term handles. So, for this MDF:

```yaml
    PropDefinition:
      breed:
        Enum:
          - beagle
          - german_shepherd
    Terms:
      beagle:
        Value: Beagle
      german_shepherd:
        Value: German Shepherd
```

the following would hold:

```js
model.props('breed').valueSet() == ['Beagle', 'German Shepherd']
```

* `item.tags()`, `item.tags(<key>)`

With no arguments, return an Array of `[key, value]` pairs tagging the
item (node, property, or edge).

If a `key` is provided as a single argument, the tag value on that item for that key (if any) is
returned as a string.

### Custom parsing

* `MDFReader.add_parse_hook(function(){...})`

Add custom parsing routines to the end of standard parsing. The function should be written considering `this` as the MDFReader instance under construction. Multiple calls to `add_parse_hook` add multiple hooks in order to the parse flow.

Example: Suppose your MDF has a non-standard Node key "Export", with an array of property handles as values. Standard parsing will not expose `Node[node_handle]['Export']` in MDFReader, but you can add a parsing hook as follows:

```js
MDFReader.add_parse_hook(
  function() {
    this.nodes()
      .forEach( (node) => {
        node.exports = () => {
          return this.mdf.Nodes[node.handle].Export ?
            this.mdf.Nodes[node.handle].Export : [];
        };
      });
    return this;
  });
```

Now, after parsing,  node objects will have an own method `exports()` returning the custom array.

```js
let mdf = new MDFReader( yaml_mdf_standard, yaml_mdf_custom );
mdf.node('study').exports()
  .forEach( (exported_prop) => { useProp(exported_prop); } );
```
