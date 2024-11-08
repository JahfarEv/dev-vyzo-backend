// const mongoose = require("mongoose");

// const patientSchema = new mongoose.Schema(
//   {
//     name: { type: String, default: "NA" },
//     mobileNumber: { type: String },
//     remarks: { type: String },
//     doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
//     tokenNo: { type: Number, required: true },
//     createdAt: {
//       type: Date,
//       default: Date.now(),
//     },
//   },
//   { timestamps: true }
// ); // Enable timestamps

// const patientModel = mongoose.model("Patient", patientSchema);
// module.exports = patientModel;


const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, default: "NA" },
    mobileNumber: { type: String },
    remarks: { type: String },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor" },
    tokenNo: { type: Number, required: true }
  },
  { timestamps: true } // Mongoose will add createdAt and updatedAt automatically
);

const patientModel = mongoose.model("Patient", patientSchema);
module.exports = patientModel;
