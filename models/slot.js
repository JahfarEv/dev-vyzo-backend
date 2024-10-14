const mongoose = require("mongoose");

const SlotSchema = new mongoose.Schema(
  {
    tokenNo: {
      type: Number,
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctors',
      required: true
    },
    date: {  //  in the format of DD/MM/YYYY
      type: String,
      required: true
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
    startingTime: {
      type: String,
      required: false
    },
    endingTime: {
      type: String,
      required: false
    },
    
  },
  {
    timestamps: true,
    minimize: false
  },
  
);
SlotSchema.index({ doctor: 1, date: 1, tokenNo: 1 }, { unique: true });


module.exports = mongoose.model("Slots", SlotSchema);
