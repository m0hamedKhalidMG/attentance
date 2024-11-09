// models/Attendance.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Parent =require('./Parent')
const child =require('./child')

// Attendance schema
const attendanceSchema = new Schema(
  {

        parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true },
            childId: { type: mongoose.Schema.Types.ObjectId, ref: 'child', required: true },  // Reference to the child

        date: { type: Date, required: true },
        status: { type: String, required: true }, // e.g., حضر, لم يحضر
        entryTime: { type: String },  // Format: HH:mm
        exitTime: { type: String },   // Format: HH:mm
      },
      { timestamps: true }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
