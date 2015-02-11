var global = this;
global.domlib = new function domlib() {
    /* DOM helper functionality */
    var domlib = this;

    // the following three functions are HTML specific, but it seemed to make
    // sense to put them here anyway...
    domlib.hasClass = function hasClass(node, classname) {
        if (!node.className) {
            return false;
        };
        var classnames = node.className.split(' ');
        for (var i=0; i < classnames.length; i++) {
            if (classnames[i] == classname) {
                return true;
            };
        };
        return false;
    };

    domlib.addClass = function addClass(node, classname) {
        if (domlib.hasClass(node, classname)) {
            return;
        };
        if (!node.className) {
            node.className = classname;
        } else {
            node.className += ' ' + classname;
        };
    };

    domlib.removeClass = function removeClass(node, classname) {
        if (!node.className || !domlib.hasClass(node, classname)) {
            var msg = 'class ' + classname + ' not in ' + node.className;
            if (global.testing) {
                throw new testing.AssertionError(msg);
            } else {
                throw msg;
            };
            return;
        };
        var classnames = node.className.split(' ');
        var newclassnames = [];
        for (var i=0; i < classnames.length; i++) {
            var cn = classnames[i];
            if (cn != classname) {
                newclassnames.push(cn);
            };
        };
        node.className = newclassnames.join(' ');
    };

    domlib.toXML = function toXML(node, nonsingletonels, ns2p, p2ns) {
        /* convert a node to an XML string

            ns2prefix is used internally to determine when xmlns attrs should
            be generated
        */
        var displayxmlline = false;
        if (node.nodeType == 9) {
            node = node.documentElement;
            displayxmlline = true;
        };
        if (!ns2p && !p2ns) {
            ns2p = {};
            p2ns = {};
        } else if (!ns2p) {
            ns2p = {};
            for (var p in p2ns) {
                ns2p[p2ns[p]] = p;
            };
        } else if (!p2ns) {
            p2ns = {};
            for (var ns in ns2p) {
                p2ns[ns2p[ns]] = ns;
            };
        };
        // clone ns2p and p2ns for this layer
        var newns2p = {};
        for (var ns in ns2p) {
            newns2p[ns] = ns2p[ns];
        };
        ns2p = newns2p;

        var newp2ns = {};
        for (var p in p2ns) {
            newp2ns[p] = p2ns[p];
        };
        p2ns = newp2ns;
        var ret;
        if (node.nodeType == 3) {
            ret = string.entitize(node.nodeValue);
        } else if (node.nodeType == 8) {
            ret = '<!--' + node.nodeValue + '-->';
        } else if (node.nodeType == 1) {
            ret = _nodeToXML(node, nonsingletonels, ns2p, p2ns);
        };
        if (displayxmlline) {
            ret = '<?xml version="1.0" ?>\n' + ret;
        };
        return ret;
    };

    domlib.getTextFromNode = function(node) {
        var text = '';
        for (var i=0; i < node.childNodes.length; i++) {
            var child = node.childNodes[i];
            if (child.nodeType == 1) {
                text += ' ' + domlib.getTextFromNode(child);
            } else if (child.nodeType == 3) {
                text += ' ' + child.nodeValue;
            };
        };
        return string.strip(string.reduceWhitespace(text));
    };

    domlib.replaceContent = function replaceContent(node) {
        while (node.hasChildNodes()) {
            node.removeChild(node.lastChild);
        };
        for (var i=1; i < arguments.length; i++) {
            node.appendChild(arguments[i]);
        };
    };

    domlib.getElementsByClassName =
            function getElementsByClassName(node, className) {
        if (node.getElementsByClassName) {
            return node.getElementsByClassName(className);
        };
        var els = node.getElementsByTagName('*');
        var ret = [];
        for (var i=0; i < els.length; i++) {
            var el = els[i];
            var classes = el.className ? el.className.split(' ') : [];
            if (array.indexOf(classes, className) > -1) {
                ret.push(el);
            };
        };
        return ret;
    };

    _nodeToXML = function _nodeToXML(node, nonsingletonels, ns2p, p2ns) {
        var ns = node.namespaceURI;
        var prefix = null;
        var localname = node.nodeName;
        var newElemNS = false;

        // split the localname of the element if needed
        if (localname.indexOf(':') > -1) {
            prefix = localname.split(':')[0];
            localname = localname.split(':')[1];
        };

        // if the element is namespaced, try to find a prefix by either
        // checking if the namespace has already been declared in another
        // node, and using that, or by picking the prefix which normally
        // would be used
        if (ns) {
            if (ns2p[ns]) {
                prefix = ns2p[ns];
            } else {
                newElemNS = true;
                if (!prefix) {
                    prefix = '__default__';
                };
            };
        };

        // find new namespaces in the current attributes
        var newnsandp = _scanAttrs(node, ns2p, p2ns);
        var newns2p = newnsandp[0];
        var newp2ns = newnsandp[1];
        // and add the element ns to that list if it is new
        if (newElemNS) {
            newns2p[ns] = prefix;
            newp2ns[prefix] = ns;
        };

        // find out what the default namespace for the current context is
        var defaultns = null;
        if (newp2ns['__default__']) {
            defaultns = newp2ns['__default__'];
        } else if (p2ns['__default__']) {
            defaultns = p2ns['__default__'];
        };

        // and if it is used on an attribute, change the prefix for that
        // namespace by a newly invented prefix
        if (defaultns && _scanAttrsForDefNS(node, defaultns)) {
            var defprefix = _inventPrefix(p2ns, defaultns);
            if (newp2ns['__default__']) {
                newp2ns[defprefix] = newp2ns['__default__'];
                newns2p[defaultns] = defprefix;
                newp2ns['__default__'] = null;
            } else {
                newp2ns[defprefix] = p2ns['__default__'];
                newns2p[defaultns] = defprefix;
                ns2p[defaultns] = undefined
                p2ns['__default__'] = undefined;
            }
        };

        // merge the current and new ns2p/p2ns lists
        _mergeNS(ns2p, p2ns, newns2p, newp2ns);

        // the current element's prefix might have changed (because of
        // scanAttrsForDefNS, update prefix anyways
        if (ns) {
            prefix = ns2p[ns];
        };

        // start constructing the returned string
        var ret = '<';
        if (prefix && prefix != '__default__') {
            ret += prefix + ':';
        };
        ret += localname;
        ret += _handleNewNS(newp2ns);
        ret += _handleAttributes(node, ns2p, p2ns);

        var childcontent = '';
        for (var i=0; i < node.childNodes.length; i++) {
            childcontent += domlib.toXML(node.childNodes[i],
                                         nonsingletonels, ns2p, p2ns);
        };
        if (childcontent || nonsingletonels == '*' ||
                (nonsingletonels && nonsingletonels.length > 0 &&
                 array.indexOf(nonsingletonels, node.nodeName) > -1)) {
            ret += '>' + childcontent + '</';
            if (prefix && prefix != '__default__') {
                ret += prefix + ':';
            };
            ret += localname + '>';
        } else {
            ret += ' />';
        };
        return ret;
    };

    _scanAttrs = function _scanAttrs(node, ns2p, p2ns) {
        // scan the attributes of the element for namespaces and prefixes
        var newp2ns = {};
        var newns2p = {};
        for (var i=0; i < node.attributes.length; ++i) {
            var attr = node.attributes[i];
            var ns = attr.namespaceURI;
            if (ns == 'http://www.w3.org/2000/xmlns/') {
                var name = attr.nodeName;
                var prefix = '__default__';
                ns = attr.nodeValue;
                if (name.indexOf(':') > -1) {
                    prefix = name.split(':')[1];
                }
                if (p2ns[prefix]) {
                    if (p2ns[prefix] == ns) {
                        // warn because a redundant ns decl has been found
                        continue;
                    };
                };
                newp2ns[prefix] = ns;
                newns2p[ns] = prefix;
            };
        };
        for (var i=0; i < node.attributes.length; ++i) {
            var attr = node.attributes[i];
            var ns = attr.namespaceURI;
            if (!ns) { continue; };
            if (ns == 'http://www.w3.org/2000/xmlns/') { continue; };
            if (ns == 'http://www.w3.org/XML/1998/namespace') { continue; };
            if (ns2p[ns]) { continue; };

            var prefix = ''
            if (attr.nodeName.split(':') > -1) {
                prefix = attr.nodeName.split(':')[0];
                if (p2ns[prefix] && p2ns[prefix]!=ns) {
                    prefix = _inventPrefix(p2ns, ns);
                } else {
                    continue;
                };
            } else {
                prefix = _inventPrefix(p2ns, ns);
            };

            newns2p[ns] = prefix;
            newp2ns[prefix] = ns;
        };

        return [newns2p, newp2ns];
    };

    _mergeNS = function _mergeNS(ns2p, p2ns, newns2p, newp2ns) {
        // merge the new* into ns2p/p2ns
        for (var ns in newns2p) {
            var prefix = newns2p[ns];
            ns2p[ns] = prefix;
            p2ns[prefix] = ns;
        };
    };

    _scanAttrsForDefNS = function _scanAttrsForDefNS(node, defaultns) {
        // check if defaultns is used as the attribute of any namespace,
        // which is a Problem
        if (defaultns) {
            for (var i=0; i < node.attributes.length; ++i) {
                attr = node.attributes[i];
                if (attr.namespaceURI == defaultns) {
                    return true;
                };
            };
        };
        return false;
    };


    _handleNewNS = function _handleNewNS(p2ns) {
        // return stringified xmlns attributes
        var ret = '';
        for (var p in p2ns) {
            if (!p2ns[p]) {
                continue;
            };
            ret += ' xmlns'
            if (p && p != '__default__') {
                ret += ':' + p;
            };
            ret += '="' + string.entitize(p2ns[p]) + '"';
        };
        return ret;
    };

    _handleAttributes = function _handleAttributes(node, ns2p, p2ns) {
        // accepts a node and outputs the stringified attributes of it
        var ret = '';
        for (var i=0; i < node.attributes.length; i++) {
            var attr = node.attributes[i];
            var ns = attr.namespaceURI;
            if (ns == 'http://www.w3.org/2000/xmlns/') {
                continue;
            } else {
                var prefix = null;
                if (ns) {
                    if (ns == 'http://www.w3.org/XML/1998/namespace') {
                        prefix = 'xml';
                    } else {
                        prefix = ns2p[ns];
                    };
                };
                var localname = attr.nodeName;
                if (localname.indexOf(':') > -1) {
                    if (!ns) {
                        prefix = localname.split(':')[0];
                    };
                    localname = localname.split(':')[1];
                };

                ret += ' ';
                if (prefix) {
                    ret += prefix + ':';
                };
                ret += localname + '="' + string.entitize(attr.nodeValue) + '"';
            };
        };
        return ret;
    };

    _inventPrefix = function _inventPrefix(p2ns, ns) {
        // invent a new prefix; reserve it in the prefix space
        var aprefix = '';
        var j = 0;
        while (true) {
            aprefix = 'ns' + j;
            if (!p2ns[aprefix] || p2ns[aprefix] == ns) {
                break;
            };
            j++;
        };
        p2ns[aprefix] = ns;
        return aprefix;
    };
}();
