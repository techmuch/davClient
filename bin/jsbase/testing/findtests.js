var filepath = %r;
load(filepath);

var global = this;
global.findtests = new function() {
    var findtests = this;

    var Collector = this.Collector = function(module) {
        if (module !== undefined) {
            this.module = module;
        };
    };

    Collector.prototype.collect = function() {
        var tests = [];
        for (var attr in this.module) {
            if (attr.indexOf('test_') == 0) {
                tests.push(attr);
            };
        };
        return tests;
    };

    this.initialize = function() {
        var collector = new Collector(global);
        var tests = collector.collect();
        for (var i=0; i < tests.length; i++) {
            print(tests[i]);
        };
    };
}();

if ('%s' == '__main__') {
    findtests.initialize();
};
