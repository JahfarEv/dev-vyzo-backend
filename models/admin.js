const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Admins", AdminSchema);