# mdf-reader

MDF Reader is a small JavaScript class that will parse a set of [model description files](https://github.com/CBIIT/bento-mdf#bento-graph-model-description-format)(MDF) to provide a set of convenient methods to iterate and navigate the described graph.

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
          { model = new MDFReader(...dta); }
        )
        .catch( (e) => { throw new Error(e); } );
    
    p.then( () => {
        model.nodes().forEach( (n) => {
            console.log("Node name: %s", n.handle);
            });
        });
```
    
## Objects

Nodes, properties, edges, and terms are represented by plain JS Objects. Each Object has a set of standard keys which correspond to similar keys in MDF for each entity:

```js
    { _kind = 'Node', handle                    } = node;
    { _kind = 'Edge', handle, src, dst          } = edge;
    { _kind = 'Property', handle, type, is_key, 
      is_nullable, is_deprecated, is_strict     } = prop;
    { _kind = 'Term', handle, origin_name,
      origin_version, definition                } = term;
```

In general, such Objects are returned by the API calls described below.

## API

### MDFReader instance methods:

* `nodes()`, `nodes('mynode')`, `nodes('a\_node', ...)`
* `edges()`, `edges('has_a:node1:node2')`, `edges('has_a:node1:node2', 'is_a:node3:node4', ...)`
* `props()`, `props('prop1')`, `props('a_prop', ...)`
* `terms()`, `terms('myterm')`, `terms('a_term", ...)`

Without arguments, return as an Array the entire set of nodes, props, edges, or terms (in Object form above) for a model.

With one entity handle argument, return the Object or null if no such object exists.

With multiple handles as arguments, return an Array of the Objects corresponding to the handles.

* `outgoing_edges(node_handle)`
* `incoming_edges(node_handle)`

Return an Array of edges for which the specified node is the source or destination, respectively.

* `tagged_items(key, value)`

Returns an Array of Objects tagged in the MDF with the key-value pair, or an empty Array if no such tag exists. Use the `_kind` key to determine the entity type for each Object.

* `tag_kvs()`, `tag_kvs(key)`

Returns an Array of Arrays of the form `[key, value]`. Without an argument, 
all `[key, value]` pairs present in the model are returned. With a key argument, pairs
having the given key are returned.

Example: to get all nodes that have a Category tag:

```js
 let cat_nodes = model.tag_kvs('Category').flatMap( (kv) => model.tagged_items(...kv) )
```

### Object own methods

* `node.props()`, `edge.props()`

Return an Array of a node's or edge's properties, if any.

* `node.terms()`, `edge.terms()`, `prop.terms()`

Return an Array of term Objects annotating these entities in the MDF.

* `prop.valueSet()`

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

* `item.tags()`

Return an Array of `[key, value]` pairs tagging the item (node, property, or edge).

