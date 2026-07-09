import React, { useState, useMemo } from 'react';
import {
  FileText, Search, Download, Eye, Filter, Clock, Star, Zap,
  BookOpen, File, Image, ChevronDown, Grid, List, Tag, ArrowRight, Lock
} from 'lucide-react';

/* ─── Subject colour palette ────────────────────── */
const SUBJECT_COLORS = {
  'Mathematics'        : { c1: '#6C3CF0', c2: '#4c22bc', bg: 'rgba(108,60,240,0.06)', border: 'rgba(108,60,240,0.15)' },
  'Physics'            : { c1: '#3B82F6', c2: '#1D4ED8', bg: 'rgba(59,130,246,0.06)',  border: 'rgba(59,130,246,0.15)' },
  'Chemistry'          : { c1: '#10B981', c2: '#059669', bg: 'rgba(16,185,129,0.06)',   border: 'rgba(16,185,129,0.15)' },
  'Computer Science'   : { c1: '#F59E0B', c2: '#D97706', bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.15)' },
  'English'            : { c1: '#EC4899', c2: '#BE185D', bg: 'rgba(236,72,153,0.06)',   border: 'rgba(236,72,153,0.15)' },
  'Frontend'           : { c1: '#3B82F6', c2: '#1D4ED8', bg: 'rgba(59,130,246,0.06)',  border: 'rgba(59,130,246,0.15)' },
  'Backend'            : { c1: '#10B981', c2: '#059669', bg: 'rgba(16,185,129,0.06)',   border: 'rgba(16,185,129,0.15)' },
  'Data Science'       : { c1: '#F59E0B', c2: '#D97706', bg: 'rgba(245,158,11,0.06)',  border: 'rgba(245,158,11,0.15)' },
  'UI/UX'              : { c1: '#EC4899', c2: '#BE185D', bg: 'rgba(236,72,153,0.06)',   border: 'rgba(236,72,153,0.15)' },
  'General'            : { c1: '#6B7280', c2: '#4B5563', bg: 'rgba(107,114,128,0.06)', border: 'rgba(107,114,128,0.15)' },
};

const DEFAULT_COLOR = { c1: '#6C3CF0', c2: '#4c22bc', bg: 'rgba(108,60,240,0.06)', border: 'rgba(108,60,240,0.15)' };

const getSubjectColor = (subject) => SUBJECT_COLORS[subject] || DEFAULT_COLOR;

/* ─── File type helpers ─────────────────────────── */
const FILE_TYPE_COLORS = {
  pdf : { bg: '#FEF2F2', color: '#EF4444', label: 'PDF' },
  doc : { bg: '#EFF6FF', color: '#3B82F6', label: 'DOC' },
  docx: { bg: '#EFF6FF', color: '#3B82F6', label: 'DOCX' },
  ppt : { bg: '#FFF7ED', color: '#F59E0B', label: 'PPT' },
  pptx: { bg: '#FFF7ED', color: '#F59E0B', label: 'PPTX' },
  xls : { bg: '#F0FDF4', color: '#10B981', label: 'XLS' },
  xlsx: { bg: '#F0FDF4', color: '#10B981', label: 'XLSX' },
  zip : { bg: '#F5F3FF', color: '#8B5CF6', label: 'ZIP' },
  jpg : { bg: '#FDF4FF', color: '#A855F7', label: 'IMG' },
  png : { bg: '#FDF4FF', color: '#A855F7', label: 'IMG' },
};
const DEFAULT_FILE = { bg: '#F3F4F6', color: '#6B7280', label: 'FILE' };

const getFileType = (url = '', type = '') => {
  const ext = (url.split('.').pop() || type || '').toLowerCase().replace(/\?.*$/, '');
  return FILE_TYPE_COLORS[ext] || DEFAULT_FILE;
};

