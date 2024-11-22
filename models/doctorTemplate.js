const mongoose = require("mongoose");

const DoctorTemplateSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctors",
      required: true,
    },
    consultationTime: {
      type: Number, // Default time for future slots
      required: true,
      default: 15,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DoctorTemplates", DoctorTemplateSchema);
