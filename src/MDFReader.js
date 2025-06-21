import yaml from 'js-yaml';
import { createMerger } from 'smob';

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

function myTags(key) {
  if (!this.taglist_) {
    this.taglist_ = [];
  }
  if (key) {
    return (Object.fromEntries(this.taglist_))[key];
  }
  return this.taglist_;
}

function myValueSet(rdr) {
  if (this.pvs) {
    return this.pvs.map( (h) => rdr.terms_[h].value );
  }
  else { return []; }
}

function myTerms(rdr) {
  if (!this.termlist_) {
    this.termlist_ = [];
  }
  return this.termlist_
    .map( (t) => rdr.terms_[t] );
}  

export class MDFReader {
  static #parse_hooks = [];
  static add_parse_hook(hook) {
    this.#parse_hooks.push(hook);
    return this;
  }

  constructor(...sources) {
    this.mdf = {};
    this.handle = null;
    this.nodes_ = null;
    this.edges_ = null;
    this.props_ = null;
    this.terms_ = null;
    this.tags_ = {};
    this.sources = [];
    this.#readSources( ...sources);
    let {Handle, Version} = this.mdf;
    this.handle = Handle;
    this.version = Version;
    this.#parse_terms().
      #parse_props().
      #parse_nodes().
      #parse_edges().
      #run_parse_hooks(this.constructor.#parse_hooks);
  }
  nodes(...hdl) {
    if (hdl.length > 0) {
      let ret = Object.entries(this.nodes_)
          .filter( ([h, node]) => hdl.includes(h) )
          .map( ([h, node]) => node );
      return (ret.length === 1 ? ret[0] : ret);
    }
    else {
      return Object.keys(this.nodes_)
        .sort()
        .map( (p) => this.nodes_[p] );
    }
  }

  edges(...edge_types) {
    if (edge_types.length > 0) {
      let ret = Object.entries(this.edges_)
          .filter( ([h, edges]) => edge_types.includes(h) )
          .flatMap(([h, edges]) => {
            return Object.values(edges.insts)
              .flatMap((dests) => Object.values(dests));
          });
      return ret;
    }
    else {
      return Object.keys(this.edges_)
        .sort()
        .flatMap( (edge_type) => {
          return Object.values(this.edges_[edge_type].insts)
            .flatMap((dests) => Object.values(dests));
        });
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
      .filter( ([type, edges]) => edges.insts[node_hdl] )
      .forEach( ([type, edges]) => {
        Object.values(edges.insts[node_hdl])
          .forEach( (edge) => {
            ret.push(edge);
          });
      });
    return ret;
  }

  incoming_edges(node_hdl) {
    let ret = [];
    Object.entries(this.edges_)
      .forEach( ([type, edges]) => {
        Object.entries(edges.insts)
          .forEach( ([src, by_dst]) => {
            by_dst[node_hdl]
              && ret.push(by_dst[node_hdl]);
          });
      });
    return ret;
  }

  #readSources(...sources) {
    let merger = createMerger({arrayDistinct:true});
    for (const source of sources) {
      if (source.constructor.name === "String") {
        let mdf = yaml.load(source);
        this.sources.push( mdf );
      }
      else if (typeof(source) === "object") {
        this.sources.push(source);
      }
      else {
        throw new Error("string or plain object required");
      }
    }
    this.mdf = merger(...this.sources);
 }

  updateTerms(handle, spec) {
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
    this.terms_[handle] = {
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

  updateTags(key, value, item){
    if (!this.tags_[key]) {
      this.tags_[key] = {};
    }
    if (!this.tags_[key][value]) {
      this.tags_[key][value] = [];
    }
    this.tags_[key][value].push(item);
    if (!item.taglist_) {
      item.taglist_ = [];
      item.tags = myTags.bind(item);
    }
    item.taglist_.push([key, value]);
  };

  #parse_terms() {
    if (!this.terms_) {
      // Handle, Value, Origin, Code, Definition, Version
      this.terms_ = {};
      for (const tm in this.mdf.Terms) {
        this.updateTerms(tm, this.mdf.Terms[tm]);
      }
    }
    return this;
  }

  #parse_props() {
    if (!this.props_) {
      this.props_ = {};
      if (this.mdf.PropDefinitions) {
        for (const pr in this.mdf.PropDefinitions) {
          let handle = pr;
          let item_type = null;
          let { Type: type, Enum:pvs, Req: is_required,
                Desc: desc, Key: is_key, Nul: is_nullable,
                Deprecated: is_deprecated, Strict: is_strict,
                Tags: tags, Term: terms, 
              } = this.mdf.PropDefinitions[pr];
          if (typeof(type) == 'object' &&
              type.value_type &&
              type.value_type == 'list') {
            item_type = type['item_type'] || type['Enum'];
            if (Array.isArray(item_type)) {
              pvs = item_type;
              item_type = 'value_set';
            }
            type = "list";
          }
          let spec = { handle, desc, type,
                       is_required, is_key, is_nullable,
                       is_deprecated, is_strict,
                       tags, _kind:"Property",
                     };
          this.props_[pr] = spec;
          if (item_type) {
            this.props_[pr]["item_type"] = item_type;
          }
          if (pvs) {
            if (!type) { spec.type = "value_set"; }
            this.props_[pr]["pvs"] = pvs;
            pvs.forEach( (v) => {
              if (!this.terms_[v]) {
                this.updateTerms(null, {Value:v, Origin:"<Local>"});
              }
            });
            this.props_[pr].valueSet = myValueSet.bind(this.props_[pr], this);
          }
          if (tags) {
            for (const key in tags) {
              this.updateTags(key, tags[key], this.props_[pr]);
            }
          }
          if (terms) {
            let termlist_ = [];
            terms.forEach( (t) => {
              termlist_.push(
                this.updateTerms(null, t)
              );
            });
            this.props_[pr].termlist_ = termlist_;
            this.props_[pr].terms = myTerms.bind(this.props_[pr], this);
          }
          this.props_[pr].tags = myTags.bind(this.props_[pr]);
        }
      }
    }
    return this;
  }

