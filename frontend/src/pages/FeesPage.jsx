import React, { useState, useMemo } from 'react';
import {
  DollarSign, CheckCircle, AlertCircle, Clock, TrendingUp,
  Shield, CreditCard, ArrowRight, Download, Calendar,
  Zap, Lock, ChevronRight, Info, Receipt
} from 'lucide-react';

/* ─── Small helpers ──────────────────────────────── */
const ProgressBar = ({ pct = 0, color = '#6C3CF0', height = 10 }) => (
  <div style={{ background: 'rgba(0,0,0,0.06)', borderRadius: 99, height, overflow: 'hidden', width: '100%', position: 'relative' }}>
    <div style={{
      height: '100%', borderRadius: 99, width: `${Math.min(pct, 100)}%`,
      background: `linear-gradient(90deg, ${color}cc, ${color})`,
      transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
      boxShadow: pct > 0 ? `0 2px 8px ${color}40` : 'none'
    }} />
  </div>
);

const StatCard = ({ label, value, sub, color, bg, icon, gradient }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{
      background: gradient || 'white', border: gradient ? 'none' : '1px solid var(--border-color)',
      borderRadius: 20, padding: '24px 26px', boxShadow: hovered ? `0 16px 40px ${color}20` : 'var(--shadow-sm)',
      transition: 'all 0.22s', transform: hovered ? 'translateY(-3px)' : ''
    }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <p style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0, color: gradient ? 'rgba(255,255,255,0.6)' : 'var(--text-secondary)' }}>{label}</p>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: gradient ? 'rgba(255,255,255,0.12)' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: gradient ? '#fff' : color }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: 30, fontWeight: 900, margin: '0 0 5px', letterSpacing: -1, color: gradient ? '#fff' : color }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: gradient ? 'rgba(255,255,255,0.55)' : 'var(--text-secondary)', margin: 0 }}>{sub}</p>}
    </div>
  );
};

