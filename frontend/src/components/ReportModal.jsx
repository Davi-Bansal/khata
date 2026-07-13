import { useState } from 'react';
import api from '../api/axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { SHOP_NAME } from '../config';

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function buildPdf(report) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text(SHOP_NAME, pageWidth / 2, 18, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text('Interest Book Report', pageWidth / 2, 26, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(100);
  const periodLabel = report.period.charAt(0).toUpperCase() + report.period.slice(1);
  doc.text(
    `${periodLabel} Report  |  ${formatDate(report.from)} to ${formatDate(report.to)}`,
    pageWidth / 2,
    32,
    { align: 'center' }
  );
  doc.setTextColor(0);

  // Stat cards
  const stats = [
    { label: 'You Gave', value: report.overall.gave, color: [229, 57, 53] },
    { label: 'You Got', value: report.overall.got, color: [30, 142, 62] },
    {
      label: 'Total Interest',
      value: report.overall.gaveInterest + report.overall.gotInterest,
      color: [0, 137, 123]
    },
    { label: 'Net Balance', value: report.overall.balance, color: [0, 0, 0] }
  ];

  const margin = 10;
  const gap = 4;
  const cardWidth = (pageWidth - margin * 2 - gap * (stats.length - 1)) / stats.length;
  const cardY = 40;
  const cardHeight = 24;

  stats.forEach((s, i) => {
    const x = margin + i * (cardWidth + gap);
    doc.setDrawColor(...s.color);
    doc.setLineWidth(0.6);
    doc.rect(x, cardY, cardWidth, cardHeight);

    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(s.label, x + cardWidth / 2, cardY + 8, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(...s.color);
    doc.text(`Rs. ${s.value.toFixed(0)}`, x + cardWidth / 2, cardY + 17, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0);
  });

  let y = cardY + cardHeight + 10;

  // Customer-wise breakdown table
  // Note: c.gave / c.got here are remaining principal + interest due (after
  // deposits already made), not the original transaction amounts.
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text('Customer-wise Summary (after deposits)', margin, y);
  doc.setFont(undefined, 'normal');
  y += 4;

  doc.autoTable({
    startY: y,
    head: [['Customer', 'You Gave (Rs.)', 'You Got (Rs.)', 'Interest Due (Rs.)', 'Balance (Rs.)']],
    body: report.customers.map((c) => [
      c.name,
      c.gave.toFixed(0),
      c.got.toFixed(0),
      (c.gaveInterest + c.gotInterest).toFixed(0),
      c.balance.toFixed(0)
    ]),
    theme: 'grid',
    headStyles: { fillColor: [0, 137, 123], fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: margin, right: margin }
  });

  y = doc.lastAutoTable.finalY + 10;

  // Transaction list
  if (report.transactions.length > 0) {
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Transactions in this period', margin, y);
    doc.setFont(undefined, 'normal');
    y += 4;

    doc.autoTable({
      startY: y,
      head: [
        ['Date', 'Customer', 'Type', 'Amount (Rs.)', 'Paid (Rs.)', 'Balance (Rs.)', 'Interest Due (Rs.)']
      ],
      body: report.transactions.map((t) => [
        formatDate(t.date),
        t.customerName,
        t.type === 'gave' ? 'You Gave' : 'You Got',
        t.amount.toFixed(0),
        (t.capitalPaid || 0).toFixed(0),
        (t.remainingCapital !== undefined ? t.remainingCapital : t.amount).toFixed(0),
        t.interest ? t.interest.toFixed(0) : '0'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 137, 123], fontSize: 9 },
      bodyStyles: { fontSize: 8 },
      margin: { left: margin, right: margin }
    });

    y = doc.lastAutoTable.finalY + 10;

    // Deposits made within this period, across all transactions.
    const allDeposits = [];
    report.transactions.forEach((t) => {
      (t.paymentsInPeriod || []).forEach((p) => {
        allDeposits.push({
          date: p.date,
          customerName: t.customerName,
          type: p.type === 'capital' ? 'Capital' : 'Interest',
          amount: p.amount,
          note: p.note || ''
        });
      });
    });

    if (allDeposits.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('Deposits Received/Paid in this period', margin, y);
      doc.setFont(undefined, 'normal');
      y += 4;

      doc.autoTable({
        startY: y,
        head: [['Date', 'Customer', 'Deposit Type', 'Amount (Rs.)', 'Note']],
        body: allDeposits.map((d) => [
          formatDate(d.date),
          d.customerName,
          d.type,
          d.amount.toFixed(0),
          d.note
        ]),
        theme: 'striped',
        headStyles: { fillColor: [30, 142, 62], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: margin, right: margin }
      });
    }
  } else {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('No transactions in this period.', margin, y);
    doc.setTextColor(0);
  }

  doc.save(`${SHOP_NAME.replace(/\s+/g, '_')}_${report.period}_report.pdf`);
}

export default function ReportModal({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (period) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/customers/report?period=${period}`);
      buildPdf(res.data);
      onClose();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Report generation error:', err);
      setError(
        err.response?.data?.message || err.message || 'Could not generate report (see console)'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Download Report</span>
        </div>
        <div className="modal-body">
          {error && <div className="auth-error">{error}</div>}
          <p className="report-hint">Choose a period to generate a PDF report</p>
          <button
            className="btn-save-green"
            style={{ marginBottom: 10 }}
            disabled={loading}
            onClick={() => handleGenerate('weekly')}
          >
            {loading ? 'Generating...' : 'WEEKLY'}
          </button>
          <button
            className="btn-save-green"
            style={{ marginBottom: 10 }}
            disabled={loading}
            onClick={() => handleGenerate('monthly')}
          >
            {loading ? 'Generating...' : 'MONTHLY'}
          </button>
          <button className="btn-save-green" disabled={loading} onClick={() => handleGenerate('yearly')}>
            {loading ? 'Generating...' : 'YEARLY'}
          </button>
        </div>
      </div>
    </div>
  );
}