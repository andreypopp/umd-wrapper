var umd       = require('umd');
var derequire = require('derequire');
var through   = require('through');

module.exports = function(w, opts) {
  var global = opts.global;

  if (!global) {
    return w.throw('provide --umd-wrapper-global GLOBAL option');
  }

  // XXX: add check for more than a single entry point

  var main;

  w.depTransform(function() {
    return through(
      function(row) {
        // XXX: This is wrong, we get module's id before packer and so get a
        // filename and not a real integer id
        if (row.entry) main = main || row.id;
        this.queue(row);
      }, function() {
        this.queue(null);
      });
  });

  w.bundleTransform(function() {
    var buffer = '';
    var hijack = through(
      function(chunk) { buffer += chunk; },
      function() {
        try {
          this.queue(derequire(buffer));
          this.queue(
              '\n(' + JSON.stringify(main) + ')'
              + umd.postlude(global)
          );
          this.queue(null);
        } catch (err) {
          this.throw(err);
        }
      });
    hijack.write(umd.prelude(global).trim() + 'return ');
    return hijack;
  });
}
