// models/Report.js
const mongoose = require('mongoose');



const attendanceSchema = new mongoose.Schema({
  date: String,
  status: String,
  checkInTime: String,
  checkOutTime: String,
});

// Schema for a child
const childSchema = new mongoose.Schema({
  name: String,
  identifier: String,
  attendanceRecords: [attendanceSchema],
});
const child = mongoose.model('Report', childSchema);

module.exports = child;
