
// Polyfill for string format...
if (!String.prototype.format) {
    String.prototype.format = function (data) {
        return this.replace(/{(\w+)}/g, function (match, key) {
            return typeof data[key] != 'undefined'
                ? data[key]
                : match
                ;
        });
    };
}