const mongoose = require("mongoose");

// const patientSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//   },
//   mobileNumber: {
//     type: String,
//     required: true,
//     unique: true, // Ensure the mobile number is unique
//   },
//   remarks: {
//     type: String,
//     default: "",
//   }, // Optional field for remarks

//   doctor: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Doctors", // Reference to Doctor model
//     required: true,
//   },
//   tokenNo: { type: Number, required: true }, // Add tokenNo field
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });


const patientSchema = new mongoose.Schema({
  name: { type: String, default: "NA" },
  mobileNumber: { type: String },
  remarks: { type: String },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  tokenNo: { type: Number, required: true },
});


const patientModel = mongoose.model("Patient", patientSchema);
module.exports = patientModel;
