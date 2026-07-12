const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    type: { type: String, enum: ['gave', 'got'], required: true }, // 'gave' = you lent money, 'got' = you received money
    amount: { type: Number, required: true, min: 0 },
    rate: { type: Number, default: 0, min: 0 }, // interest rate in %
    rateType: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    interestType: { type: String, enum: ['simple', 'compound'], default: 'simple' },
    date: { type: Date, required: true, default: Date.now }, // transaction / loan start date
    returnDate: { type: Date }, // expected/actual return date, optional
    note: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);