const mongoose = require("mongoose");
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const Attendance =require('./attendancechild')
const childSchema = new Schema({
  name: { type: String, required: true },
  identifier: { type: String, required: true },
});
const parentSchema = new Schema({
 
  parentName: { type: String, required: true },
  password: { type: String, required: true },
  children: [childSchema],
  attendances: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }],

});


module.exports = mongoose.model('Parent', parentSchema);

