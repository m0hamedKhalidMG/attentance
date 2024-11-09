const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const Attendance =require('./attendancechild')
const childSchema = new Schema({
  name: { type: String, required: true },
  identifier: { type: String, required: true },
});
module.exports = mongoose.model('child', childSchema);
