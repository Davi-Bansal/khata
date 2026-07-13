// ---- Payment helpers -------------------------------------------------

function getSortedCapitalPayments(transaction) {
  return (transaction.payments || [])
    .filter((p) => p.type === 'capital')
    .map((p) => ({ amount: Number(p.amount), date: new Date(p.date) }))
    .sort((a, b) => a.date - b.date);
}

function getTotalInterestPaid(transaction) {
  return (transaction.payments || [])
    .filter((p) => p.type === 'interest')
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

// How much of the original capital is still outstanding, after capital deposits.
function getRemainingCapital(transaction) {
  const capitalPaid = getSortedCapitalPayments(transaction).reduce((sum, p) => sum + p.amount, 0);
  const remaining = Number(transaction.amount) - capitalPaid;
  return remaining > 0 ? remaining : 0;
}

// ---- Interest calculation ----------------------------------------------
//
// Interest accrues on the outstanding principal. Whenever a capital payment
// is made, the principal used for interest calculation from that date onward
// drops accordingly (reducing-balance method) — this mirrors the "Remaining
// Balance" behaviour shown in the app's Entry Details screen.
//
// Simple interest per segment:   principal * (rate/100) * elapsedPeriods
// Compound interest per segment: principal * ((1 + rate/100) ^ elapsedPeriods - 1)

function calculateGrossInterestAccrued(transaction, asOfDate = new Date()) {
  const rate = Number(transaction.rate) || 0;
  if (rate <= 0) return 0;

  const start = new Date(transaction.date);
  let end = asOfDate;
  if (transaction.returnDate) {
    const ret = new Date(transaction.returnDate);
    if (ret < end) end = ret;
  }
  if (end <= start) return 0;

  const rateDecimal = rate / 100;
  const periodDays = transaction.rateType === 'yearly' ? 365 : 30;
  const isCompound = transaction.interestType === 'compound';

  // Only capital payments that fall strictly inside the accrual window matter here.
  const capitalPayments = getSortedCapitalPayments(transaction).filter(
    (p) => p.date > start && p.date < end
  );

  const boundaries = [start, ...capitalPayments.map((p) => p.date), end];

  let principal = Number(transaction.amount);
  let totalInterest = 0;

  for (let i = 0; i < boundaries.length - 1; i++) {
    const segStart = boundaries[i];
    const segEnd = boundaries[i + 1];
    const daysElapsed = (segEnd - segStart) / (1000 * 60 * 60 * 24);
    const periods = daysElapsed / periodDays;

    if (periods > 0 && principal > 0) {
      totalInterest += isCompound
        ? principal * (Math.pow(1 + rateDecimal, periods) - 1)
        : principal * rateDecimal * periods;
    }

    // Apply the capital payment that sits at this boundary before the next segment.
    if (i < capitalPayments.length) {
      principal -= capitalPayments[i].amount;
      if (principal < 0) principal = 0;
    }
  }

  return totalInterest;
}

// Outstanding interest still owed = interest accrued so far minus interest already paid.
function calculateAccruedInterest(transaction, asOfDate = new Date()) {
  const gross = calculateGrossInterestAccrued(transaction, asOfDate);
  const paid = getTotalInterestPaid(transaction);
  const due = gross - paid;
  return due > 0 ? due : 0;
}

// Computes totals (principal, interest, combined) for a list of transactions,
// using remaining capital (after deposits) rather than the original amount.
function computeTotals(transactions, asOfDate = new Date()) {
  let gavePrincipal = 0;
  let gotPrincipal = 0;
  let gaveInterest = 0;
  let gotInterest = 0;

  transactions.forEach((t) => {
    const interest = calculateAccruedInterest(t, asOfDate);
    const remainingPrincipal = getRemainingCapital(t);
    if (t.type === 'gave') {
      gavePrincipal += remainingPrincipal;
      gaveInterest += interest;
    } else {
      gotPrincipal += remainingPrincipal;
      gotInterest += interest;
    }
  });

  const gaveTotal = gavePrincipal + gaveInterest;
  const gotTotal = gotPrincipal + gotInterest;

  return {
    gavePrincipal,
    gotPrincipal,
    gaveInterest,
    gotInterest,
    gave: gaveTotal,
    got: gotTotal,
    balance: gaveTotal - gotTotal
  };
}

module.exports = {
  calculateAccruedInterest,
  calculateGrossInterestAccrued,
  computeTotals,
  getRemainingCapital,
  getTotalInterestPaid,
  getSortedCapitalPayments
};