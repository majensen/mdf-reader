axios = require('axios');
// import yaml from 'js-yaml';
yaml = require('js-yaml');

class MDFReader {
  constructor(...sources) {
    this.mdf = {};
    this.handle = null;
    this.nodes = null;
    this.edges = null;
    this.props = null;
    this.tags = {};
    this.sources = [];
    readSources(this, sources);
  }

  edges() {
  }

  props() {
  }

  terms() {
  }
}

async function readSources(obj, sources) {
  for (const source of sources) {
    if (typeof(source) === "string") {
      if (/^https?:\/\//.test(source)) {
        const resp = await axios.get(source);
        obj.sources.push(yaml.load(resp.data));
      }
      else {
        obj.sources.push(yaml.load(source));
      }
    }
    else if (typeof(source) === "object") {
      obj.sources.push(source);
    }
    else {
      throw new Error("string, url, or plain object required");
    }
  }
  for (const y of obj.sources) {
    obj.mdf = {...obj.mdf, ...y};
  }
  await parse(obj);
}

async function parse(obj) {
  const updateTags = (key, value, item) => {
    if (!obj.tags[key]) {
      obj.tags[key] = {};
    }
    if (!obj.tags[key][value]) {
      obj.tags[key][value] = [];
    }
    obj.tags[key][value].push(item);
  }
  if (!obj.handle) {
    let {Handle, Version} = obj.mdf;
    obj.handle = Handle;
    obj.version = Version;
  }
  if (!obj.props) {
    obj.props = {};
    if (obj.mdf.PropDefinitions) {
      for (const pr in obj.mdf.PropDefinitions) {
        let handle = pr;
        let { Type: type, Enum:pvs, Req: is_required,
              Desc: desc, Key: is_key, Nul: is_nullable,
              Deprecated: is_deprecated, Tags: tags } = obj.mdf.PropDefinitions[pr];
        if (pvs && !type) {
          type = "value_set";
        }
        let spec = { handle, desc, type,
                     is_required, is_key, is_nullable,
                     is_deprecated, tags, _kind:"Property" };
        obj.props[pr] = spec;
        if (pvs) {
          obj.props[pr]["pvs"] = pvs;
        }
        if (tags) {
          for (const key in tags) {
            updateTags(key, tags[key], obj.props[pr])
          }
        }
      }
    }
  }
  if (!obj.nodes) {
    obj.nodes = {};
    for (const nd in obj.mdf.Nodes) {
      obj.nodes[nd] = {_kind:"Node"};
      obj.nodes[nd]["props"] = {};
      for (const pr of obj.mdf.Nodes[nd].Props) {
        obj.nodes[nd].props[pr] = obj.props[pr];
      }
      if (obj.mdf.Nodes[nd].Tags) {
        obj.nodes[nd]["tags"] = obj.mdf.Nodes[nd].Tags;
        for (const key in obj.mdf.Nodes[nd].Tags) {
          updateTags(key, obj.mdf.Nodes[nd].Tags[key], obj.nodes[nd] )
        }
      }
    }
  }
  if (!obj.edges) {
    obj.edges = {};
    for (const edge_nm in obj.mdf.Relationships) {
      let spec = obj.mdf.Relationships[edge_nm];
      let mul_def = spec.Mul;
      obj.edges[edge_nm] = {_kind:"EdgeType"}
      for (const end_pr of spec.Ends) {
        let {Mul, Tags:tags} = end_pr;
        obj.edges[edge_nm][end_pr["Src"]] = {};
        obj.edges[edge_nm][end_pr["Src"]][end_pr["Dst"]] =
          {multiplicity: (Mul ? Mul : mul_def), _kind:"Edge", tags};
        obj.edges[edge_nm][end_pr["Src"]][end_pr["Dst"]].props = {};
        for (const pr in obj.mdf.Relationships[edge_nm].Props) {
          obj.edges[edge_nm][end_pr["Src"]][end_pr["Dst"]].props[pr] =
            obj.props[pr];
        }
        if (tags) {
          for (const key in tags) {
            updateTags(key, tags[key], obj.edges[edge_nm][end_pr["Src"]][end_pr["Dst"]])
          }
        }
      }
      if (spec.Tags) {
        obj.edges[edge_nm]["tags"] = spec.Tags;
        for (const key in obj.edges[edge_nm]["tags"]) {
          updateTags(key, obj.edges[edge_nm]["tags"][key], obj.edges[edge_nm]);
        }
      }
    }
  }
}

// m = new MDFReader("https://github.com/CBIIT/ctdc-model/raw/master/model-desc/ctdc_model_file.yaml","https://github.com/CBIIT/ctdc-model/raw/master/model-desc/ctdc_model_properties_file.yaml")
