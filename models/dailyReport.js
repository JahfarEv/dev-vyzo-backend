// const mongoose = require('mongoose');

// const dailyReportSchema = new mongoose.Schema({
//   doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }, // Reference to Doctor
//   tokenNo: Number,
//   orderNumber: Number,
//   consultationTime: Number,
//   tokenStatus: String,
//   startingTime: String,
//   endingTime: String,
//   fileArrive: Boolean,
//   date: String, // You can save the date as a string or use `Date`
//   createdAt: Date,
//   updatedAt: Date,
// });

// const DailyReportModel = mongoose.model('DailyReport', dailyReportSchema);

// module.exports = DailyReportModel;


const mongoose = require('mongoose');

const DailyReportSchema = new mongoose.Schema({
  tokenNo: { type: Number, required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctors', required: true },
  date: { type: String, required: true },
  fileArrive: { type: Boolean, required: true },
  orderNumber: { type: Number, required: true },
  consultationTime: { type: Number, required: true },
  tokenStatus: { type: String, required: true },
  startingTime: { type: String, },
  endingTime: { type: String,  },
  breaks: [
    {
      startTime: { type: String,  },
      endTime: { type: String,  },
      estimatedTime: { type: Number, required: false },
      reason: { type: String, required: false }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('DailyReport', DailyReportSchema);
