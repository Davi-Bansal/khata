// Calculates accrued interest for a transaction, as of a given date (defaults to now).
// Supports both 'monthly' and 'yearly' rate types, and both 'simple' and 'compound' interest types.
//
// Simple interest:   interest = principal * (rate/100) * elapsedPeriods
// Compound interest:  interest = principal * ((1 + rate/100) ^ elapsedPeriods - 1)
//   (compounds once per period — monthly compounding for a monthly rate, yearly for a yearly rate;
//    elapsedPeriods can be fractional, e.g. 1.5 periods, for partial-period compounding)
//
// If the transaction has a returnDate that is in the past (already returned), interest
// only accrues up to that returnDate, not beyond it.
function calculateAccruedInterest(transaction, asOfDate = new Date()) {
  const rate = Number(transaction.rate) || 0;
  if (rate <= 0) return 0;

  const start = new Date(transaction.date);
  let end = asOfDate;

  if (transaction.returnDate) {
    const ret = new Date(transaction.returnDate);
    if (ret < end) end = ret;
  }

  const msElapsed = end - start;
  if (msElapsed <= 0) return 0;

  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
  const periods = transaction.rateType === 'yearly' ? daysElapsed / 365 : daysElapsed / 30;
  const principal = Number(transaction.amount);
  const rateDecimal = rate / 100;

  if (transaction.interestType === 'compound') {
    return principal * (Math.pow(1 + rateDecimal, periods) - 1);
  }

  // default: simple interest
  return principal * rateDecimal * periods;
}

// Computes totals (principal, interest, combined) for a list of transactions.
function computeTotals(transactions, asOfDate = new Date()) {
  let gavePrincipal = 0;
  let gotPrincipal = 0;
  let gaveInterest = 0;
  let gotInterest = 0;

  transactions.forEach((t) => {
    const interest = calculateAccruedInterest(t, asOfDate);
    if (t.type === 'gave') {
      gavePrincipal += t.amount;
      gaveInterest += interest;
    } else {
      gotPrincipal += t.amount;
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
    gave: gaveTotal, // kept as "gave"/"got" for backward compatibility with the frontend
    got: gotTotal,
    balance: gaveTotal - gotTotal
  };
}

module.exports = { calculateAccruedInterest, computeTotals };