  #parse_nodes() {
    if (!this.nodes_) {
      this.nodes_ = {};
      for (const nd in this.mdf.Nodes) {
        let spec = this.mdf.Nodes[nd];
        this.nodes_[nd] = {_kind:"Node", handle:nd, desc:spec.Desc};
        this.nodes_[nd].props_ = {};
        if (spec.Props) {
          for (const pr of spec.Props) {
            if (!this.props_[pr]) {
              console.log('No property definition present for "%s" of node "%s"',
                          pr, nd);
              this.props_[pr] = { handle:pr, _kind: 'Property',
                                  tags:null, terms:null, type:'UNDEFINED'};
              this.props_[pr].tags = myTags.bind(this.props_[pr]);
            }
            this.nodes_[nd].props_[pr] = this.props_[pr];
            this.props_[pr].owner = this.nodes_[nd];
          }
        }
        this.nodes_[nd].props = myProps.bind(this.nodes_[nd]);

        if (spec.Tags) {
          this.nodes_[nd]["tags"] = spec.Tags;
          for (const key in spec.Tags) {
            this.updateTags(key, spec.Tags[key], this.nodes_[nd]);
          }
        }
        if (spec.Term) {
          let termlist_ = [];
          spec.Term.forEach( (t) => {
            termlist_.push(
              this.updateTerms(null, t)
            );
          });
          this.nodes_[nd].termlist_ = termlist_;
          this.nodes_[nd].terms = myTerms.bind(this.nodes_[nd],this);
        }
        this.nodes_[nd].tags = myTags.bind(this.nodes_[nd]);
      }
    }
    return this;
  }

  #parse_edges() {
    if (!this.edges_) {
      this.edges_ = {};
      for (const edge_nm in this.mdf.Relationships) {
        let spec = this.mdf.Relationships[edge_nm];
        let mul_def = spec.Mul;
        this.edges_[edge_nm] = {_kind:"EdgeType", handle:edge_nm, desc:spec.desc };
        let insts = {};
        for (const end_pair of spec.Ends) {
          let {Mul, Tags:tags} = end_pair;
          if (!insts[end_pair["Src"]]) {
            insts[end_pair["Src"]] = {};
          }
          insts[end_pair["Src"]][end_pair["Dst"]] =
            {multiplicity: (Mul ? Mul : mul_def), _kind:"Edge",
             handle:`${edge_nm}:${end_pair.Src}:${end_pair.Dst}`,
             src: end_pair.Src, dst: end_pair.Dst, type: edge_nm,
             tags};
          insts[end_pair["Src"]][end_pair["Dst"]].props_ = {};
          if (this.mdf.Relationships[edge_nm].Props) {
            for (const pr in this.mdf.Relationships[edge_nm].Props) {
              if (!this.props_[pr]) {
                console.log('No property defintion present for "%s" of edge type "%s"',
                            pr, edge_nm);
                this.props_[pr] = { handle:pr, _kind: 'Property'};
                this.props_[pr].tags = myTags.bind(this.props_[pr]);
              }
              insts[end_pair["Src"]][end_pair["Dst"]].props_[pr] =
                this.props_[pr];
              this.props_[pr].owner = insts[end_pair["Src"]][end_pair["Dst"]];
            }
          }
          insts[end_pair["Src"]][end_pair["Dst"]].props =
            myProps.bind(insts[end_pair["Src"]][end_pair["Dst"]]);
          if (tags) {
            for (const key in tags) {
              this.updateTags(key, tags[key], insts[end_pair["Src"]][end_pair["Dst"]]);
            }
          }
          insts[end_pair["Src"]][end_pair["Dst"]].tags =
            myTags.bind(insts[end_pair["Src"]][end_pair["Dst"]]);
        }
        this.edges_[edge_nm].insts = insts;
        if (spec.Tags) {
          this.edges_[edge_nm]["tags"] = spec.Tags;
          for (const key in this.edges_[edge_nm]["tags"]) {
            this.updateTags(key, this.edges_[edge_nm]["tags"][key], this.edges_[edge_nm]);
          }
        }
        if (spec.Term) {
          let termlist_ = [];
          spec.Term.forEach( (t) => {
            termlist_.push(
              this.updateTerms(null, t)
            );
          });
          this.edges_[edge_nm].termlist_ = termlist_;
          this.edges_[edge_nm].terms = myTerms.bind(this.edges_[edge_nm], this);
        }
        this.edges_[edge_nm].tags = myTags.bind(this.edges_[edge_nm]);
      }
    }
    return this;
  }

  #run_parse_hooks(hooks) {
    if (hooks.length == 0) {
      return this;
    }
    hooks.forEach( (hook) => {
      hook.call(this);
    });
    return this;
  }

}