/* ─── Timeline dot ───────────────────────────────── */
const TimelineDot = ({ status, isLast }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
    <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${status === 'paid' ? '#10B981' : status === 'due' ? '#EF4444' : '#9CA3AF'}`, background: status === 'paid' ? '#10B981' : status === 'due' ? '#EF4444' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {status === 'paid' && <CheckCircle size={8} color="#fff" />}
      {status === 'due' && <Clock size={8} color="#fff" />}
    </div>
    {!isLast && <div style={{ width: 2, height: 40, background: 'rgba(0,0,0,0.06)', marginTop: 4 }} />}
  </div>
);

/* ─── Main Component ─────────────────────────────── */
const FeesPage = ({ dashboardData, onPayFees, paying }) => {
  const [activeSection, setActiveSection] = useState('overview');

  const student = dashboardData?.student || {};
  const isPaid  = student.feesStatus === 'Paid';

  const total     = Number(student.feesTotal)           || 0;
  const paid      = Number(student.feesPaidAmount)      || 0;
  const pending   = Number(student.feesRemainingAmount) || (total - paid);
  const payPct    = total > 0 ? Math.round((paid / total) * 100) : (isPaid ? 100 : 0);
  const payDate   = student.feesPaymentDate || '—';
  const statusStr = student.feesStatus || 'Unpaid';

  /* ── Mock installment history ── */
  const mockHistory = useMemo(() => {
    if (!dashboardData) return [];
    const items = [];
    if (paid > 0) {
      items.push({ id: 'TXN-001', amount: paid, date: payDate, status: 'paid', method: 'Online Payment', desc: 'Fee payment received' });
    }
    if (pending > 0) {
      const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 15);
      items.push({ id: 'TXN-002', amount: pending, date: dueDate.toLocaleDateString('en-IN'), status: 'due', method: '—', desc: 'Balance due' });
    }
    return items;
  }, [dashboardData, paid, pending, payDate]);

  /* ── Installment plan (mock 3-installment) ── */
  const installments = useMemo(() => {
    if (total === 0) return [];
    const amt = Math.round(total / 3);
    return [
      { no: 1, amount: amt, dueDate: 'Jan 2025', status: paid >= amt ? 'paid' : 'due' },
      { no: 2, amount: amt, dueDate: 'Mar 2025', status: paid >= amt * 2 ? 'paid' : paid >= amt ? 'due' : 'pending' },
      { no: 3, amount: total - amt * 2, dueDate: 'May 2025', status: isPaid ? 'paid' : 'pending' },
    ];
  }, [total, paid, isPaid]);

  if (!dashboardData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading fees data…</p>
      </div>
    );
  }

  return (
    <div>

      {/* ── PENDING WARNING BANNER ── */}
      {!isPaid && (
        <div style={{ background: 'linear-gradient(135deg, #450a0a, #7f1d1d)', borderRadius: 20, padding: '22px 28px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 12px 32px rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <AlertCircle size={26} color="#FCA5A5" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ color: '#FEF2F2', fontSize: 16, fontWeight: 800, margin: '0 0 5px' }}>
              Outstanding Fee Balance — ₹{pending.toLocaleString()}
            </h4>
            <p style={{ color: '#FCA5A5', fontSize: 13.5, margin: 0, lineHeight: 1.5 }}>
              Your fee payment is pending. Clear your dues to unlock live classes, recordings, and study materials.
            </p>
          </div>
          <button onClick={onPayFees} disabled={paying} style={{
            padding: '12px 24px', background: 'linear-gradient(135deg, #EF4444, #DC2626)', color: '#fff', border: 'none',
            borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 14, fontFamily: 'inherit',
            boxShadow: '0 6px 20px rgba(239,68,68,0.4)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s'
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(239,68,68,0.55)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(239,68,68,0.4)'; e.currentTarget.style.transform = ''; }}>
            <Zap size={15} strokeWidth={1.75} />
            {paying ? 'Processing…' : 'Pay Now'}
          </button>
        </div>
      )}

      {/* ── PAID SUCCESS BANNER ── */}
      {isPaid && (
        <div style={{ background: 'linear-gradient(135deg, #022c22, #064e3b)', borderRadius: 20, padding: '20px 28px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(16,185,129,0.25)', boxShadow: '0 8px 24px rgba(16,185,129,0.12)' }}>
          <CheckCircle size={30} color="#10B981" />
          <div>
            <h4 style={{ color: '#D1FAE5', fontSize: 15, fontWeight: 800, margin: '0 0 3px' }}>All Fees Cleared</h4>
            <p style={{ color: '#6EE7B7', fontSize: 13, margin: 0 }}>Payment received on {payDate}. Full access granted to all learning resources.</p>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <p style={{ color: '#6EE7B7', fontSize: 11, margin: '0 0 2px', fontWeight: 600 }}>PAID IN FULL</p>
            <p style={{ color: '#D1FAE5', fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>₹{paid.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* ── HERO STAT CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 28 }}>
        <StatCard label="Total Package" value={`₹${total.toLocaleString()}`} sub="Full course fee" color="#6C3CF0" bg="rgba(108,60,240,0.06)" icon={<Receipt size={18} />} />
        <StatCard label="Amount Paid" value={`₹${paid.toLocaleString()}`} sub={isPaid ? 'Fully settled' : `${payPct}% of total`} color="#10B981" bg="rgba(16,185,129,0.06)" icon={<CheckCircle size={18} />} />
        <StatCard label="Outstanding" value={`₹${pending.toLocaleString()}`} sub={isPaid ? 'No dues' : 'Balance remaining'} color={isPaid ? '#10B981' : '#EF4444'} bg={isPaid ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)'} icon={<AlertCircle size={18} />} />
        <StatCard label="Payment Status" value={statusStr} sub={isPaid ? `Paid ${payDate}` : 'Action required'} color={isPaid ? '#10B981' : '#EF4444'} bg={isPaid ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)'}
          icon={isPaid ? <Shield size={18} /> : <Lock size={18} />}
          gradient={isPaid ? 'linear-gradient(135deg, #064e3b, #065f46)' : 'linear-gradient(135deg, #450a0a, #7f1d1d)'}
        />
      </div>

      {/* ── PAYMENT PROGRESS (Stripe style) ── */}
      <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 28, marginBottom: 24, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} color="var(--primary-color)" /> Payment Progress
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Track your fee settlement status</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 3px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>Paid</p>
            <p style={{ fontSize: 28, fontWeight: 900, margin: 0, color: isPaid ? '#10B981' : 'var(--primary-color)', letterSpacing: -0.5 }}>{payPct}%</p>
          </div>
        </div>

        {/* Progress bar — thick, prominent */}
        <div style={{ marginBottom: 18 }}>
          <ProgressBar pct={payPct} color={isPaid ? '#10B981' : '#6C3CF0'} height={14} />
        </div>

        {/* Amount markers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 2px', fontWeight: 600 }}>PAID</p>
            <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#10B981' }}>₹{paid.toLocaleString()}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: '#10B981' }} /><span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Paid</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 10, height: 10, borderRadius: 2, background: 'rgba(0,0,0,0.06)' }} /><span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Remaining</span></div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 2px', fontWeight: 600 }}>TOTAL</p>
            <p style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>₹{total.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ── MAIN 2-COL GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginBottom: 24 }}>

        {/* PAYMENT HISTORY ── Stripe table */}
        <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '22px 24px 0', marginBottom: 0 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CreditCard size={17} color="var(--primary-color)" /> Payment History
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '0 0 18px' }}>All transactions on your account</p>
          </div>

          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, padding: '10px 24px', background: '#fafafd', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
            {['Transaction', 'Amount', 'Status'].map(h => (
              <span key={h} style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>{h}</span>
            ))}
          </div>

          {/* Table rows */}
          {mockHistory.length > 0 ? mockHistory.map((tx, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, padding: '16px 24px', borderBottom: i < mockHistory.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', alignItems: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fafafd'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, margin: '0 0 3px', color: 'var(--text-primary)' }}>{tx.desc}</p>
                <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  <span>{tx.id}</span>
                  <span>·</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={10} /> {tx.date}</span>
                </div>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: tx.status === 'paid' ? '#10B981' : '#EF4444' }}>
                {tx.status === 'paid' ? '+' : ''}₹{tx.amount.toLocaleString()}
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: tx.status === 'paid' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: tx.status === 'paid' ? '#10B981' : '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
                {tx.status === 'paid' ? <CheckCircle size={10} /> : <Clock size={10} />} {tx.status === 'paid' ? 'Paid' : 'Due'}
              </span>
            </div>
          )) : (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p style={{ fontSize: 13 }}>No transaction history yet</p>
            </div>
          )}

          {/* Download receipt */}
          {isPaid && (
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--border-color)', background: '#fafafd' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <Download size={13} /> Download Payment Receipt
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COL: Timeline + Installments */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* PAYMENT TIMELINE */}
          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 24, boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={16} color="var(--primary-color)" /> Payment Timeline
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {installments.map((inst, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <TimelineDot status={inst.status} isLast={i === installments.length - 1} />
                  <div style={{ flex: 1, paddingBottom: i < installments.length - 1 ? 24 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontSize: 13.5, fontWeight: 800, margin: '0 0 3px', color: 'var(--text-primary)' }}>Instalment {inst.no}</p>
                        <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: 0 }}>Due: {inst.dueDate}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 14, fontWeight: 800, margin: '0 0 2px', color: inst.status === 'paid' ? '#10B981' : inst.status === 'due' ? '#EF4444' : 'var(--text-secondary)' }}>
                          ₹{inst.amount.toLocaleString()}
                        </p>
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 10, background: inst.status === 'paid' ? 'rgba(16,185,129,0.1)' : inst.status === 'due' ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.05)', color: inst.status === 'paid' ? '#10B981' : inst.status === 'due' ? '#EF4444' : '#9CA3AF' }}>
                          {inst.status === 'paid' ? 'Paid' : inst.status === 'due' ? 'Due Now' : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {installments.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No instalment plan available</p>
              )}
            </div>
          </div>

          {/* FEE BREAKDOWN CARD */}
          <div style={{ background: 'linear-gradient(135deg, #0B0A0F, #1a1625)', borderRadius: 20, padding: 24, boxShadow: '0 12px 32px rgba(108,60,240,0.15)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 18px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}><Receipt size={16} strokeWidth={1.75} /> Fee Breakdown</h3>
            {[
              { label: 'Course Fee', val: `₹${Math.round(total * 0.75).toLocaleString()}`, color: '#a78bfa' },
              { label: 'Platform Access', val: `₹${Math.round(total * 0.15).toLocaleString()}`, color: '#60a5fa' },
              { label: 'Study Materials', val: `₹${Math.round(total * 0.10).toLocaleString()}`, color: '#34d399' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span style={{ fontSize: 12.5, color: '#9CA3AF' }}>{f.label}</span>
                <span style={{ fontSize: 13.5, fontWeight: 800, color: f.color }}>{f.val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span style={{ fontSize: 13, color: '#D1D5DB', fontWeight: 700 }}>Total Package</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>₹{total.toLocaleString()}</span>
            </div>
          </div>

          {/* WHAT'S INCLUDED */}
          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 22, boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <Shield size={15} color="var(--primary-color)" /> What's Included
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Live Classes', ok: true },
                { label: 'Recorded Lectures', ok: isPaid },
                { label: 'Study Materials & Notes', ok: isPaid },
                { label: 'Certificate on Completion', ok: isPaid },
                { label: 'Priority Support', ok: isPaid },
                { label: 'Doubt Sessions', ok: true },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, background: item.ok ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.03)' }}>
                  {item.ok
                    ? <CheckCircle size={13} color="#10B981" />
                    : <Lock size={13} color="#EF4444" />
                  }
                  <span style={{ fontSize: 13, fontWeight: 600, color: item.ok ? 'var(--text-primary)' : '#9CA3AF' }}>{item.label}</span>
                  {!item.ok && <span style={{ fontSize: 10.5, color: '#EF4444', marginLeft: 'auto', fontWeight: 700 }}>Pay fees</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK PAY SECTION ── */}
      {!isPaid && (
        <div style={{ background: 'linear-gradient(135deg, #6C3CF0 0%, #4c22bc 50%, #3b0764 100%)', borderRadius: 20, padding: '30px 36px', display: 'flex', alignItems: 'center', gap: 28, boxShadow: '0 16px 48px rgba(108,60,240,0.3)' }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 900, margin: '0 0 8px', letterSpacing: -0.5 }}>
              Clear your balance today
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
              Pay ₹{pending.toLocaleString()} to unlock <strong style={{ color: '#c4b5fd' }}>full access</strong> to all recordings, study materials, and certificates.
            </p>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Due now</p>
            <p style={{ color: '#fff', fontSize: 28, fontWeight: 900, margin: '0 0 14px', letterSpacing: -0.5 }}>₹{pending.toLocaleString()}</p>
            <button onClick={onPayFees} disabled={paying} style={{
              padding: '13px 28px', background: 'rgba(255,255,255,0.95)', color: '#6C3CF0', border: 'none',
              borderRadius: 12, cursor: 'pointer', fontWeight: 900, fontSize: 15, fontFamily: 'inherit',
              boxShadow: '0 6px 20px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'scale(1.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.95)'; e.currentTarget.style.transform = ''; }}>
              <Zap size={16} strokeWidth={1.75} />
              {paying ? 'Processing…' : 'Pay Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FeesPage;
