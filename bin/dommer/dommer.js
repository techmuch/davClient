define([], function() {
    /*  dommer.js - a (mostly) compliant subset of DOM level 2 for JS
    (c) Guido Wesdorp 2004-2008
    email johnny@debris.demon.nl

    This software is distributed under the terms of the Dommer
    License. See LICENSE.txt for license text.

    dommer.js

    This library provides a mostly compliant subset of the DOM API in core
    JavaScript. A number of methods aren't implemented, and there are a few
    semantic differences between the standard and this implementations, but
    it provides most of DOM level 2's features and is usable in almost all JS
    environments (also stand-alone ones).

    I started writing this mainly because of IE's lack of proper namespace 
    support, and to have a portable, reliable DOM implementation.

    Non-standard are:

    - Whitespace is never ignored.

    - Because of JS doesn't (by default) allow computing attributes on request,
      this API doesn't create Element.nodeName on setting element.prefix, 
      therefore a new method was added: Element.setPrefix (note that this
      is not required if the library is not used on browsers that don't
      support __defineGetter__ and __defineSetter__ (such as IE)).

    $Id: minisax.js,v 1.5 2004/07/31 00:10:15 johnny Exp $

*/

    // give this a namespace...

    var global = this;

    global.dommer = new function() {
        /* Exceptions */

        // If the following switch is set to true, setting Element.prefix
        // will result in an exception. This serves to make sure scripts work
        // cross-browser: IE does not support __defineSetter__, which is used
        // to ensure Element.nodeName is updated if Element.prefix
        // is changed (and also to ensure Element.nodeName and 
        // Element.localName can't be changed directly). The lack of this
        // method on IE means that on that platform it is possible to break
        // integrity (by setting .prefix directly, .nodeName will be out-of-date).
        // Note that this means that if you intend to use this lib only on Mozilla
        // (or other browsers that support dynamic properties), you can safely 
        // set this to false and set .prefix without breaking integrity.
        this.WARN_ON_PREFIX = true;

        function DOMException(errorcode, message) {
            this.code = null;
            this.error = null;
            this.message = message
            for (var attr in DOMException) {
                if (DOMException[attr] == errorcode) {
                    this.error = attr;
                    break;
                };
            };
            this.code = errorcode;
            if (!this.error) {
                this.error = 'Unknown';
            };
            this.stack = stack = createStack();
            this.lineNumber = getLineNo(stack);
            this.fileName = getFileName(stack);
        };

        this.DOMException = DOMException;

        // error codes
        // XXX should we make these global, like in the specs?
        DOMException.INDEX_SIZE_ERR = 1,
            DOMException.DOMSTRING_SIZE_ERR = 2;
        DOMException.HIERARCHY_REQUEST_ERR = 3;
        DOMException.WRONG_DOCUMENT_ERR = 4;
        DOMException.INVALID_CHARACTER_ERR = 5;
        DOMException.NO_DATA_ALLOWED_ERR = 6;
        DOMException.NO_MODIFICATION_ALLOWED_ERR = 7;
        DOMException.NOT_FOUND_ERR = 8;
        DOMException.NOT_SUPPORTED_ERR = 9;
        DOMException.INUSE_ATTRIBUTE_ERR = 10;
        DOMException.INVALID_STATE_ERR = 11;
        DOMException.SYNTAX_ERR = 12;
        DOMException.INVALID_MODIFICATION_ERR = 13;
        DOMException.NAMESPACE_ERR = 14;
        DOMException.INVALID_ACCESS_ERR = 15;

        DOMException.prototype.toString = function() {
            var ret = 'DOMException: ' + this.error + ' (' + this.code + ')';
            if (this.message) {
                ret += ' - ' + this.message;
            };
            return ret;
        };

        /* Node interface */
        function Node() {
            // These are defined in-line rather than on .prototype to allow using
            // them below, too. This way we don't have to check whether attributes
            // are already protected while this constructor is ran or not (in JS,
            // when you set 'Foo.prototype = new Bar;', the Bar constructor is
            // actually ran, in our case this means that the state of the 
            // superclass changes).
            this._protectAttribute = function _protectAttribute(attr) {
                /* make an attribute read-only */
                this.__defineSetter__(attr,
                    function(value) {
                        throw (
                            (new DOMException(
                                DOMException.NO_MODIFICATION_ALLOWED_ERR, attr))
                        );
                    }
                );
                this.__defineGetter__(attr,
                    function() {
                        return this['_' + attr];
                    }
                );
            };

            this._setProtected = function _setProtected(name, value) {
                /* set a read-only attribute

                    THIS IS AN INTERNAL METHOD that should not get used as part 
                    of the API
                */
                this['_' + name] = value;
                if (!this.__defineSetter__) {
                    this[name] = value;
                };
            };

            this.nodeValue = null;
            if (this.__defineSetter__) {
                // on browsers that support __define[GS]etter__, perform integrity
                // checks
                // nodeValue should be settable on certain nodeTypes
                this.__defineSetter__('nodeValue',
                    function(nodeValue) {
                        if (this.nodeType != this.TEXT_NODE &&
                            this.nodeType != this.ATTRIBUTE_NODE &&
                            this.nodeType != this.COMMENT_NODE) {
                            throw (
                                (new DOMException(
                                    DOMException.NO_DATA_ALLOWED_ERR,
                                    'nodeValue'))
                            );
                        };
                        // XXX should check on allowed chars here, but not 
                        // sure which?
                        this._nodeValue = nodeValue;
                    }
                );
                // XXX not sure if we should protect reading .nodeValue
                this.__defineGetter__('nodeValue',
                    function() {
                        if (this.nodeType != this.TEXT_NODE &&
                            this.nodeType != this.ATTRIBUTE_NODE &&
                            this.nodeType != this.COMMENT_NODE) {
                            throw (
                                (new DOMException(
                                    DOMException.NO_DATA_ALLOWED_ERR,
                                    'nodeValue'))
                            );
                        };
                        return this._nodeValue;
                    }
                );
                var toprotect = ['nodeType', 'nodeName', 'parentNode',
                    'childNodes', 'firstChild', 'lastChild',
                    'previousSibling', 'nextSibling',
                    'attributes', 'ownerDocument', 'namespaceURI',
                    'localName'
                ];
                for (var i = 0; i < toprotect.length; i++) {
                    this._protectAttribute(toprotect[i]);
                };
            };

            this._setProtected('namespaceURI', null);
            this._setProtected('prefix', null);
            this._setProtected('nodeName', null);
            this._setProtected('localName', null);
            this._setProtected('parentNode', null);
            // note that this is shared between subclass instances, so should be
            // re-set in every .initialize() (so below is just for show)
            this._setProtected('childNodes', []);
            this._setProtected('firstChild', null);
            this._setProtected('lastChild', null);
            this._setProtected('previousSibling', null);
            this._setProtected('nextSibling', null);
            this._setProtected('ownerDocument', null);
        };

        this.Node = Node;

        Node.ELEMENT_NODE = Node.prototype.ELEMENT_NODE = 1;
        Node.ATTRIBUTE_NODE = Node.prototype.ATTRIBUTE_NODE = 2;
        Node.TEXT_NODE = Node.prototype.TEXT_NODE = 3;
        Node.CDATA_SECTION_NODE = Node.prototype.CDATA_SECTION_NODE = 4;
        Node.ENTITY_REFERENCE_NODE = Node.prototype.ENTITY_REFERENCE_NODE = 5;
        Node.ENTITY_NODE = Node.prototype.ENTITY_NODE = 6;
        Node.PROCESSING_INSTRUCTION_NODE =
            Node.prototype.PROCESSING_INSTRUCTION_NODE = 7;
        Node.COMMENT_NODE = Node.prototype.COMMENT_NODE = 8;
        Node.DOCUMENT_NODE = Node.prototype.DOCUMENT_NODE = 9;
        Node.DOCUMENT_TYPE_NODE = Node.prototype.DOCUMENT_TYPE_NODE = 10;
        Node.DOCUMENT_FRAGMENT_NODE = Node.prototype.DOCUMENT_FRAGMENT_NODE = 11;
        Node.NOTATION_NODE = Node.prototype.NOTATION_NODE = 12;

        var thrownotsupported = function() {
            throw ('not supported');
        };

        // XXX these should be implemented at some point...
        Node.prototype.normalize = thrownotsupported;
        Node.prototype.isSupported = thrownotsupported; // hehehe...

        // non-standard method, use this always instead of setting .prefix 
        // yourself, as this will update the .nodeName property too
        Node.prototype.setPrefix = function setPrefix(prefix) {
            if (this.__defineSetter__) {
                this._prefix = prefix;
                this._nodeName = prefix + ':' + this.localName;
            } else {
                this.prefix = prefix;
                this.nodeName = prefix + ':' + this.localName;
            };
        };

        Node.prototype.cloneNode = function cloneNode() {
            throw (
                (new DOMException(DOMException.NOT_SUPPORTED_ERR))
            );
        };

        Node.prototype.hasChildNodes = function hasChildNodes() {
            return (this.childNodes && this.childNodes.length > 0);
        };

        Node.prototype.hasAttributes = function hasAttributes() {
            return (this.attributes !== undefined && this.attributes.length);
        };

        Node.prototype.appendChild = function appendChild(newChild) {
            this._checkModificationAllowed();
            this._attach(newChild);
        };

        Node.prototype.removeChild = function removeChild(oldChild) {
            this._checkModificationAllowed();
            this._checkIsChild(oldChild);
            var newChildren = new NodeList();
            var found = false;
            for (var i = 0; i < this.childNodes.length; i++) {
                if (this.childNodes[i] === oldChild) {
                    oldChild._setProtected('parentNode', null);
                    var previous = oldChild.previousSibling;
                    if (previous) {
                        oldChild._setProtected('previousSibling', null);
                        previous._setProtected('nextSibling',
                            oldChild.nextSibling);
                    };
                    var next = oldChild.nextSibling;
                    if (next) {
                        next._setProtected('previousSibling', previous);
                        oldChild._setProtected('nextSibling', null);
                    };
                    continue;
                };
                newChildren.push(this.childNodes[i]);
            };
            this._setProtected('childNodes', newChildren);
            this._setProtected('firstChild', (this.childNodes.length > 0 ? this.childNodes[0] : null));
            this._setProtected('lastChild', (
                this.childNodes.length > 0 ?
                this.childNodes[this.childNodes.length - 1] : null));
        };

        Node.prototype.replaceChild = function replaceChild(newChild, refChild) {
            this._checkModificationAllowed();
            this._checkIsChild(refChild);
            this._attach(newChild, refChild, true);
        };

        Node.prototype.insertBefore = function insertBefore(newChild, refChild) {
            this._checkModificationAllowed();
            this._checkIsChild(refChild);
            this._attach(newChild, refChild);
        };

        Node.prototype._attach = function _attach(newChild, refChild, replace) {
            // see if the child is in the same document
            if (newChild.ownerDocument != this.ownerDocument &&
                newChild.ownerDocument != this) {
                throw (
                    (new DOMException(DOMException.WRONG_DOCUMENT_ERR))
                );
            };
            // see if the child is of an allowed type
            if (newChild.nodeType != newChild.ELEMENT_NODE &&
                newChild.nodeType != newChild.TEXT_NODE &&
                newChild.nodeType != newChild.CDATA_SECTION_NODE &&
                newChild.nodeType != newChild.COMMENT_NODE) {
                throw (
                    (new DOMException(DOMException.HIERARCHY_REQUEST_ERR))
                );
            };
            // see if the child isn't a (grand)parent of ourselves
            var currparent = this;
            while (currparent && currparent.nodeType != newChild.DOCUMENT_NODE) {
                if (currparent === newChild) {
                    throw (
                        (new DOMException(DOMException.HIERARCHY_REQUEST_ERR))
                    );
                };
                currparent = currparent.parentNode;
            };
            // seems to be okay, add it
            if (newChild.parentNode) {
                newChild.parentNode.removeChild(newChild);
            };
            newChild._setProtected('parentNode', this);
            if (!refChild) {
                if (this.childNodes.length) {
                    this.childNodes[this.childNodes.length - 1]._setProtected(
                        'nextSibling', newChild);
                    newChild._setProtected('previousSibling',
                        this.childNodes[this.childNodes.length - 1]);
                };
                this.childNodes.push(newChild);
            } else {
                var newchildren = [];
                var found = false;
                for (var i = 0; i < this.childNodes.length; i++) {
                    var currChild = this.childNodes[i];
                    if (currChild === refChild) {
                        newchildren.push(newChild);
                        var previous = this.childNodes[i - 1];
                        if (previous) {
                            newChild._setProtected('previousSibling', previous);
                            previous._setProtected('nextSibling', newChild);
                        };
                        if (!replace) {
                            newchildren.push(currChild);
                            currChild._setProtected('previousSibling', newChild);
                            newChild._setProtected('nextSibling', currChild);
                        } else {
                            currChild._setProtected('parentNode', null);
                            currChild._setProtected('previousSibling', null);
                            currChild._setProtected('nextSibling', null);
                            var next = this.childNodes[i + 1];
                            if (next) {
                                newChild._setProtected('nextSibling', next);
                                next._setProtected('previousSibling', newChild);
                            };
                        };
                        found = true;
                    } else {
                        newchildren.push(currChild);
                    };
                };
                if (!found) {
                    throw (
                        (new DOMException(DOMException.NOT_FOUND_ERR))
                    );
                };
                this._setProtected('childNodes', newchildren);
            };
            this._setProtected('firstChild', this.childNodes[0]);
            this._setProtected('lastChild',
                this.childNodes[this.childNodes.length - 1]);
        };

        Node.prototype._checkModificationAllowed =
            function _checkModificationAllowed() {
                if (this.nodeType != this.ELEMENT_NODE &&
                    this.nodeType != this.DOCUMENT_NODE &&
                    this.nodeType != this.DOCUMENT_FRAGMENT_NODE) {
                    throw (
                        (new DOMException(DOMException.NO_MODIFICATION_ALLOWED_ERR))
                    );
                };
            };

        Node.prototype._checkIsChild = function _checkIsChild(refChild) {
            if (refChild.parentNode !== this) {
                throw (
                    (new DOMException(DOMException.NOT_FOUND_ERR))
                );
            };
        };

        function DocumentFragment() {
            this._setProtected('nodeType', 11);
        };

        DocumentFragment.prototype = new Node;
        this.DocumentFragment = DocumentFragment;

        function Element() {
            this._setProtected('nodeType', 1);
        };

        Element.prototype = new Node;
        this.Element = Element;

        Element.prototype.initialize = function initialize(namespaceURI, qname,
            ownerDocument) {
            // XXX the specs are very vague about an id, it says the DOM 
            // implementation must have info about which attributes are of the id 
            // type, I'll just use the property here for now...
            this.id = ''; // empty string like in Mozilla, seems weird to me though

            this._setProtected('attributes', []);
            this._setProtected('childNodes', []);
            this._setProtected('ownerDocument', ownerDocument);

            // try to ensure integrity by defining getters and setters for certain
            // properties, since this only works in certain browsers it makes sense to 
            // test your applications on one of those platforms, see also 
            // WARN_ON_PREFIX in the top of the document
            if (this.__defineSetter__) {
                this._nodeName = this.nodeName;
                this.__defineSetter__('nodeName', function() {
                    throw (
                        (new DOMException(
                            DOMException.NO_MODIFICATION_ALLOWED_ERR)))
                });
                this.__defineGetter__('nodeName',
                    function() {
                        return this._nodeName
                    });
                this.__defineSetter__('prefix',
                    function(value) {
                        if (dommer.WARN_ON_PREFIX) {
                            throw ('Setting prefix directly ' +
                                'breaks integrity of the ' +
                                'XML DOM in Internet ' +
                                'Explorer browsers!');
                        };
                        this._prefix = value;
                        this._nodeName = this._prefix + ':' +
                            this._localName;
                    });
                this.__defineGetter__('prefix', function() {
                    return this._prefix
                });
            };
            // XXX both the ns and qname need integrity checks
            this._setProtected('namespaceURI', namespaceURI);
            if (qname.indexOf(':') > -1) {
                var tup = qname.split(':');
                this.setPrefix(tup.shift());
                this._setProtected('localName', tup.join(':'));
            } else {
                this.setPrefix(null);
                this._setProtected('localName', qname);
            };
            if (this.prefix) {
                this._setProtected('nodeName', this.prefix + ':' + this.localName);
            } else {
                this._setProtected('nodeName', this.localName);
            };
        };

        Element.prototype.toString = function toString() {
            return '<Element "' + this.nodeName + '" (type ' +
                this.nodeType + ')>';
        };

        Element.prototype.toXML = function toXML(context) {
            // context is used when toXML is called recursively
            // marker
            var no_prefix_id = '::no_prefix::';
            if (!context) {
                context = {
                    namespace_stack: []
                };
            };
            var new_namespaces = {}; // any namespaces that weren't declared yet
            var current_namespaces = {};
            var last_namespaces = context.namespace_stack[
                context.namespace_stack.length - 1];
            context.namespace_stack.push(current_namespaces);
            if (last_namespaces) {
                for (var prefix in last_namespaces) {
                    current_namespaces[prefix] = last_namespaces[prefix];
                };
            };
            var xml = '<' + this.nodeName;
            var prefix = this.prefix || no_prefix_id;
            if (this.namespaceURI &&
                (current_namespaces[prefix] != this.namespaceURI)) {
                current_namespaces[prefix] = this.namespaceURI;
                new_namespaces[prefix] = this.namespaceURI;
            };
            for (var i = 0; i < this.attributes.length; i++) {
                var attr = this.attributes[i];
                if (attr.nodeName == 'xmlns' || attr.prefix == 'xmlns') {
                    continue;
                }
                var aprefix = attr.prefix || no_prefix_id;
                if (attr.namespaceURI &&
                    current_namespaces[aprefix] != attr.namespaceURI) {
                    current_namespaces[aprefix] = attr.namespaceURI;
                    new_namespaces[aprefix] = attr.namespaceURI;
                };
                xml += ' ' + attr.nodeName + '="' +
                    string.entitize(attr.nodeValue) + '"';
            };

            // take care of any new namespaces
            for (var prefix in new_namespaces) {
                xml += ' xmlns';
                if (prefix != no_prefix_id) {
                    xml += ':' + prefix;
                };
                xml += '="' + string.entitize(new_namespaces[prefix]) + '"';
            };

            if (this.childNodes.length) {
                xml += '>';
                for (var i = 0; i < this.childNodes.length; i++) {
                    xml += this.childNodes[i].toXML(context);
                };
                xml += '</' + this.nodeName + '>';
            } else {
                xml += ' />';
            };
            context.namespace_stack.pop();
            return xml;
        };

        Element.prototype.cloneNode = function cloneNode(deep) {
            var el = new Element();
            el.initialize(this.namespaceURI, this.nodeName, this.ownerDocument);
            for (var i = 0; i < this.attributes.length; i++) {
                var clone = this.attributes[i].cloneNode();
                clone._setProtected('ownerElement', el);
                el.attributes.push(clone);
            };
            if (deep) {
                for (var i = 0; i < this.childNodes.length; i++) {
                    var clone = this.childNodes[i].cloneNode(true);
                    clone._setProtected('parentNode', el);
                    clone._setProtected('ownerDocument', el.ownerDocument);
                    el.appendChild(clone);
                };
            };
            return el;
        };

        Element.prototype.getAttributeNodeNS =
            function getAttributeNodeNS(namespaceURI, qname) {
                for (var i = 0; i < this.attributes.length; i++) {
                    var attr = this.attributes[i];
                    if (attr.namespaceURI == namespaceURI && attr.localName == qname) {
                        return attr;
                    };
                };
            };

        Element.prototype.getAttributeNode = function getAttributeNode(name) {
            if (!this.attributes) {
                this._setProtected('attributes', []);
            };
            for (var i = 0; i < this.attributes.length; i++) {
                var attr = this.attributes[i];
                if (attr.nodeName == name) {
                    return attr;
                };
            };
        };

        Element.prototype.getAttribute = function getAttribute(name) {
            var attr = this.getAttributeNode(name)
            return (attr ? attr.nodeValue : null);
        };

        Element.prototype.getAttributeNS =
            function getAttributeNS(namespaceURI, name) {
                var attr = this.getAttributeNodeNS(namespaceURI, name);
                return (attr ? attr.nodeValue : null);
            };

        Element.prototype.hasAttributeNS =
            function hasAttributeNS(namespaceURI, name) {
                return !!(this.getAttributeNS(namespaceURI, name));
            };

        Element.prototype.hasAttribute = function hasAttribute(name) {
            return this.hasAttributeNS(this.namespaceURI, name);
        };

        Element.prototype.setAttributeNS =
            function setAttributeNS(namespaceURI, name, value) {
                if (!namespaceURI) {
                    namespaceURI = null;
                };
                if (!this.attributes) {
                    this._setProtected('attributes', []);
                };
                for (var i = 0; i < this.attributes.length; i++) {
                    var attr = this.attributes[i];
                    if (attr.namespaceURI == namespaceURI && attr.nodeName == name) {
                        attr.nodeValue = value;
                        return;
                    };
                };
                var attr = new Attribute();
                attr.initialize(namespaceURI, name, value, this.ownerDocument);
                attr._setProtected('ownerElement', this);
                this.attributes.push(attr);
            };

        Element.prototype.setAttribute = function setAttribute(name, value) {
            this.setAttributeNS(undefined, name, value);
        };

        Element.prototype.setAttributeNodeNS =
            function setAttributeNodeNS(newAttr) {
                for (var i = 0; i < this.attributes.length; i++) {
                    var attr = this.attributes[i];
                    if (attr.namespaceURI == newAttr.namespaceURI &&
                        attr.nodeName == newAttr.nodeName) {
                        throw (
                            (new DOMException(DOMException.INUSE_ATTRIBUTE_ERR))
                        );
                    };
                };
                this.attributes.push(newAttr);
            };

        Element.prototype.setAttributeNode = function setAttributeNode(newAttr) {
            // XXX should this fail if no namespaceURI is available or something?
            this.setAttributeNodeNS(newAttr);
        };

        Element.prototype.removeAttributeNS =
            function removeAttributeNS(namespaceURI, name) {
                var newattrs = [];
                var removed = false;
                for (var i = 0; i < this.attributes.length; i++) {
                    var attr = this.attributes[i];
                    if (attr.namespaceURI == namespaceURI && attr.localName == name) {
                        removed = true;
                    } else {
                        newattrs.push(attr);
                    };
                };
                if (removed) {
                    this._setProtected('attributes', newattrs);
                    return true;
                };
            };

        Element.prototype.removeAttribute = function removeAttribute(name) {
            var newattrs = [];
            var removed = false;
            for (var i = 0; i < this.attributes.length; i++) {
                var attr = this.attributes[i];
                if (attr.nodeName == name) {
                    removed = true;
                } else {
                    newattrs.push(attr);
                };
            };
            if (removed) {
                this._setProtected('attributes', newattrs);
                return true;
            };
        };

        Element.prototype.getElementsByTagNameNS =
            function getElementsByTagNameNS(namespaceURI, name, ret) {
                // XXX *very* slow!!!
                // needs to be optimized later on (probably by using some mapping)
                if (!ret) {
                    ret = [];
                };
                for (var i = 0; i < this.childNodes.length; i++) {
                    var child = this.childNodes[i];
                    if (name == child.nodeName || name == '*') {
                        if ((!namespaceURI && !child.namespaceURI) ||
                            (namespaceURI == child.namespaceURI)) {
                            ret.push(child);
                        };
                    };
                    if (child.nodeType == 1) {
                        child.getElementsByTagNameNS(namespaceURI, name, ret);
                    };
                };
                return ret;
            };

        Element.prototype.getElementsByTagName =
            function getElementsByTagName(name) {
                return this.getElementsByTagNameNS(this.namespaceURI, name);
            };

        Element.prototype.getElementById = function getElementById(id, attrname) {
            var attrname = attrname || 'id'; // XXX xml:id?
            // XXX *very* slow!!!
            // needs to be optimized later on (probably by using some mapping)
            if (this.id == id ||
                (this.attributes && this.getAttribute(attrname) == id)) {
                return this;
            };
            for (var i = 0; i < this.childNodes.length; i++) {
                var child = this.childNodes[i];
                if (child.id == id ||
                    (child.attributes && child.getAttribute(attrname) == id)) {
                    return child;
                };
                if (child.nodeType == 1) {
                    var found = this.childNodes[i].getElementById(id, attrname);
                    if (found) {
                        return found;
                    };
                };
            };
        };

        function TextNode() {
            this._setProtected('nodeType', 3);
            this._setProtected('nodeName', '#text');
        };

        TextNode.prototype = new Node;
        this.TextNode = TextNode;

        TextNode.prototype.initialize = function initialize(data, ownerDocument) {
            this._setProtected('ownerDocument', ownerDocument);
            this._setProtected('childNodes', new NodeList());
            // nodeValue is not protected
            this.nodeValue = data;
        };

        TextNode.prototype.toXML = function toXML() {
            return string.entitize(this.nodeValue);
        };

        TextNode.prototype.cloneNode = function cloneNode() {
            var node = new TextNode();
            node.initialize(this.nodeValue, this.ownerDocument);
            return node;
        };

        function CommentNode() {
            /* a comment node */
            this._setProtected('nodeType', 8);
            this._setProtected('nodeName', '#comment');
        };

        CommentNode.prototype = new TextNode;
        this.CommentNode = CommentNode;

        CommentNode.prototype.initialize =
            function initialize(data, ownerDocument) {
                this._setProtected('ownerDocument', ownerDocument);
                this._setProtected('childNodes', []);
                this._setProtected('nodeValue', data);
            };

        CommentNode.prototype.toXML = function toXML() {
            return "<!--" + this.nodeValue + "-->";
        };

        // Attribute, subclass of TextNode because of the nice implementation
        function Attribute() {
            /* an attribute node */
            this._setProtected('nodeType', 2);
        };

        Attribute.prototype = new Node;
        this.Attribute = Attribute;

        Attribute.prototype.initialize =
            function initialize(namespaceURI, qname, value,
                ownerDocument) {
                // XXX some code duplication here...
                if (qname.match(/[^a-zA-Z0-9_\-:]/g)) {
                    throw (
                        (new DOMException(DOMException.INVALID_CHARACTER_ERR))
                    );
                };
                this._setProtected('ownerDocument', ownerDocument);
                this._setProtected('namespaceURI', namespaceURI);
                this._setProtected('nodeValue', value);
                this._setProtected('childNodes', []);

                // try to ensure integrity by defining getters and setters for certain
                // properties, since this only works in certain browsers it makes sense to 
                // test your applications on one of those platforms, see also 
                // WARN_ON_PREFIX in the top of the document
                if (this.__defineSetter__) {
                    this._nodeName = this.nodeName;
                    this.__defineSetter__('nodeName', function() {
                        throw (
                            (new DOMException(
                                DOMException.NO_MODIFICATION_ALLOWED_ERR)))
                    });
                    this.__defineGetter__('nodeName',
                        function() {
                            return this._nodeName
                        });
                    this.__defineSetter__('prefix',
                        function(value) {
                            if (dommer.WARN_ON_PREFIX) {
                                throw ('Setting prefix directly ' +
                                    'breaks integrity of the ' +
                                    'XML DOM in Internet ' +
                                    'Explorer browsers!');
                            };
                            this._prefix = value;
                            this._nodeName = this._prefix +
                                this._localName;
                        });
                    this.__defineGetter__('prefix', function() {
                        return this._prefix
                    });
                    this._protectAttribute('ownerElement');
                };
                this._setProtected('ownerElement', null);
                if (qname.indexOf(':') > -1) {
                    var tup = qname.split(':');
                    this.setPrefix(tup.shift());
                    this._setProtected('localName', tup.join(':'));
                } else {
                    this.setPrefix(null);
                    this._setProtected('localName', qname);
                };
                if (this.prefix) {
                    this._setProtected('nodeName', this.prefix + ':' + this.localName);
                } else {
                    this._setProtected('nodeName', this.localName);
                };
            };

        Attribute.prototype.toXML = function toXML() {
            ret = this.nodeName + '="' + string.entitize(this.nodeValue) + '"';
            return ret;
        };

        Attribute.prototype.cloneNode = function cloneNode() {
            var attr = new Attribute();
            attr.initialize(this.namespaceURI, this.nodeName, this.nodeValue,
                this.ownerDocument);
            return attr;
        };

        Attribute.prototype.toString = function toString() {
            return this.nodeValue;
        };

        function Document() {
            /* the document node */
            this._setProtected('nodeType', 9);
            this._setProtected('nodeName', '#document');
        };

        Document.prototype = new Element;
        this.Document = Document;

        Document.prototype.initialize = function initialize() {
            this._setProtected('ownerDocument', this);
            this._setProtected('childNodes', []);
            this.documentElement = null;
            this.namespaceToPrefix = {};
        };

        Document.prototype.toXML = function toXML() {
            return this.documentElement.toXML();
        };

        Document.prototype.appendChild = function appendChild(newChild) {
            if (this.documentElement) {
                throw (
                    (new DOMException(DOMException.HIERARCHY_REQUEST_ERR,
                        'document already has a document element'))
                );
            };
            this._checkModificationAllowed();
            this._attach(newChild);
            this.documentElement = newChild;
        };

        Document.prototype.cloneNode = function cloneNode(deep) {
            var d = new Document();
            d.initialize();
            if (deep) {
                var clone = this.documentElement.cloneNode(true);
                clone = d.importNode(clone, true);
                d.appendChild(clone);
            };
            return d;
        };

        Document.prototype.createElement = function createElement(nodeName) {
            return this.createElementNS(this.namespaceURI, nodeName);
        };

        Document.prototype.createElementNS =
            function createElementNS(namespaceURI, nodeName) {
                var el = new Element();
                el.initialize(namespaceURI, nodeName, this);
                return el;
            };

        Document.prototype.createTextNode = function createTextNode(data) {
            var el = new TextNode();
            el.initialize(string.deentitize(data), this);
            return el;
        };

        Document.prototype.createAttributeNS =
            function createAttributeNS(namespaceURI, nodeName) {
                var el = new Attribute();
                el.initialize(namespaceURI, nodeName, null, this);
                return el;
            };

        Document.prototype.createAttribute = function createAttribute(nodeName) {
            return this.createAttributeNS(undefined, nodeName);
        };

        Document.prototype.createComment = function createComment(data) {
            var el = new CommentNode();
            el.initialize(data, this);
            return el;
        };

        Document.prototype.importNode = function importNode(node, deep) {
            var newnode = node.cloneNode(deep);
            newnode._setProtected('parentNode', null);
            newnode._setProtected('ownerDocument', this);
            if (newnode.getElementsByTagName) {
                var allchildren = newnode.getElementsByTagName('*');
                for (var i = 0; i < allchildren.length; i++) {
                    allchildren[i]._setProtected('ownerDocument', this);
                };
            };
            return newnode;
        };

        Document.prototype.importForeignNode = function importForeignNode(node) {
            if (node.nodeType == 1) {
                var newnode = new dommer.Element();
                newnode.initialize(node.namespaceURI, node.localName, this);
            } else if (node.nodeType == 3) {
                var newnode = new dommer.TextNode();
                newnode.initialize(node.nodeValue, this);
            } else if (node.nodeType == 8) {
                var newnode = new dommer.CommentNode();
                newnode.initialize(node.nodeValue, this);
            } else {
                throw ('unsupported node type ' + node.nodeType);
            };
            newnode.setPrefix(node.prefix);
            if (node.nodeType == 1) {
                for (var i = 0; i < node.attributes.length; i++) {
                    var attr = node.attributes[i];
                    newnode.setAttributeNS(attr.namespaceURI, attr.nodeName,
                        attr.nodeValue);
                };
                for (var i = 0; i < node.childNodes.length; i++) {
                    newnode.appendChild(this.importForeignNode(
                        node.childNodes[i]));
                };
            };
            return newnode;
        };

        function DOMHandler() {
            /* SAX handler to convert a piece of XML to a DOM */
        };

        this.DOMHandler = DOMHandler;

        DOMHandler.prototype.startDocument = function startDocument() {
            this.document = new Document();
            this.document.initialize();
            this.current = null;
            this.namespaces = new Array();
            this.namespaceToPrefix = {};
        };

        DOMHandler.prototype.startElement =
            function startElement(namespaceURI, nodename, attrs) {
                if (namespaceURI && !array.contains(this.namespaces, namespaceURI)) {
                    this.namespaces.push(namespaceURI);
                    // update the mapping on the document just to be sure,
                    // that one and the one on this handler should always be in 
                    // sync if a start tag is encountered, since instantiating a 
                    // Element will set the prefix on that element
                    // XXX ??
                    this.document.namespaceToPrefix = this.namespaceToPrefix;
                };
                var node = this.document.createElementNS(namespaceURI, nodename);
                var prefix = undefined;
                if (namespaceURI) {
                    prefix = this.namespaceToPrefix[namespaceURI];
                    if (prefix) {
                        node.setPrefix(prefix);
                    };
                };
                for (var ans in attrs) {
                    // XXX can be optimized by using a dict and just setting the key
                    if (ans && ans != '' && !array.contains(this.namespaces, ans)) {
                        this.namespaces.push(ans);
                    };
                    var nsattrs = attrs[ans];
                    for (var aname in nsattrs) {
                        if (aname == 'prefix') {
                            continue;
                        };
                        if (ans) {
                            var attr = this.document.createAttributeNS(ans, aname);
                            attr.setPrefix(this.namespaceToPrefix[ans]);
                            attr.nodeValue = nsattrs[aname];
                            node.setAttributeNodeNS(attr);
                        } else {
                            var attr = this.document.createAttribute(aname);
                            attr.nodeValue = nsattrs[aname];
                            node.setAttributeNode(attr);
                        };
                    };
                };
                if (!this.current) {
                    this.document.documentElement = node;
                    this.document._setProtected('childNodes', [node]);
                    this.current = node;
                    this.current._setProtected('parentNode', this.document);
                    this.current._setProtected('ownerDocument', this.document);
                } else {
                    this.current.appendChild(node);
                    this.current = node;
                };
            };

        DOMHandler.prototype.characters = function characters(data) {
            if (!this.current && string.strip(data) == '') {
                return;
            };
            var node = this.document.createTextNode(data);
            this.current.appendChild(node);
        };

        DOMHandler.prototype.comment = function comment(data) {
            if (!this.current && string.strip(data) == '') {
                return;
            };
            var node = this.document.createComment(data);
            if (this.current) {
                this.current.appendChild(node);
            } else {
                this.document.comment = node;
            };
        };

        DOMHandler.prototype.endElement =
            function endElement(namespaceURI, nodename) {
                var prefix = this.namespaceToPrefix[namespaceURI];
                if (nodename != this.current.localName ||
                    namespaceURI != this.current.namespaceURI) {
                    throw ('non-matching end tag ' + namespaceURI + ':' +
                        prefix + ':' + nodename + ' for start tag ' +
                        this.current.namespaceURI + ':' + this.current.nodeName);
                };
                this.current = this.current.parentNode;
            };

        DOMHandler.prototype.endDocument = function endDocument() {};

        function DOM() {
            /* The DOM API 

                Uses regular expressions to convert <xml> to a simple DOM
        
                Provides:

                    DOM.parseXML(xml)
                    - parse the XML, return a document element

                    DOM.createDocument()
                    - returns the document node of the DOM (which in contains
                        the documentElement)

                    DOM.toXML()
                    - returns a serialized XML string

                    DOM.buildFromHandler(handler)
                    - build and return a DOM document built from a MiniSAX handler
            */
        };

        this.DOM = DOM;

        DOM.prototype.createDocument = function createDocument() {
            var document = new Document();
            document.initialize();
            this.document = document;
            return document;
        };

        DOM.prototype.toXML = function toXML(docOrEl, encoding) {
            /* serialize to XML */
            var xml = '<?xml version="1.0"';
            if (encoding) {
                xml += ' encoding="' + encoding + '"';
            };
            xml += '?>\n';
            return xml + docOrEl.toXML();
        };

        DOM.prototype.parseXML = function parseXML(xml) {
            /* parse XML into a DOM 
        
                returns a Document node
            */
            var handler = new DOMHandler();
            var parser = new minisax.SAXParser();
            parser.initialize(xml, handler);
            parser.parse();
            var document = handler.document;
            this._copyNamespaceMapping(document, handler.namespaceToPrefix);
            this.document = document;
            return document;
        };

        DOM.prototype.buildFromHandler = function buildFromHandler(handler) {
            /* create a DOM from a SAX handler */
            var document = handler.document;
            this._copyNamespaceMapping(document, handler.namespaceToPrefix);
            return document;
        };

        DOM.prototype._copyNamespaceMapping =
            function _copyNamespaceMapping(document, namespaces) {
                document.namespaceToPrefix = namespaces;
            };

        // an implementation of an array, exactly the same as the one in JS 
        // (although incomplete) itself, this because friggin' IE has problems 
        // using Array as prototype (it won't update .length on mutations)
        function BaseArray() {
            for (var i = 0; i < arguments.length; i++) {
                this[i] = arguments[i];
            };
            this.length = arguments.length;
        };

        BaseArray.prototype.concat = function concat() {
            throw ('Not supported');
        };

        BaseArray.prototype.join = function join() {
            throw ('Not supported');
        };

        BaseArray.prototype.pop = function pop() {
            var item = this[this.length - 1];
            delete this[this.length - 1];
            this.length = this.length - 1;
            return item;
        };

        BaseArray.prototype.push = function push(item) {
            this[this.length] = item;
            this.length = this.length + 1;
            return item;
        };

        BaseArray.prototype.reverse = function reverse() {
            throw ('Not supported');
        };

        BaseArray.prototype.shift = function shift() {
            var item = this[0];
            for (var i = 1; i < this.length; i++) {
                this[i - 1] = this[i];
            };
            delete this[length - 1];
            this.length = this.length - 1;
            return item;
        };

        BaseArray.prototype.unshift = function unshift(item) {
            for (var i = 0; i < this.length; i++) {
                this[this.length - i] = this[(this.length - i) - 1];
            };
            this[0] = item;
            this.length = this.length + 1;
            return;
        };

        BaseArray.prototype.splice = function splice() {
            // XXX we may want to support this later
            throw ('Not supported');
        };

        BaseArray.prototype.toString = function toString() {
            var ret = [];
            for (var i = 1; i < this.length; i++) {
                ret.push(this[i].toString());
            };
            return ret.join(', ');
        };

        // for subclassing and such...
        this.BaseArray = BaseArray;

        function NodeList() {};

        NodeList.prototype = new BaseArray;
        this.NodeList = NodeList;

        NodeList.prototype.item = function item(index) {
            return this[index];
        };

        function NamedNodeMap() {};

        NamedNodeMap.prototype = new BaseArray;
        this.NamedNodeMap = NamedNodeMap;

        NamedNodeMap.prototype.item = function item(index) {
            return this[index];
        };

        NamedNodeMap.prototype.getNamedItem = function getNamedItem(name) {
            for (var i = 0; i < this.length; i++) {
                if (this[i].nodeName == name) {
                    return this[i];
                };
            };
            return undefined;
        };

        NamedNodeMap.prototype.setNamedItem = function setNamedItem(arg) {
            // this should generate exceptions, but I'm not sure when...
            // XXX how 'bout when arg is not the proper type?!?
            for (var i = 0; i < this.length; i++) {
                if (this[i].nodeName == arg.nodeName) {
                    this[i] = arg;
                    return;
                };
            };
            this.push(arg);
        };

        NamedNodeMap.prototype.removeNamedItem = function removeNamedItem(name) {
            // a bit nasty: deleting an element from an array will not actually 
            // free the index, instead something like undefined or null will end 
            // up in its place, so we walk the array here, move every element 
            // behind the item to remove one up, and pop the last item when 
            // we're done
            var delete_mode = false;
            for (var i = 0; i < this.length; i++) {
                if (this[i] === name) {
                    delete_mode = true;
                };
                if (delete_mode) {
                    this[i] = this[i + 1];
                };
            };
            if (!delete_mode) {
                throw (
                    (new DOMException(DOMException.NOT_FOUND_ERR))
                );
            };
            // the last element is now in the array twice
            this.pop();
        };
    }();

    // XXX shouldn't we make these local?
    function createStack() {
        // somewhat nasty trick to get a stack trace in Moz
        var stack = undefined;
        try {
            notdefined()
        } catch (e) {
            stack = e.stack
        };
        if (stack) {
            stack = stack.split('\n');
            stack.shift();
            stack.shift();
        };
        return stack ? stack.join('\n') : '';
    };

    function getLineNo(stack) {
        /* tries to get the line no in Moz */
        if (!stack) {
            return;
        };
        stack = stack.toString().split('\n');
        var chunks = stack[0].split(':');
        var lineno = chunks[chunks.length - 1];
        if (lineno != '0') {
            return lineno;
        };
    };

    function getFileName(stack) {
        /* tries to get the filename in Moz */
        if (!stack) {
            return;
        };
        stack = stack.toString().split('\n');
        var chunks = stack[0].split(':');
        var filename = chunks[chunks.length - 2];
        return filename;
    };

    return this.dommer
})