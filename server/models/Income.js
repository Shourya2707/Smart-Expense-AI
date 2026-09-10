const mongoose = require("mongoose");

const IncomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be greater than 0"],
    },
    source: {
      type: String,
      required: [true, "Source is required"],
      enum: ["Salary", "Freelancing", "Business", "Investments", "Gift", "Other"],
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Income", IncomeSchema);
