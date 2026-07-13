const mongoose = require('mongoose');

// A single deposit made against a transaction — either paying down the
// capital (principal) or paying off accrued interest.
const paymentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['capital', 'interest'], required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

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
    note: { type: String, trim: true, default: '' },
    payments: { type: [paymentSchema], default: [] } // capital/interest deposits made against this loan
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);