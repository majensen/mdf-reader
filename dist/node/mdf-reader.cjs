'use strict';

var yaml = require('js-yaml');
var smob = require('smob');

class MDFReader {
  constructor(...sources) {
    this.mdf = {};
    this.handle = null;
    this.nodes_ = null;
    this.edges_ = null;
    this.props_ = null;
    this.terms_ = null;
    this.tags_ = {};
    this.sources = [];
    readSources(this, ...sources);
  }

  nodes(...hdl) {
    if (hdl.length > 0) {
      let ret = Object.entries(this.nodes_)
        .filter( (kv) => hdl.includes(kv[0]) )
          .map((kv) => { return kv[1]; });
      return (ret.length === 1 ? ret[0] : ret);
    }
    else {
      return Object.keys(this.nodes_)
        .sort()
        .map( (p) => this.nodes_[p] );
    }
  }

  edges(...hdl) {
    if (hdl.length > 0) {
      let ret = Object.entries(this.edges_)
        .filter( (kv) => hdl.includes(kv[0]) )
          .map((kv) => { return kv[1]; });
      return (ret.length === 1 ? ret[0] : ret);
    }
    else {
      return Object.keys(this.edges_)
        .sort()
        .map( (e) => this.edges_[e] );
    }
  }

  props(...hdl) {
    if (hdl.length > 0) {
      let ret = Object.entries(this.props_)
        .filter( (kv) => hdl.includes(kv[0]) )
          .map((kv) => { return kv[1]; });
      return (ret.length === 1 ? ret[0] : ret);
    }
    else {
      return Object.keys(this.props_)
        .sort()
        .map( (p) => this.props_[p] );
    }
  }

  terms(...hdl) {
    if (hdl.length > 0) {
      let ret = Object.entries(this.terms_)
        .filter( (kv) => hdl.includes(kv[0]) )
          .map((kv) => { return kv[1]; });
      return (ret.length === 1 ? ret[0] : ret);
    }
    else {
      return Object.keys(this.terms_)
        .sort()
        .map( (p) => this.terms_[p] );
    }
  }

  tag_kvs(...key) {
    let ret = [];
    let [key_] = key;
    Object.keys(this.tags_)
      .filter( (k) => key_ ? k === key_ : true )
      .sort()
      .map( (k) => {
        Object.keys(this.tags_[k])
          .sort()
          .map( (v) => {
            ret.push([k, v]);
          });
      });
    return ret;
  }

  tagged_items(key, value) {
    if (this.tags_[key]) {
      if (this.tags_[key][value]) {
        return this.tags_[key][value];
      }
      else {
        return [];
      }
    }
    else {
      return [];
    }
  }

  outgoing_edges(node_hdl) {
    let ret = [];
    Object.entries(this.edges_)
      .filter( (kvt) => kvt[1][node_hdl] )
      .forEach( (kvt) => {
        Object.values(kvt[1][node_hdl])
          .forEach( (kvd) => {
            ret.push(kvd);
          });
      });
    return ret;
  }

  incoming_edges(node_hdl) {
    let ret = [];
    Object.entries(this.edges_)
      .forEach( (kvt) => {
        Object.entries(kvt[1])
          .forEach( (kvs) => {
            Object.entries(kvs[1])
              .filter( (kvd) => kvd[0] == node_hdl )
              .forEach( (kvd) => {
                ret.push(kvd[1]);
              });
          });
      });
    return ret;
  }
}

function readSources(obj, ...sources) {
  let merger = smob.createMerger({arrayDistinct:true});
  for (const source of sources) {
    if (source.constructor.name === "String") {
      let mdf = yaml.load(source);
      obj.sources.push( mdf );
    }
    else if (typeof(source) === "object") {
      obj.sources.push(source);
    }
    else {
      throw new Error("string or plain object required");
    }
  }
  obj.mdf = merger(...obj.sources);
  parse(obj);
}

