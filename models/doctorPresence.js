
const mongoose = require("mongoose");

const DoctorPresenceSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctors',
      required: true
    },
    date: {  //  in the format of DD/MM/YYYY
      type: String,
      required: true
    },
    inTime: {
      type: String,
      required: false
    },
    breaks: [
      {
        startTime: {
          type: String,
          required: false
        },
        endTime: {
          type: String,
          required: false
        },
        estimatedTime: {
          type: Number, // in minutes 
          required: false
        },
        reason: {
          type: String,
          required: false
        }
      }
    ],
    outTime: {
      type: String,
      required: false
    },
   
  },
  {
    timestamps: true,
    minimize: false
  }
);

module.exports = mongoose.model("DoctorPresence", DoctorPresenceSchema);
