import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  User,
  BookOpen,
  Calendar,
  CheckCircle,
  XCircle,
  Circle,
  TrendingUp,
  Award,
} from 'lucide-react';

/* ─── Circular Progress Ring ────────────────────────── */
const RingProgress = ({ pct = 0, size = 110, stroke = 10 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  const color = pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0EEFE" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
};

/* ─── Stat Mini Card ─────────────────────────────── */
const StatChip = ({ label, value, color }) => (
  <div style={{
    background: '#FAFAFC',
    border: `1.5px solid ${color}22`,
    borderRadius: 12,
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
    minWidth: 0,
  }}>
    <span style={{ fontSize: 22, fontWeight: 800, color }}>{value}</span>
    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
  </div>
);

/* ─── Legend Item ─────────────────────────────────── */
const LegendItem = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
    <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
  </div>
);

/* ─── Day Cell Tooltip ─────────────────────────────── */
const DayTooltip = ({ day }) => (
  <div style={{
    position: 'absolute',
    bottom: 'calc(100% + 8px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#0B0A0F',
    color: '#fff',
    borderRadius: 10,
    padding: '8px 12px',
    fontSize: 11.5,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    zIndex: 100,
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    lineHeight: 1.6,
    pointerEvents: 'none',
  }}>
    <div style={{ fontWeight: 800, marginBottom: 2 }}>{day.dateStr}</div>
    <div>Status: <span style={{ fontWeight: 700, color: day.status === 'Present' ? '#34D399' : day.status === 'Absent' ? '#F87171' : '#9CA3AF' }}>{day.status}</span></div>
    {day.markedBy && <div>By: {day.markedBy}</div>}
    {day.markedTime && <div>At: {day.markedTime}</div>}
    {/* Tooltip arrow */}
    <div style={{
      position: 'absolute',
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: '5px solid transparent',
      borderRight: '5px solid transparent',
      borderTop: '5px solid #0B0A0F',
    }} />
  </div>
);

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
const AttendancePage = ({ dashboardData }) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [hoveredDay, setHoveredDay] = useState(null);

  const student = dashboardData?.student || {};
  const attendance = student.attendance || {};
  const history = student.attendanceHistory || [];

  /* ─── Build date → record map ─── */
  const attendanceMap = useMemo(() => {
    const map = {};
    history.forEach(item => {
      if (item.date) map[item.date] = item;
    });
    return map;
  }, [history]);

  /* ─── Calendar state ─── */
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startDayIndex = new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < startDayIndex; i++) days.push(null);
    for (let d = 1; d <= totalDays; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const record = attendanceMap[dateString];
      days.push({
        dayNum: d,
        dateStr: dateString,
        status: record?.status || 'No Class',
        markedBy: record?.marked_by || '',
        markedTime: record?.marked_time || '',
        isToday: dateString === new Date().toISOString().split('T')[0],
      });
    }
    return days;
  }, [year, month, totalDays, startDayIndex, attendanceMap]);

  /* ─── Monthly counts ─── */
  const monthPresent = useMemo(() => calendarDays.filter(d => d && d.status === 'Present').length, [calendarDays]);
  const monthAbsent = useMemo(() => calendarDays.filter(d => d && d.status === 'Absent').length, [calendarDays]);
  const monthWorkingDays = monthPresent + monthAbsent;

  /* ─── Aggregated stats ─── */
  const totalPresent = attendance.present ?? monthPresent;
  const totalAbsent = attendance.absent ?? monthAbsent;
  const totalWorking = (attendance.total_days) ?? (totalPresent + totalAbsent);
  const percentage = attendance.percentage ?? (totalWorking > 0 ? Math.round((totalPresent / totalWorking) * 100) : 0);

  /* ─── Month nav ─── */
  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const monthLabel = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  /* ─── Status helpers ─── */
  const getStatusColor = (status) => {
    if (status === 'Present') return '#10B981';
    if (status === 'Absent') return '#EF4444';
    return '#D1D5DB';
  };

  const pctColor = percentage >= 75 ? '#10B981' : percentage >= 50 ? '#F59E0B' : '#EF4444';
  const pctLabel = percentage >= 75 ? 'Excellent' : percentage >= 50 ? 'Average' : 'Low';

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gap: 24,
        alignItems: 'start',
      }}
    >

      {/* ═══════════════════════════════════════════
          LEFT SIDEBAR — 30%
      ═══════════════════════════════════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── Student Profile Card ── */}
        <div style={{
          background: '#fff',
          border: '1px solid #E8E8F2',
          borderRadius: 18,
          padding: '24px 20px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          textAlign: 'center',
        }}>
          <div style={{
            width: 68,
            height: 68,
            borderRadius: 18,
            background: '#EAE6FD',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary-color)',
            fontSize: 28,
            fontWeight: 800,
          }}>
            {student.name?.[0]?.toUpperCase() || <User size={28} />}
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {student.name || 'Student'}
            </h4>
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '4px 0 0', fontWeight: 500 }}>
              Student Account
            </p>
          </div>

          {/* Roll & Course info pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8F9FC', borderRadius: 10, padding: '9px 13px' }}>
              <BookOpen size={15} color="var(--primary-color)" />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {student.course || 'Fullstack Engineering'}
              </span>
            </div>
            {student.rollNumber && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F8F9FC', borderRadius: 10, padding: '9px 13px' }}>
                <Award size={15} color="var(--primary-color)" />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {student.rollNumber}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Attendance Statistics ── */}
        <div style={{
          background: '#fff',
          border: '1.5px solid var(--border-color)',
          borderRadius: 18,
          padding: '24px 20px',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <TrendingUp size={17} color="var(--primary-color)" />
            <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Attendance Statistics</h4>
          </div>

          {/* Circular Ring + Percentage */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, marginBottom: 20 }}>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <RingProgress pct={percentage} size={110} stroke={10} />
              <div style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: pctColor, lineHeight: 1 }}>{percentage}%</span>
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600, marginTop: 2 }}>{pctLabel}</span>
              </div>
            </div>
          </div>

          {/* Stat chips */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <StatChip label="Present" value={totalPresent} color="#10B981" />
            <StatChip label="Absent" value={totalAbsent} color="#EF4444" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <StatChip label="Working Days" value={totalWorking} color="var(--primary-color)" />
          </div>
        </div>

        {/* ── Current Month Summary ── */}
        <div style={{
          background: '#fff',
          border: '1.5px solid var(--border-color)',
          borderRadius: 18,
          padding: '24px 20px',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Calendar size={17} color="var(--primary-color)" />
            <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              {currentDate.toLocaleString('en-US', { month: 'long' })} Summary
            </h4>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px',
              background: 'rgba(16,185,129,0.06)',
              borderRadius: 10,
              border: '1px solid rgba(16,185,129,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <CheckCircle size={15} color="#10B981" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Present Days</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#10B981' }}>{monthPresent}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px',
              background: 'rgba(239,68,68,0.06)',
              borderRadius: 10,
              border: '1px solid rgba(239,68,68,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <XCircle size={15} color="#EF4444" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Absent Days</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: '#EF4444' }}>{monthAbsent}</span>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px',
              background: 'rgba(108,60,240,0.04)',
              borderRadius: 10,
              border: '1px solid rgba(108,60,240,0.12)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Calendar size={15} color="var(--primary-color)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Working Days</span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary-color)' }}>{monthWorkingDays}</span>
            </div>
          </div>
        </div>

        {/* ── Legend ── */}
        <div style={{
          background: '#fff',
          border: '1.5px solid var(--border-color)',
          borderRadius: 18,
          padding: '20px',
          boxShadow: 'var(--shadow-card)',
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 800, margin: '0 0 14px', color: 'var(--text-primary)' }}>Legend</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <LegendItem color="#10B981" label="Present" />
            <LegendItem color="#EF4444" label="Absent" />
            <LegendItem color="#D1D5DB" label="Holiday / No Class" />
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════
          RIGHT — CALENDAR 70%
      ═══════════════════════════════════════════ */}
      <div style={{
        background: '#fff',
        border: '1.5px solid var(--border-color)',
        borderRadius: 20,
        padding: '28px 28px 32px',
        boxShadow: 'var(--shadow-card)',
      }}>

        {/* ── Calendar Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: -0.4, color: 'var(--text-primary)' }}>
              {monthLabel}
            </h3>
            <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', margin: '3px 0 0', fontWeight: 500 }}>
              Monthly Attendance Calendar
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handlePrevMonth}
              style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#F8F9FC', border: '1px solid #E8E8F2', borderRadius: 10,
                cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EAE6FD'; e.currentTarget.style.color = 'var(--primary-color)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F8F9FC'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextMonth}
              style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#F8F9FC', border: '1px solid #E8E8F2', borderRadius: 10,
                cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EAE6FD'; e.currentTarget.style.color = 'var(--primary-color)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F8F9FC'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* ── Weekday Header Row ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
          marginBottom: 10,
        }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{
              textAlign: 'center',
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              paddingBottom: 6,
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* ── Day Cells ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
        }}>
          {calendarDays.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;

            const color = getStatusColor(day.status);
            const isHovered = hoveredDay === i;

            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredDay(i)}
                onMouseLeave={() => setHoveredDay(null)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '10px 4px 12px',
                  borderRadius: 14,
                  border: day.isToday
                    ? '2px solid var(--primary-color)'
                    : '1.5px solid transparent',
                  background: day.isToday
                    ? 'rgba(108,60,240,0.04)'
                    : isHovered
                    ? '#FAFAFC'
                    : 'transparent',
                  cursor: day.status !== 'No Class' ? 'pointer' : 'default',
                  transition: 'all 0.18s ease',
                }}
              >
                {/* Tooltip on hover */}
                {isHovered && day.status !== 'No Class' && <DayTooltip day={day} />}

                {/* Day number */}
                <span style={{
                  fontSize: 13,
                  fontWeight: day.isToday ? 800 : 600,
                  color: day.isToday ? 'var(--primary-color)' : 'var(--text-primary)',
                  lineHeight: 1,
                }}>
                  {day.dayNum}
                </span>

                {/* Status dot */}
                <div style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                  boxShadow: day.status !== 'No Class' ? `0 0 0 3px ${color}22` : 'none',
                  transition: 'all 0.2s',
                }} />
              </div>
            );
          })}
        </div>

        {/* ── Footer progress bar ── */}
        {monthWorkingDays > 0 && (
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #F3F4F6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                This month's attendance
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: monthPresent / monthWorkingDays >= 0.75 ? '#10B981' : '#EF4444' }}>
                {Math.round((monthPresent / monthWorkingDays) * 100)}%
              </span>
            </div>
            <div style={{ background: '#F0EEFE', borderRadius: 99, height: 7, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                borderRadius: 99,
                width: `${Math.round((monthPresent / monthWorkingDays) * 100)}%`,
                background: monthPresent / monthWorkingDays >= 0.75 ? '#10B981' : '#EF4444',
                transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
              }} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                {monthPresent} present · {monthAbsent} absent · {monthWorkingDays} total
              </span>
            </div>
          </div>
        )}

        {/* ── Empty state for months with no data ── */}
        {monthWorkingDays === 0 && (
          <div style={{ marginTop: 28, textAlign: 'center', padding: '24px 0' }}>
            <Circle size={32} color="#D1D5DB" style={{ marginBottom: 10 }} />
            <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', margin: 0, fontWeight: 500 }}>
              No attendance records for this month
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;
