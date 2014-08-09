var mongoose     = require('mongoose');
var Schema       = mongoose.Schema;

var Myo = new Schema({
name: String
});

module.exports = mongoose.model('Myo', Myo);
