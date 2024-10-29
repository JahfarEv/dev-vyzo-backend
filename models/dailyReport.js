const mongoose = require("mongoose");

const DailyReportSchema = new mongoose.Schema(
  {
    tokenNo: { type: Number, required: true },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctors",
      required: true,
    },
    date: { type: String, required: true },
    fileArrive: { type: Boolean, required: true },
    orderNumber: { type: Number, required: true },
    consultationTime: { type: Number, required: true },
    tokenStatus: { type: String, required: true },
    startingTime: { type: String },
    endingTime: { type: String },
    breaks: [
      {
        startTime: { type: String },
        endTime: { type: String },
        estimatedTime: { type: Number, required: false },
        reason: { type: String, required: false },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("DailyReport", DailyReportSchema);
