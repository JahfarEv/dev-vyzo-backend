const mongoose = require("mongoose");

// const SlotSchema = new mongoose.Schema({
//   tokenNo: {
//     type: Number,
//     required: true,
//   },
//   doctor: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Doctors',
//     required: true,
//   },
//   date: { // in the format of DD/MM/YYYY
//     type: String,
//     required: true,
//   },
//   fileArrive: {
//     type: Boolean,
//     required: true,
//     default: false,
//   },
//   orderNumber: {
//     type: Number,
//     required: true,
//   },
//   consultationTime: { // New field for consultation time
//     type: Number, //rashid sugest type is string
//     default:15,
//   },
//   startingTime: {
//     type: String,
//     required: false,
//   },
//   endingTime: {
//     type: String,
//     required: false,
//   },
  
// tokenStatus: { // New field for token status
//     type: Boolean,
//     default:false
//   },
//   completed: { 
//     type: Boolean, 
//     required: true,
//     default: false,
//    },

// }, {
//   timestamps: true,
//   minimize: false,
// });

// SlotSchema.index({ doctor: 1, date: 1, tokenNo: 1 }, { unique: true });



// module.exports = mongoose.model("Slots", SlotSchema);


const SlotSchema = new mongoose.Schema({
  tokenNo: {
    type: Number,
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctors",
    required: true,
  },
  date: {
    type: String, // Format: DD/MM/YYYY
    required: true,
  },
  fileArrive: {
    type: Boolean,
    required: true,
    default: false,
  },
  orderNumber: {
    type: Number,
    required: true,
  },
  consultationTime: {
    type: Number,
    default: 15,
  },
  startingTime: {
    type: String,
    required: false,
  },
  endingTime: {
    type: String,
    required: false,
  },
  tokenStatus: {
    type: Boolean,
    default: false,
  },
  completed: {
    type: Boolean,
    required: true,
    default: false,
  },
}, {
  timestamps: true,
  minimize: false,
});

// Index to prevent duplicate tokens for a doctor on the same day
SlotSchema.index({ doctor: 1, date: 1, tokenNo: 1 }, { unique: true });

// Middleware for findOneAndUpdate
SlotSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();
  if (update && update.$set && update.$set.completed === true) {
    this.setUpdate({
      ...update,
      $set: {
        ...update.$set,
        endingTime: moment().format("hh:mm:ss"), // Set current time
      },
    });
  }
  next();
});

// Middleware for updateMany
SlotSchema.pre("updateMany", async function (next) {
  const update = this.getUpdate();
  if (update && update.$set && update.$set.completed === true) {
    this.setUpdate({
      ...update,
      $set: {
        ...update.$set,
        endingTime: moment().format("hh:mm:ss"), // Set current time
      },
    });
  }
  next();
});

module.exports = mongoose.model("Slots", SlotSchema);