/* ─── Material Card Component ───────────────────── */
const MaterialCard = ({ material, viewMode, isPaid }) => {
  const [hovered, setHovered] = useState(false);
  const sc = getSubjectColor(material.subject || 'General');
  const ft = getFileType(material.url, material.type);
  const mockDownloads = Math.floor(Math.random() * 800) + 50;
  const mockRating = (3.6 + Math.random() * 1.4).toFixed(1);

  if (viewMode === 'list') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px',
        background: 'white', border: `1px solid ${hovered ? sc.border : 'var(--border-color)'}`,
        borderLeft: `3px solid ${sc.c1}`, borderRadius: 14, boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'all 0.2s', cursor: 'default', transform: hovered ? 'translateX(4px)' : ''
      }}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        {/* Icon */}
        <div style={{ width: 44, height: 44, borderRadius: 11, background: `linear-gradient(135deg, ${sc.c1}, ${sc.c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={20} color="#fff" />
        </div>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{material.title}</h4>
            <span style={{ fontSize: 9.5, fontWeight: 800, padding: '2px 7px', borderRadius: 5, background: ft.bg, color: ft.color, flexShrink: 0 }}>{ft.label}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600, color: sc.c1 }}>
              <Tag size={10} /> {material.subject || 'General'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> {material.uploaded_at || 'Recently'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Download size={10} /> {mockDownloads}</span>
          </div>
        </div>
        {/* Actions */}
        {isPaid && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <a href={material.url} target="_blank" rel="noreferrer" style={{ padding: '7px 14px', borderRadius: 9, border: '1px solid var(--border-color)', background: 'white', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = sc.border; e.currentTarget.style.color = sc.c1; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-primary)'; }}>
              <Eye size={12} /> Preview
            </a>
            <a href={material.url} download target="_blank" rel="noreferrer" style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: `linear-gradient(135deg, ${sc.c1}, ${sc.c2})`, fontSize: 12, fontWeight: 700, color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', boxShadow: `0 4px 12px ${sc.c1}28` }}>
              <Download size={12} /> Download
            </a>
          </div>
        )}
        {!isPaid && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Lock size={12} strokeWidth={1.75} /> Locked</span>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: 'white', border: `1px solid ${hovered ? sc.border : 'var(--border-color)'}`,
      borderRadius: 18, overflow: 'hidden', boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      transition: 'all 0.22s', transform: hovered ? 'translateY(-4px)' : '', display: 'flex', flexDirection: 'column'
    }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      {/* Card top accent */}
      <div style={{ height: 4, background: `linear-gradient(90deg, ${sc.c1}, ${sc.c2})` }} />

      <div style={{ padding: '22px 22px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          {/* PDF icon block */}
          <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${sc.c1}, ${sc.c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 16px ${sc.c1}28` }}>
            <FileText size={24} color="#fff" />
          </div>
          {/* File type badge */}
          <span style={{ fontSize: 9.5, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: ft.bg, color: ft.color, letterSpacing: 0.3 }}>{ft.label}</span>
        </div>

        {/* Title */}
        <h4 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 8px', color: 'var(--text-primary)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {material.title}
        </h4>

        {/* Subject + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.c1, border: `1px solid ${sc.border}` }}>
            {material.subject || 'General'}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={10} /> {material.uploaded_at || 'Recently'}
          </span>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 18, borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: 12 }}>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <Download size={10} /> {mockDownloads} downloads
          </span>
          <span style={{ fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 3 }}>
            ★ {mockRating}
          </span>
        </div>

        {/* Action buttons */}
        {isPaid ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <a href={material.url} target="_blank" rel="noreferrer" style={{
              flex: 1, padding: '9px', borderRadius: 10, border: `1px solid ${sc.border}`,
              background: sc.bg, fontSize: 12.5, fontWeight: 700, color: sc.c1, textDecoration: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s',
              cursor: 'pointer', fontFamily: 'inherit'
            }}
              onMouseEnter={e => { e.currentTarget.style.background = `${sc.c1}18`; }}
              onMouseLeave={e => { e.currentTarget.style.background = sc.bg; }}>
              <Eye size={13} /> Preview
            </a>
            <a href={material.url} download target="_blank" rel="noreferrer" style={{
              flex: 1, padding: '9px', borderRadius: 10, border: 'none',
              background: `linear-gradient(135deg, ${sc.c1}, ${sc.c2})`,
              fontSize: 12.5, fontWeight: 700, color: '#fff', textDecoration: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              boxShadow: `0 4px 12px ${sc.c1}28`, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s'
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 18px ${sc.c1}40`; e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 4px 12px ${sc.c1}28`; e.currentTarget.style.transform = ''; }}>
              <Download size={13} /> Download
            </a>
          </div>
        ) : (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: '#EF4444' }}>
            <Lock size={14} strokeWidth={1.75} /> Pay fees to unlock
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────── */
const StudyMaterialsPage = ({ dashboardData, isPaid }) => {
  const [search, setSearch]     = useState('');
  const [subject, setSubject]   = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy]     = useState('recent');

  const materials = dashboardData?.studyMaterials || [];

  /* ── Derive subject list ── */
  const subjects = useMemo(() => {
    const s = new Set(materials.map(m => m.subject || 'General').filter(Boolean));
    return ['all', ...Array.from(s)];
  }, [materials]);

  /* ── Filtered list ── */
  const filtered = useMemo(() => {
    let list = [...materials];
    if (search) list = list.filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || (m.subject || '').toLowerCase().includes(search.toLowerCase()));
    if (subject !== 'all') list = list.filter(m => (m.subject || 'General') === subject);
    if (sortBy === 'alpha') list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [materials, search, subject, sortBy]);

  const recentNotes  = useMemo(() => [...materials].slice(0, 4), [materials]);
  const popularNotes = useMemo(() => [...materials].slice(0, 6), [materials]);

  if (materials.length === 0) {
    return (
      <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: '70px 40px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Study Materials Yet</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 360, margin: '0 auto' }}>
          Your trainer hasn't uploaded any notes yet. They'll appear here as beautiful cards once uploaded.
        </p>
      </div>
    );
  }

  return (
    <div>

      {/* ── PAYWALL BANNER ── */}
      {!isPaid && (
        <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: 18, padding: '20px 28px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(167,139,250,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={24} strokeWidth={1.75} color="#c084fc" /></div>
          <div style={{ flex: 1 }}>
            <h4 style={{ color: '#fff', fontSize: 15, fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
              Study Materials Locked <span style={{ fontSize: 10, background: '#EF4444', color: '#fff', padding: '2px 8px', borderRadius: 20 }}>Premium Lock</span>
            </h4>
            <p style={{ color: '#C084FC', fontSize: 13, margin: 0, fontWeight: 500 }}>Premium content is available only for students with active enrollment.</p>
          </div>
          <div style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10, padding: '8px 16px', fontSize: 12.5, fontWeight: 800, color: '#c084fc', flexShrink: 0 }}>
            Active Fees Status Needed
          </div>
        </div>
      )}

      {/* ── STATS ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Notes', val: materials.length, color: '#6C3CF0', bg: 'rgba(108,60,240,0.06)', icon: <FileText size={18} /> },
          { label: 'Subjects', val: subjects.length - 1, color: '#10B981', bg: 'rgba(16,185,129,0.06)', icon: <BookOpen size={18} /> },
          { label: 'Recent (7d)', val: recentNotes.length, color: '#F59E0B', bg: 'rgba(245,158,11,0.06)', icon: <Clock size={18} /> },
          { label: 'Accessible', val: isPaid ? materials.length : 0, color: isPaid ? '#10B981' : '#EF4444', bg: isPaid ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)', icon: <Star size={18} /> },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 16, padding: '18px 20px', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</p>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
            </div>
            <p style={{ fontSize: 28, fontWeight: 800, margin: 0, color: s.color, letterSpacing: -0.5 }}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* ── SEARCH + CONTROLS ── */}
      <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 16, padding: '16px 20px', marginBottom: 22, boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '9px 14px', flex: 1, minWidth: 200, transition: 'all 0.15s' }}>
          <Search size={14} color="var(--text-secondary)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes, subjects…" style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', width: '100%', color: 'var(--text-primary)' }} />
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '9px 12px', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, color: 'var(--text-primary)', background: 'white', cursor: 'pointer', outline: 'none' }}>
          <option value="recent">Newest First</option>
          <option value="alpha">A–Z</option>
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.04)', borderRadius: 9, padding: 3 }}>
          {[{ mode: 'grid', icon: <Grid size={14} /> }, { mode: 'list', icon: <List size={14} /> }].map(v => (
            <button key={v.mode} onClick={() => setViewMode(v.mode)} style={{ padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: viewMode === v.mode ? 'white' : 'transparent', color: viewMode === v.mode ? 'var(--primary-color)' : 'var(--text-secondary)', boxShadow: viewMode === v.mode ? 'var(--shadow-sm)' : 'none', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {v.icon}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{filtered.length} files</span>
      </div>

      {/* ── SUBJECT FILTER PILLS ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
        {subjects.map(s => {
          const sc = s === 'all' ? { c1: '#6C3CF0', bg: 'rgba(108,60,240,0.06)', border: 'rgba(108,60,240,0.2)' } : getSubjectColor(s);
          const isActive = subject === s;
          return (
            <button key={s} onClick={() => setSubject(s)} style={{
              flexShrink: 0, padding: '7px 16px', borderRadius: 20, border: isActive ? 'none' : `1px solid ${isActive ? sc.border : 'var(--border-color)'}`,
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, transition: 'all 0.15s',
              background: isActive ? `linear-gradient(135deg, ${sc.c1}, ${sc.c1}cc)` : 'white',
              color: isActive ? '#fff' : 'var(--text-secondary)',
              boxShadow: isActive ? `0 4px 12px ${sc.c1}30` : 'none',
            }}>
              {s === 'all' ? `All (${materials.length})` : s}
            </button>
          );
        })}
      </div>

      {/* ── RECENT NOTES (top section, only show when no filters) ── */}
      {!search && subject === 'all' && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="var(--primary-color)" /> Recent Notes
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Last 7 days</span>
          </div>
          {/* Horizontal scroll with large preview cards */}
          <div style={{ display: 'flex', gap: 18, overflowX: 'auto', paddingBottom: 8 }}>
            {recentNotes.map((m, i) => {
              const sc = getSubjectColor(m.subject || 'General');
              return (
                <div key={i} style={{ minWidth: 240, background: `linear-gradient(135deg, ${sc.c1}0A, ${sc.c2}06)`, border: `1px solid ${sc.border}`, borderRadius: 18, padding: 22, flexShrink: 0, transition: 'all 0.2s', cursor: 'default' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 10px 24px ${sc.c1}18`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${sc.c1}, ${sc.c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: `0 4px 12px ${sc.c1}28` }}>
                    <FileText size={20} color="#fff" />
                  </div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.title}</h4>
                  <p style={{ fontSize: 11.5, color: sc.c1, fontWeight: 700, margin: '0 0 12px' }}>{m.subject || 'General'}</p>
                  {isPaid ? (
                    <a href={m.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: sc.c1, textDecoration: 'none' }}>
                      Open note <ArrowRight size={12} />
                    </a>
                  ) : (
                    <span style={{ fontSize: 11.5, color: '#EF4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Lock size={12} strokeWidth={1.75} /> Locked</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── POPULAR NOTES (horizontal scroll, only show unfiltered) ── */}
      {!search && subject === 'all' && popularNotes.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Star size={18} color="#F59E0B" style={{ fill: '#F59E0B' }} /> Popular Notes
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>Most downloaded</span>
          </div>
          {/* ranked list */}
          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {popularNotes.map((m, i) => {
              const sc = getSubjectColor(m.subject || 'General');
              const mockDL = Math.floor(Math.random() * 800) + 50;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < popularNotes.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fafafd'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ''; }}>
                  {/* Rank */}
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: i < 3 ? `linear-gradient(135deg, ${sc.c1}, ${sc.c2})` : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: i < 3 ? '#fff' : 'var(--text-tertiary)', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  {/* Mini PDF icon */}
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg, ${sc.c1}, ${sc.c2})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={16} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                    <div style={{ display: 'flex', gap: 10, marginTop: 3, fontSize: 11, color: 'var(--text-secondary)' }}>
                      <span style={{ color: sc.c1, fontWeight: 700 }}>{m.subject || 'General'}</span>
                      <span>{m.uploaded_at}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}><Download size={10} /> {mockDL}</span>
                    {isPaid && (
                      <a href={m.url} download target="_blank" rel="noreferrer" style={{ padding: '6px 12px', borderRadius: 8, background: `${sc.c1}12`, border: `1px solid ${sc.border}`, fontSize: 11.5, fontWeight: 700, color: sc.c1, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Download size={11} /> Get
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALL NOTES GRID / LIST ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} color="var(--primary-color)" />
            {search ? `"${search}"` : subject === 'all' ? 'All Study Materials' : subject}
          </h3>
          <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 8, background: 'rgba(108,60,240,0.06)', color: 'var(--primary-color)' }}>
            {filtered.length} files
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '52px 20px', background: 'white', borderRadius: 18, border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontWeight: 800, fontSize: 15, margin: '0 0 6px' }}>No notes found</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 16px' }}>Try a different search or clear the filters</p>
            <button onClick={() => { setSearch(''); setSubject('all'); }} style={{ padding: '9px 20px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
              Clear Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {filtered.map((m, i) => <MaterialCard key={i} material={m} viewMode="grid" isPaid={isPaid} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((m, i) => <MaterialCard key={i} material={m} viewMode="list" isPaid={isPaid} />)}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyMaterialsPage;
