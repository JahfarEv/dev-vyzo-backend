
const mongoose = require("mongoose");

const DoctorSchema = new mongoose.Schema(
  {
    unitId: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    key: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true
    },
    hospital: {
      type: String,
      required: true
    },
    place: {
      type: String,
      required: true
    },
    contactNo: {
      type: Number
    },
    department: {
      type: String,
    },
    workingHoursStarting: {
      type: String,
      required: false
    },
    workingHoursEnding: {
      type: String,
      required: false
    },
    totalTokensPerDay: {
      type: Number,
      required: false,
    },
    patientDetails: {
      type: Boolean,
      default: true
    },
    recallAfter: {
      type: Number,
      required: false,
    },
    qrImage: {
      type: String,
      required: false,
    },
    tokenStatus: {
      type: Boolean,
      default: true  // Set default value to true
    },
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Doctors", DoctorSchema);