function parse(obj) {

  function myProps(...nm) {
    if (nm.length > 0) {
      let ret = Object.entries(this.props_)
          .filter( (kv) => nm.includes(kv[0]) )
          .map((kv) => { return kv[1]; });
      return (ret.length === 1 ? ret[0] : ret);
    }
    else {
      return Object.values(this.props_);
    }
  }

  function myTags() {
    return this.taglist_ ? this.taglist_ : [];
  }

  function myValueSet() {
    if (this.pvs) {
      return this.pvs.map( (h) => obj.terms_[h].value )
    }
    else { return []; }
  }
  
  function myTerms() {
    if (this.termlist_) {
      return this.termlist_
        .map( (t) => obj.terms_[t] );
    }
    else { return []; }
  }

  const updateTags = (key, value, item) => {
    if (!obj.tags_[key]) {
      obj.tags_[key] = {};
    }
    if (!obj.tags_[key][value]) {
      obj.tags_[key][value] = [];
    }
    obj.tags_[key][value].push(item);
    if (!item.taglist_) {
      item.taglist_ = [];
      item.tags = myTags;
    }
    item.taglist_.push([key, value]);
  };
  
  const updateTerms = (handle, spec) => {
    let {Value:value, Origin:origin_name,
         Desc:desc, Code:origin_id,
         Version:origin_version, Definition:definition,
         Handle: exp_handle } = spec; // obj.mdf.Terms[tm];
    if (!handle) {
      if (!exp_handle) {
        handle = value;
      }
      else {
        handle = exp_handle;
      }
    }
    obj.terms_[handle] = {
      _kind: "Term",
      handle,
      value,
      origin_name,
      origin_id,
      origin_version,
      definition,
    };
    return handle;
  };
  
  if (!obj.handle) {
    let {Handle, Version} = obj.mdf;
    obj.handle = Handle;
    obj.version = Version;
  }
  if (!obj.terms_) {
    // Handle, Value, Origin, Code, Definition, Version
    obj.terms_ = {};
    for (const tm in obj.mdf.Terms) {
      updateTerms(tm, obj.mdf.Terms[tm]);
    }
  }
  if (!obj.props_) {
    obj.props_ = {};
    if (obj.mdf.PropDefinitions) {
      for (const pr in obj.mdf.PropDefinitions) {
        let handle = pr;
        let { Type: type, Enum:pvs, Req: is_required,
              Desc: desc, Key: is_key, Nul: is_nullable,
              Deprecated: is_deprecated, Strict: is_strict,
              Tags: tags, Term: terms, 
            } = obj.mdf.PropDefinitions[pr];
        let spec = { handle, desc, type,
                     is_required, is_key, is_nullable,
                     is_deprecated, is_strict,
                     tags, _kind:"Property",
                   };
        obj.props_[pr] = spec;
        if (pvs) {
          if (!type) { type = "value_set"; }
          obj.props_[pr]["pvs"] = pvs;
          pvs.forEach( (v) => {
            if (!obj.terms_[v]) {
              //              obj.terms_[v] = { handle:v, value:v, _kind:"Term" };
              updateTerms(null, {Value:v, Origin:"<Local>"});
            }
          });
          // obj.props_[pr].terms_ = obj.terms_; // kludge
          obj.props_[pr].valueSet = myValueSet;
        }
        if (tags) {
          for (const key in tags) {
            updateTags(key, tags[key], obj.props_[pr]);
          }
        }
        if (terms) {
          let termlist_ = [];
          terms.forEach( (t) => {
            termlist_.push(
              updateTerms(null, t)
            );
          });
          obj.props_[pr].termlist_ = termlist_;
          obj.props_[pr].terms = myTerms;
        }
        obj.props_[pr].tags = myTags;
      }
    }
  }
  if (!obj.nodes_) {
    obj.nodes_ = {};
    for (const nd in obj.mdf.Nodes) {
      let spec = obj.mdf.Nodes[nd];
      obj.nodes_[nd] = {_kind:"Node", handle:nd};
      obj.nodes_[nd].props_ = {};
      if (spec.Props) {
        for (const pr of spec.Props) {
          if (!obj.props_[pr]) {
            console.log('No property definition present for "%s" of node "%s"',
                         pr, nd);
            obj.props_[pr] = { handle:pr, _kind: 'Property', tags:myTags };
          }
          obj.nodes_[nd].props_[pr] = obj.props_[pr];
        }
      }
      obj.nodes_[nd].props = myProps;

      if (spec.Tags) {
        obj.nodes_[nd]["tags"] = spec.Tags;
        for (const key in spec.Tags) {
          updateTags(key, spec.Tags[key], obj.nodes_[nd]);
        }
      }
      if (spec.Term) {
        let termlist_ = [];
        spec.Term.forEach( (t) => {
          termlist_.push(
            updateTerms(null, t)
          );
        });
        obj.nodes_[nd].termlist_ = termlist_;
        obj.nodes_[nd].terms = myTerms;
      }
      obj.nodes_[nd].tags = myTags;
    }
  }
  if (!obj.edges_) {
    obj.edges_ = {};
    for (const edge_nm in obj.mdf.Relationships) {
      let spec = obj.mdf.Relationships[edge_nm];
      let mul_def = spec.Mul;
      obj.edges_[edge_nm] = {_kind:"EdgeType", handle:edge_nm};
      for (const end_pair of spec.Ends) {
        let {Mul, Tags:tags} = end_pair;
        obj.edges_[edge_nm][end_pair["Src"]] = {};
        obj.edges_[edge_nm][end_pair["Src"]][end_pair["Dst"]] =
          {multiplicity: (Mul ? Mul : mul_def), _kind:"Edge",
           handle:`${edge_nm}:${end_pair.Src}:${end_pair.Dst}`,
           src: end_pair.Src, dst: end_pair.Dst,
           tags};
        obj.edges_[edge_nm][end_pair["Src"]][end_pair["Dst"]].props_ = {};
        if (obj.mdf.Relationships[edge_nm].Props) {
          if (!obj.props_[pr]) {
            console.log('No property defintion present for "%s" of edge type "%s"',
                         pr, edge_nm);
            obj.props_[pr] = { handle:pr, _kind: 'Property', tags:myTags };
          }
          for (const pr in obj.mdf.Relationships[edge_nm].Props) {
            obj.edges_[edge_nm][end_pair["Src"]][end_pair["Dst"]].props_[pr] =
              obj.props_[pr];
          }
        }
        obj.edges_[edge_nm][end_pair["Src"]][end_pair["Dst"]].props = myProps;
        if (tags) {
          for (const key in tags) {
            updateTags(key, tags[key], obj.edges_[edge_nm][end_pair["Src"]][end_pair["Dst"]]);
          }
        }
        obj.edges_[edge_nm][end_pair["Src"]][end_pair["Dst"]].tags = myTags;
      }
      if (spec.Tags) {
        obj.edges_[edge_nm]["tags"] = spec.Tags;
        for (const key in obj.edges_[edge_nm]["tags"]) {
          updateTags(key, obj.edges_[edge_nm]["tags"][key], obj.edges_[edge_nm]);
        }
      }
      if (spec.Term) {
        let termlist_ = [];
        spec.Term.forEach( (t) => {
          termlist_.push(
            updateTerms(null, t)
          );
        });
        obj.edges_[edge_nm].termlist_ = termlist_;
        obj.edges_[edge_nm].terms = myTerms;
      }
      obj.edges_[edge_nm].tags = myTags;
    }
  }
}

exports.MDFReader = MDFReader;
