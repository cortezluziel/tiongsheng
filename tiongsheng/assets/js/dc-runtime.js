/*
 * Tiny page runtime for the Tiong Sheng preview site.
 * Renders the <template id="page-template"> markup with data from the page's
 * Component class ({{holes}}, <sc-for>, <sc-if>, onClick handlers) and updates
 * the page in place with morphdom, so only changed parts re-animate.
 */
(function () {
  'use strict';

  var handlers = {};
  var handlerSeq = 0;
  var blockSeq = 0;
  var instance = null;
  var root = null;
  var tpl = null;
  var pending = false;

  function DCLogic(props) {
    this.props = props || {};
    this.state = {};
  }
  DCLogic.prototype.setState = function (patch) {
    var next = typeof patch === 'function' ? patch(this.state, this.props) : patch;
    this.state = Object.assign({}, this.state, next);
    schedule();
  };
  DCLogic.prototype.forceUpdate = function () { schedule(); };
  window.DCLogic = DCLogic;

  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function resolve(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return parseFloat(path);
    if (/^(['"]).*\1$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var cur = scope;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interpolate(str, scope) {
    return str.replace(HOLE, function (_, p) {
      var v = resolve(p, scope);
      return v == null ? '' : String(v);
    });
  }

  // Give every <sc-for>/<sc-if> in the template a stable id once.
  function tagBlocks(node) {
    if (node.nodeType !== 1 && node.nodeType !== 11) return;
    if (node.nodeType === 1) {
      var tag = node.localName;
      if ((tag === 'sc-for' || tag === 'sc-if' || node.hasAttribute('data-for')) && !node.__bid) {
        node.__bid = ++blockSeq;
      }
    }
    for (var c = node.firstChild; c; c = c.nextSibling) tagBlocks(c);
  }

  function renderChildren(parentTpl, scope, out, key) {
    var n = 0;
    for (var c = parentTpl.firstChild; c; c = c.nextSibling) {
      n = renderNode(c, scope, out, key, n);
    }
  }

  // Appends rendered output of template node `t` to `out`. Elements created
  // directly inside a block get a data-k key so morphdom treats them as new
  // when a different block/iteration is shown (this replays entrance animations).
  function renderNode(t, scope, out, key, n) {
    if (t.nodeType === 3) {
      out.appendChild(document.createTextNode(interpolate(t.nodeValue, scope)));
      return n;
    }
    if (t.nodeType !== 1) return n;
    var tag = t.localName;

    if (tag === 'sc-for' || t.hasAttribute('data-for')) {
      var attrList = tag === 'sc-for' ? 'list' : 'data-for';
      var attrAs = tag === 'sc-for' ? 'as' : 'data-as';
      var list = resolve((t.getAttribute(attrList) || '').replace(/^\s*\{\{|\}\}\s*$/g, ''), scope) || [];
      var as = t.getAttribute(attrAs) || 'item';
      for (var i = 0; i < list.length; i++) {
        var s = Object.create(scope);
        s[as] = list[i];
        s.$index = i;
        var k = key + '/f' + t.__bid + ':' + i;
        if (tag === 'sc-for') renderChildren(t, s, out, k);
        else n = renderElement(t, s, out, k, n, true);
      }
      return n;
    }
    if (tag === 'sc-if') {
      var v = resolve((t.getAttribute('value') || '').replace(/^\s*\{\{|\}\}\s*$/g, ''), scope);
      if (v) renderChildren(t, scope, out, key + '/i' + t.__bid);
      return n;
    }
    return renderElement(t, scope, out, key, n, false);
  }

  function renderElement(t, scope, out, key, n, skipLoopAttrs) {
    var el = t.namespaceURI && t.namespaceURI !== 'http://www.w3.org/1999/xhtml'
      ? document.createElementNS(t.namespaceURI, t.localName)
      : document.createElement(t.localName);
    for (var a = 0; a < t.attributes.length; a++) {
      var at = t.attributes[a];
      var name = at.name;
      if (name.indexOf('hint-') === 0) continue;
      if (skipLoopAttrs && (name === 'data-for' || name === 'data-as')) continue;
      var val = at.value;
      if (/^on[a-z]+$/.test(name)) {
        var m = WHOLE.exec(val);
        var fn = m ? resolve(m[1], scope) : null;
        if (typeof fn === 'function') {
          var id = 'h' + (++handlerSeq);
          handlers[id] = fn;
          el.setAttribute('data-on-' + name.slice(2), id);
        }
        continue;
      }
      var whole = WHOLE.exec(val);
      if (whole) {
        var rv = resolve(whole[1], scope);
        if (rv === false || rv == null) continue;
        el.setAttribute(name, String(rv));
      } else {
        el.setAttribute(name, val.indexOf('{{') >= 0 ? interpolate(val, scope) : val);
      }
    }
    // Keys are full paths, so they stay unique across the whole page
    // (morphdom looks keyed nodes up page-wide).
    if (key) el.setAttribute('data-k', key + '#' + n);
    var holder = t.localName === 'template' ? t.content : t;
    renderChildren(holder, scope, el, key ? key + '#' + n + '>' : '');
    out.appendChild(el);
    return n + 1;
  }

  function render() {
    pending = false;
    handlers = {};
    handlerSeq = 0;
    var vals = instance.renderVals() || {};
    var next = document.createElement('div');
    renderChildren(tpl.content, vals, next, '');
    if (!root.firstChild) {
      while (next.firstChild) root.appendChild(next.firstChild);
      return;
    }
    window.morphdom(root, next, {
      childrenOnly: true,
      getNodeKey: function (node) {
        return node.nodeType === 1 ? (node.getAttribute('data-k') || node.id || undefined) : undefined;
      },
      onBeforeElUpdated: function (from, to) {
        // keep what visitors typed into form fields
        if ((from.tagName === 'INPUT' || from.tagName === 'TEXTAREA' || from.tagName === 'SELECT') && from === document.activeElement) return false;
        return true;
      }
    });
  }

  function schedule() {
    if (pending || !root) return;
    pending = true;
    Promise.resolve().then(render);
  }

  function delegate(type) {
    root.addEventListener(type, function (e) {
      var el = e.target.closest('[data-on-' + type + ']');
      if (!el || !root.contains(el)) return;
      var fn = handlers[el.getAttribute('data-on-' + type)];
      if (fn) fn(e);
    });
  }

  window.DC = {
    mount: function (Component, props) {
      tpl = document.getElementById('page-template');
      root = document.getElementById('app');
      tagBlocks(tpl.content);
      instance = new Component(props || {});
      if (!instance.state) instance.state = {};
      ['click', 'input', 'change', 'submit'].forEach(delegate);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && instance.state && instance.state.open >= 0) instance.setState({ open: -1 });
      });
      render();
      if (typeof instance.componentDidMount === 'function') instance.componentDidMount();
    }
  };
})();
