const express = require('express');
const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// @route POST /api/transactions -> add a transaction (You Gave / You Got)
router.post('/', async (req, res) => {
  try {
    const { customerId, type, amount, rate, rateType, interestType, date, returnDate, note } = req.body;

    if (!customerId || !type || amount === undefined) {
      return res.status(400).json({ message: 'customerId, type and amount are required' });
    }
    if (!['gave', 'got'].includes(type)) {
      return res.status(400).json({ message: "type must be 'gave' or 'got'" });
    }

    const customer = await Customer.findOne({ _id: customerId, user: req.userId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const transaction = await Transaction.create({
      user: req.userId,
      customer: customerId,
      type,
      amount: Number(amount),
      rate: rate ? Number(rate) : 0,
      rateType: rateType === 'yearly' ? 'yearly' : 'monthly',
      interestType: interestType === 'compound' ? 'compound' : 'simple',
      date: date ? new Date(date) : new Date(),
      returnDate: returnDate ? new Date(returnDate) : undefined,
      note: note || ''
    });

    res.status(201).json({ transaction });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating transaction' });
  }
});

// @route GET /api/transactions/customer/:customerId -> list transactions for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const transactions = await Transaction.find({
      customer: req.params.customerId,
      user: req.userId
    }).sort({ date: -1 });
    res.json({ transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching transactions' });
  }
});

// @route PUT /api/transactions/:id -> update a transaction
router.put('/:id', async (req, res) => {
  try {
    const { amount, rate, rateType, interestType, date, returnDate, note } = req.body;
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      {
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(rate !== undefined && { rate: Number(rate) }),
        ...(rateType && { rateType }),
        ...(interestType && { interestType }),
        ...(date && { date: new Date(date) }),
        ...(returnDate && { returnDate: new Date(returnDate) }),
        ...(note !== undefined && { note })
      },
      { new: true, runValidators: true }
    );
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ transaction });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating transaction' });
  }
});

// @route DELETE /api/transactions/:id -> delete a transaction
router.delete('/:id', async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting transaction' });
  }
});

module.exports = router;