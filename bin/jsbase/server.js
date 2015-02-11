/*****************************************************************************
 *
 * Copyright (c) 2004-2007 Guido Wesdorp. All rights reserved.
 *
 * This software is distributed under the terms of the JSBase
 * License. See LICENSE.txt for license text.
 *
 *****************************************************************************/

if (!this.jsbase) {
    this.jsbase = {};
};
this.jsbase.server = this.server = new function jsbase_server() {
    /* helper functions to communicate with the server 

        'AJAX' like helper stuff
    */
    
    var server = this;
    
    this.getXHR = this.getXMLHttpRequest = function getXMLHttpRequest() {
        try{
            return new XMLHttpRequest();
        } catch(e) {
            // not a Mozilla or Konqueror based browser
        };
        try {
            try {
                return new ActiveXObject('Microsoft.XMLHTTP');
            } catch(e) {
                return new ActiveXObject('Msxml2.XMLHTTP');
            };
        } catch(e) {
            // not IE either...
        };
        return undefined;
    };

    var Module = this._Module = function Module(name, code) {
        this.name = name;
        this._code = code;
        eval(code);
    };

    Module.prototype.toString = function toString() {
        return "[Module '" + this.name + "']";
    };

    Module.prototype.toSource = function toSource() {
        return this._code;
    };

    this.load_async = function load_async(path, callback, errback, data,
                                          headers, method) {
        /* load data from a path/url

            on successful load <callback> is called with arguments 'status',
            'content' and 'XMLdoc' (if appropriate), on error <errback>
            with 'status' and 'content'
        */
        if (!errback) {
            errback = callback;
        };
        if (!method) {
            if (data) {
                method = 'POST';
            } else {
                method = 'GET';
            };
        };
        var xhr = this.getXHR();
        xhr.open(method, path, true);
        var handler = function() {
            if (xhr.readyState == 4) {
                if (xhr.status != 200 && xhr.status != 204 &&
                        (method != 'PUT' || xhr.status != 201)) {
                    errback(xhr.status, xhr.responseText);
                    return;
                };
                callback(xhr.status, xhr.responseText, xhr.responseXML);
            };
        };
        xhr.onreadystatechange = handler;
        if (headers) {
            for (var name in headers) {
                xhr.setRequestHeader(name, headers[name]);
            };
        };
        if (!data) {
            data = '';
        };
        xhr.send(data);
    };
    
    this._load_sync = function(path, data, headers, method) {
        var xhr = this.getXHR();
        if (!method) {
            if (data) {
                method = 'POST';
            } else {
                method = 'GET';
            };
        };
        xhr.open(method, path, false);
        if (headers) {
            for (var name in headers) {
                xhr.setRequestHeader(name, headers[name]);
            };
        };
        if (!data) {
            data = '';
        };
        xhr.send(data);
        if (xhr.status != 200 && xhr.status != 204 &&
                (method != 'PUT' || xhr.status != 201)) {
            if (global.exception) {
                throw(new exception.HTTPError(xhr.status));
            } else {
                throw(xhr.status);
            };
        };
        return [xhr.responseText, xhr.responseXML];
    };

    this.load_sync = function(path, data, headers, method) {
        return this._load_sync(path, data, headers, method)[0];
    };

    this.load_dom_sync = function(path, data, headers, method) {
        return this._load_sync(path, data, headers, method)[1];
    };
    
    this.import_async = function(name, path, errback) {
        /* import a JS 'module' asynchronous

            'name' is the name the module will be available under, 
            'path' is the path to the object (must be on the same server),
            'errback' is an (optional) error handling function

            NOTE: in a module, only variables attached to 'this' on the module
            root level are exposed
        */
        var handler = function(status, data) {
            var module = new Module(name, data);
            window[name] = module;
        };
        this.load_data(path, handler, errback);
    };

    this.import_sync = function(path) {
        return new Module('<unknown>', this.load_sync(path));
    };
}();
