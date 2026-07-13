const express = require('express');
const Customer = require('../models/Customer');
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');
const {
  computeTotals,
  calculateAccruedInterest,
  getRemainingCapital,
  getTotalInterestPaid
} = require('../utils/interest');

const router = express.Router();
router.use(auth);

// @route GET /api/customers  -> list all customers of logged-in user with totals
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find({ user: req.userId }).sort({ createdAt: -1 });
    const transactions = await Transaction.find({ user: req.userId });

    const byCustomer = {};
    transactions.forEach((t) => {
      const key = t.customer.toString();
      if (!byCustomer[key]) byCustomer[key] = [];
      byCustomer[key].push(t);
    });

    const result = customers.map((c) => {
      const totals = computeTotals(byCustomer[c._id.toString()] || []);
      return {
        _id: c._id,
        name: c.name,
        email: c.email,
        mobile: c.mobile,
        address: c.address,
        createdAt: c.createdAt,
        ...totals
      };
    });

    const overall = result.reduce(
      (acc, c) => {
        acc.gave += c.gave;
        acc.got += c.got;
        acc.gaveInterest += c.gaveInterest;
        acc.gotInterest += c.gotInterest;
        acc.gavePrincipal += c.gavePrincipal;
        acc.gotPrincipal += c.gotPrincipal;
        return acc;
      },
      { gave: 0, got: 0, gaveInterest: 0, gotInterest: 0, gavePrincipal: 0, gotPrincipal: 0 }
    );

    res.json({ customers: result, overall });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching customers' });
  }
});

// @route POST /api/customers -> add a new customer
router.post('/', async (req, res) => {
  try {
    const { name, email, mobile, address } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    const customer = await Customer.create({
      user: req.userId,
      name: name.trim(),
      email: (email || '').trim(),
      mobile: (mobile || '').trim(),
      address: (address || '').trim()
    });

    res.status(201).json({ customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating customer' });
  }
});

// @route GET /api/customers/report?period=weekly|monthly|yearly
// Must be defined BEFORE /:id so Express doesn't treat "report" as a customer id.
router.get('/report', async (req, res) => {
  try {
    const period = ['weekly', 'monthly', 'yearly'].includes(req.query.period)
      ? req.query.period
      : 'monthly';

    const now = new Date();
    const from = new Date(now);
    if (period === 'weekly') from.setDate(now.getDate() - 7);
    else if (period === 'yearly') from.setFullYear(now.getFullYear() - 1);
    else from.setMonth(now.getMonth() - 1);

    const customers = await Customer.find({ user: req.userId });

    // Include a transaction if it was CREATED in this period, OR if any
    // capital/interest payment was made against it during this period.
    // Without the second condition, a deposit made today on an old
    // transaction would never show up in the report.
    const transactionDocs = await Transaction.find({
      user: req.userId,
      $or: [{ date: { $gte: from, $lte: now } }, { 'payments.date': { $gte: from, $lte: now } }]
    }).sort({ date: -1 });

    const byCustomer = {};
    transactionDocs.forEach((t) => {
      const key = t.customer.toString();
      if (!byCustomer[key]) byCustomer[key] = [];
      byCustomer[key].push(t);
    });

    const customerRows = customers
      .map((c) => {
        const list = byCustomer[c._id.toString()] || [];
        const totals = computeTotals(list, now);
        return {
          customerId: c._id,
          name: c.name,
          email: c.email,
          mobile: c.mobile,
          transactionCount: list.length,
          ...totals
        };
      })
      .filter((c) => c.transactionCount > 0);

    const overall = customerRows.reduce(
      (acc, c) => {
        acc.gavePrincipal += c.gavePrincipal;
        acc.gotPrincipal += c.gotPrincipal;
        acc.gaveInterest += c.gaveInterest;
        acc.gotInterest += c.gotInterest;
        acc.gave += c.gave;
        acc.got += c.got;
        return acc;
      },
      { gavePrincipal: 0, gotPrincipal: 0, gaveInterest: 0, gotInterest: 0, gave: 0, got: 0 }
    );
    overall.balance = overall.gave - overall.got;

    const transactions = transactionDocs.map((t) => {
      const customerDoc = customers.find((c) => c._id.toString() === t.customer.toString());
      const obj = t.toObject();

      const remainingCapital = getRemainingCapital(t);
      const capitalPaid = Number(t.amount) - remainingCapital;
      const interestPaid = getTotalInterestPaid(t);

      obj.interest = calculateAccruedInterest(t, now);
      obj.customerName = customerDoc ? customerDoc.name : 'Unknown';
      obj.remainingCapital = remainingCapital;
      obj.capitalPaid = capitalPaid;
      obj.interestPaid = interestPaid;

      // Payments (deposits) made specifically within this report's date window,
      // so the PDF can show what actually happened during the period.
      obj.paymentsInPeriod = (t.payments || []).filter((p) => {
        const d = new Date(p.date);
        return d >= from && d <= now;
      });

      return obj;
    });

    res.json({
      period,
      from,
      to: now,
      overall,
      customers: customerRows,
      transactions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error generating report' });
  }
});

// @route GET /api/customers/:id -> customer detail + transactions + totals
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, user: req.userId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    const transactionDocs = await Transaction.find({ customer: customer._id, user: req.userId }).sort({
      date: -1
    });

    const totals = computeTotals(transactionDocs);

    // Attach a computed "interest" field to each transaction so the frontend
    // never has to duplicate the monthly/yearly calculation logic.
    const transactions = transactionDocs.map((t) => {
      const obj = t.toObject();
      obj.interest = calculateAccruedInterest(t);
      return obj;
    });

    res.json({ customer, transactions, totals });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching customer' });
  }
});

// @route PUT /api/customers/:id -> update customer
router.put('/:id', async (req, res) => {
  try {
    const { name, email, mobile, address } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { name, email, mobile, address },
      { new: true, runValidators: true }
    );
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ customer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating customer' });
  }
});

// @route DELETE /api/customers/:id -> delete customer + their transactions
router.delete('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    await Transaction.deleteMany({ customer: customer._id, user: req.userId });
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting customer' });
  }
});

module.exports = router;