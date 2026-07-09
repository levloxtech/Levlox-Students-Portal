import React, { useState, useMemo } from 'react';
import { Play, Search, Filter, Clock, User, BookOpen, Star, TrendingUp, Eye, ChevronRight, Calendar, ArrowRight, Zap, Lock, PlayCircle, Video, AlertCircle } from 'lucide-react';

/* ── Error Boundary Component ────────────────────── */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("RecordedClassesPage Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 40, textAlign: 'center', boxShadow: 'var(--shadow-sm)', maxWidth: 500, margin: '40px auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <AlertCircle size={40} color="#EF4444" strokeWidth={1.75} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>Something went wrong</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
            An error occurred while loading this page. Please try refreshing or contact support if the issue persists.
          </p>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}


/* ── Category config ─────────────────────────────── */
const CATEGORIES = [
  { id: 'all',      label: 'All Classes',  color: '#6C3CF0' },
  { id: 'frontend', label: 'Frontend',     color: '#3B82F6' },
  { id: 'backend',  label: 'Backend',      color: '#10B981' },
  { id: 'fullstack',label: 'Fullstack',    color: '#6C3CF0' },
  { id: 'ui-ux',    label: 'UI/UX Design', color: '#EC4899' },
  { id: 'data',     label: 'Data Science', color: '#F59E0B' },
  { id: 'devops',   label: 'DevOps',       color: '#EF4444' },
];

const SORT_OPTIONS = [
  { val: 'recent',   label: 'Recently Uploaded' },
  { val: 'popular',  label: 'Most Viewed' },
  { val: 'duration', label: 'Longest First' },
  { val: 'alpha',    label: 'A–Z' },
];

/* ── Category color map ─────────────────────────── */
const getCatColor = (courseTitle = '') => {
  const t = courseTitle.toLowerCase();
  if (t.includes('react') || t.includes('frontend') || t.includes('html') || t.includes('css')) return { c1: '#3B82F6', c2: '#1D4ED8' };
  if (t.includes('backend') || t.includes('node') || t.includes('express') || t.includes('python')) return { c1: '#10B981', c2: '#059669' };
  if (t.includes('ui') || t.includes('ux') || t.includes('design') || t.includes('figma')) return { c1: '#EC4899', c2: '#BE185D' };
  if (t.includes('data') || t.includes('ml') || t.includes('ai') || t.includes('machine')) return { c1: '#F59E0B', c2: '#D97706' };
  if (t.includes('devops') || t.includes('docker') || t.includes('cloud') || t.includes('aws')) return { c1: '#EF4444', c2: '#DC2626' };
  if (t.includes('fullstack') || t.includes('full stack') || t.includes('mern') || t.includes('mean')) return { c1: '#6C3CF0', c2: '#4c22bc' };
  return { c1: '#6C3CF0', c2: '#4c22bc' };
};

const matchesCategory = (video, catId) => {
  if (catId === 'all') return true;
  const t = (video.title + ' ' + (video.course_title || '')).toLowerCase();
  switch (catId) {
    case 'frontend':  return t.includes('react') || t.includes('frontend') || t.includes('html') || t.includes('css') || t.includes('vue') || t.includes('angular');
    case 'backend':   return t.includes('backend') || t.includes('node') || t.includes('express') || t.includes('python') || t.includes('django') || t.includes('api');
    case 'fullstack': return t.includes('fullstack') || t.includes('full stack') || t.includes('mern') || t.includes('mean');
    case 'ui-ux':     return t.includes('ui') || t.includes('ux') || t.includes('design') || t.includes('figma');
    case 'data':      return t.includes('data') || t.includes('ml') || t.includes('machine') || t.includes('ai');
    case 'devops':    return t.includes('devops') || t.includes('docker') || t.includes('cloud') || t.includes('aws') || t.includes('ci');
    default: return true;
  }
};

/* ── Thumbnail Component ─────────────────────────── */
const VideoThumbnail = ({ video, size = 'normal', watchPct = 0, onWatch }) => {
  const [hovered, setHovered] = useState(false);
  const { c1, c2 } = getCatColor(video.course_title || video.title || '');
  const letter = (video.title || 'V')[0].toUpperCase();

  return (
    <div style={{ position: 'relative', borderRadius: size === 'continue' ? 12 : 14, overflow: 'hidden', cursor: 'pointer', aspectRatio: '16/9', background: `linear-gradient(135deg, ${c1}, ${c2})`, flexShrink: 0 }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onClick={onWatch}>
      {/* Real thumbnail if exists */}
      {video.thumbnail_url && <img src={video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />}

      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${c1}cc, ${c2})`, opacity: video.thumbnail_url ? (hovered ? 0.7 : 0.3) : 1, transition: 'opacity 0.2s' }} />

      {/* Letter placeholder */}
      {!video.thumbnail_url && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size === 'continue' ? 28 : 36, fontWeight: 900, color: 'rgba(255,255,255,0.25)', fontFamily: 'inherit' }}>
          {letter}
        </div>
      )}

      {/* Play hover */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hovered ? 1 : 0, transition: 'opacity 0.2s' }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.25)', transform: hovered ? 'scale(1)' : 'scale(0.8)', transition: 'transform 0.2s' }}>
          <Play size={18} color={c1} style={{ marginLeft: 2 }} />
        </div>
      </div>

      {/* Duration badge */}
      {video.duration && (
        <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 5 }}>
          {video.duration}
        </div>
      )}

      {/* Progress bar for continue watching */}
      {watchPct > 0 && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.2)' }}>
          <div style={{ height: '100%', width: `${watchPct}%`, background: '#EF4444', borderRadius: '0 2px 2px 0' }} />
        </div>
      )}
    </div>
  );
};

/* ── Video Card ─────────────────────────────────── */
const VideoCard = ({ video, onWatch, isPaid, rank }) => {
  const [hovered, setHovered] = useState(false);
  const { c1, c2 } = getCatColor(video.course_title || video.title || '');
  const mockViews    = Math.floor(Math.random() * 900) + 100;
  const mockRating   = (3.8 + Math.random() * 1.2).toFixed(1);
  const watchPct     = Math.floor(Math.random() * 70);

  return (
    <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s', transform: hovered ? 'translateY(-4px)' : '', boxShadow: hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <VideoThumbnail video={video} watchPct={watchPct} onWatch={() => isPaid && (video.youtube_link || video.drive_link) && window.open(video.youtube_link || video.drive_link, '_blank')} />
      <div style={{ padding: 16 }}>
        {/* Category tag */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.4, padding: '2px 8px', borderRadius: 5, background: `${c1}14`, color: c1 }}>
            {video.course_title || 'General'}
          </span>
          {rank && (
            <span style={{ fontSize: 10, fontWeight: 800, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Star size={10} fill="#F59E0B" /> {mockRating}
            </span>
          )}
        </div>
        <h4 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 8px', color: 'var(--text-primary)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {video.title}
        </h4>
        <div style={{ display: 'flex', gap: 12, fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 12, flexWrap: 'wrap' }}>
          {video.instructor && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><User size={11} /> {video.instructor}</span>}
          {video.duration && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={11} /> {video.duration}</span>}
          {video.uploaded_at && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={11} /> {video.uploaded_at}</span>}
        </div>
        {/* Watch progress */}
        {watchPct > 0 && isPaid && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: 600 }}>Progress</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: '#EF4444' }}>{watchPct}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${watchPct}%`, background: '#EF4444', borderRadius: 99 }} />
            </div>
          </div>
        )}
        <button onClick={() => isPaid && (video.youtube_link || video.drive_link) && window.open(video.youtube_link || video.drive_link, '_blank')}
          style={{ width: '100%', padding: '9px', borderRadius: 10, border: 'none', cursor: isPaid ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: isPaid ? `linear-gradient(135deg, ${c1}, ${c2})` : 'rgba(239, 68, 68, 0.08)', color: isPaid ? '#fff' : '#EF4444', border: isPaid ? 'none' : '1px solid rgba(239,68,68,0.2)', boxShadow: isPaid ? `0 4px 12px ${c1}30` : 'none', transition: 'all 0.15s' }}>
          {isPaid ? <Play size={13} style={{ marginLeft: -2 }} /> : <Lock size={13} strokeWidth={1.75} />}
          {isPaid ? (watchPct > 0 ? 'Continue Watching' : 'Watch Now') : 'Premium Content Locked'}
        </button>
      </div>
    </div>
  );
};

/* ── Continue Watching Card ─────────────────────── */
const ContinueCard = ({ video, onWatch, isPaid }) => {
  const watchPct = Math.floor(Math.random() * 80) + 10;
  const { c1 } = getCatColor(video.course_title || video.title || '');
  return (
    <div style={{ minWidth: 260, borderRadius: 16, overflow: 'hidden', background: 'white', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)', flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
      <div style={{ position: 'relative' }}>
        <VideoThumbnail video={video} size="continue" watchPct={watchPct} onWatch={onWatch} />
      </div>
      <div style={{ padding: '12px 14px' }}>
        <p style={{ fontSize: 13, fontWeight: 800, margin: '0 0 3px', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.title}</p>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 8px' }}>{video.course_title}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${watchPct}%`, background: '#EF4444', borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#EF4444' }}>{watchPct}%</span>
        </div>
      </div>
    </div>
  );
};

/* ── Popular Card (ranked list) ─────────────────── */
const PopularCard = ({ video, rank, isPaid }) => {
  const { c1 } = getCatColor(video.course_title || video.title || '');
  const mockViews = `${(Math.floor(Math.random() * 9) + 1).toFixed(0)}.${Math.floor(Math.random() * 9)}k`;
  const mockRating = (3.8 + Math.random() * 1.2).toFixed(1);
  return (
    <div style={{ display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 14, background: '#fafafd', border: '1px solid rgba(0,0,0,0.04)', alignItems: 'center', transition: 'all 0.15s', cursor: 'pointer' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'rgba(108,60,240,0.12)'; e.currentTarget.style.transform = 'translateX(4px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fafafd'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.04)'; e.currentTarget.style.transform = ''; }}
      onClick={() => isPaid && (video.youtube_link || video.drive_link) && window.open(video.youtube_link || video.drive_link, '_blank')}>
      {/* Rank */}
      <div style={{ width: 32, height: 32, borderRadius: 10, background: rank <= 3 ? `linear-gradient(135deg, ${c1}, ${c1}cc)` : 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 900, color: rank <= 3 ? '#fff' : 'var(--text-tertiary)' }}>
        {rank}
      </div>
      {/* Thumb */}
      <div style={{ width: 60, height: 38, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: `linear-gradient(135deg, ${c1}, ${c1}cc)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 18, fontWeight: 900 }}>
        {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (video.title || 'V')[0]}
      </div>
      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{video.title}</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
          <span>{video.course_title}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Eye size={10} /> {mockViews}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#F59E0B' }}><Star size={10} fill="#F59E0B" /> {mockRating}</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{video.duration}</div>
    </div>
  );
};

/* ── Main Component ─────────────────────────────── */
const RecordedClassesPage = ({ dashboardData, isPaid }) => {
  const [search, setSearch]   = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort]       = useState('recent');

  const allVideos = dashboardData?.recordedClasses || [];

  /* ── Derived lists ── */
  const filtered = useMemo(() => {
    let list = [...allVideos];
    if (search) list = list.filter(v => v.title.toLowerCase().includes(search.toLowerCase()) || (v.course_title || '').toLowerCase().includes(search.toLowerCase()));
    if (category !== 'all') list = list.filter(v => matchesCategory(v, category));
    switch (sort) {
      case 'alpha':    list.sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'duration': list.sort((a, b) => (parseInt(b.duration) || 0) - (parseInt(a.duration) || 0)); break;
      default: break;
    }
    return list;
  }, [allVideos, search, category, sort]);

  const continueWatching = useMemo(() => allVideos.slice(0, 6), [allVideos]);
  const recentUploads    = useMemo(() => allVideos.slice(0, 4), [allVideos]);
  const popular          = useMemo(() => allVideos.slice(0, 6), [allVideos]);

  /* ── Empty state ── */
  if (allVideos.length === 0) {
    return (
      <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 20, padding: 60, textAlign: 'center', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Video size={48} strokeWidth={1.75} color="var(--text-secondary)" style={{ marginBottom: 16 }} />
        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>No Recorded Classes Available</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>Recorded sessions uploaded by the admin will appear here.</p>
      </div>
    );
  }

  const activeCat = CATEGORIES.find(c => c.id === category) || CATEGORIES[0];

  return (
    <div>
      {/* ── SEARCH + FILTER BAR ── */}
      <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 18, padding: '18px 22px', marginBottom: 28, boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '9px 14px', flex: 1, minWidth: 220, transition: 'all 0.15s' }}
          onFocus={e => { e.currentTarget.style.border = '1px solid var(--primary-color)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(108,60,240,0.08)'; }}
          onBlur={e => { e.currentTarget.style.border = '1px solid rgba(0,0,0,0.06)'; e.currentTarget.style.boxShadow = 'none'; }}>
          <Search size={15} color="var(--text-secondary)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search classes, topics, trainers…" style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13.5, fontFamily: 'inherit', width: '100%', color: 'var(--text-primary)' }} />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '9px 14px', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 10, fontFamily: 'inherit', fontSize: 13, color: 'var(--text-primary)', background: 'white', cursor: 'pointer', outline: 'none' }}>
          {SORT_OPTIONS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
        </select>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
          {filtered.length} {filtered.length === 1 ? 'video' : 'videos'}
        </div>
      </div>

      {/* ── CATEGORY TABS ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => setCategory(cat.id)} style={{
            flexShrink: 0, padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, transition: 'all 0.15s',
            background: category === cat.id ? cat.color : 'white',
            color: category === cat.id ? '#fff' : 'var(--text-secondary)',
            border: category === cat.id ? 'none' : '1px solid var(--border-color)',
            boxShadow: category === cat.id ? `0 4px 12px ${cat.color}30` : 'none',
          }}>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── CONTINUE WATCHING ── (only show when no search/category filter) */}
      {!search && category === 'all' && continueWatching.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PlayCircle size={20} strokeWidth={1.75} color="var(--primary-color)" /> Continue Watching
            </h3>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>{continueWatching.length} in progress</span>
          </div>
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
            {continueWatching.map((v, i) => (
              <ContinueCard key={i} video={v} isPaid={isPaid} onWatch={() => isPaid && (v.youtube_link || v.drive_link) && window.open(v.youtube_link || v.drive_link, '_blank')} />
            ))}
          </div>
        </div>
      )}

      {/* ── RECENTLY UPLOADED + POPULAR ── */}
      {!search && category === 'all' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28, marginBottom: 32 }}>

          {/* Recently Uploaded */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={18} color="var(--primary-color)" /> Recently Uploaded
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {recentUploads.map((v, i) => (
                <VideoCard key={i} video={v} isPaid={isPaid} onWatch={() => isPaid && (v.youtube_link || v.drive_link) && window.open(v.youtube_link || v.drive_link, '_blank')} />
              ))}
            </div>
          </div>

          {/* Popular */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrendingUp size={18} color="#F59E0B" /> Popular Classes
              </h3>
            </div>
            <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              {popular.map((v, i) => (
                <div key={i} style={{ borderBottom: i < popular.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', padding: '4px 8px' }}>
                  <PopularCard video={v} rank={i + 1} isPaid={isPaid} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ALL / FILTERED GRID ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} color="var(--primary-color)" />
            {search ? `Results for "${search}"` : category === 'all' ? 'All Classes' : activeCat.label}
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 12px', background: 'rgba(108,60,240,0.06)', borderRadius: 8, fontWeight: 700, color: 'var(--primary-color)' }}>
            {filtered.length} videos
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: 'white', borderRadius: 18, border: '1px solid var(--border-color)' }}>
            <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 6px' }}>No videos match your search</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Try a different keyword or category</p>
            <button onClick={() => { setSearch(''); setCategory('all'); }} style={{ marginTop: 16, padding: '9px 20px', background: 'var(--primary-color)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {filtered.map((v, i) => (
              <VideoCard key={i} video={v} isPaid={isPaid} rank={i + 1} onWatch={() => isPaid && (v.youtube_link || v.drive_link) && window.open(v.youtube_link || v.drive_link, '_blank')} />
            ))}
          </div>
        )}
      </div>

      {/* Paywall banner if not paid */}
      {!isPaid && (
        <div style={{ marginTop: 28, background: 'linear-gradient(135deg, #1e1b4b, #312e81)', borderRadius: 20, padding: '26px 32px', display: 'flex', alignItems: 'center', gap: 20, border: '1px solid rgba(167,139,250,0.2)' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(167,139,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Lock size={22} strokeWidth={1.75} color="#c084fc" />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ color: '#fff', fontSize: 16, fontWeight: 800, margin: '0 0 5px', display: 'flex', alignItems: 'center', gap: 6 }}>
              Unlock All {allVideos.length} Recordings <span style={{ fontSize: 10, background: '#EF4444', color: '#fff', padding: '2px 8px', borderRadius: 20 }}>Premium Lock</span>
            </h4>
            <p style={{ color: '#C084FC', fontSize: 13.5, margin: 0, fontWeight: 500 }}>Premium content is available only for students with active enrollment.</p>
          </div>
          <div style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 10, padding: '8px 16px', fontSize: 12.5, fontWeight: 800, color: '#c084fc', flexShrink: 0 }}>
            Fees Payment Pending
          </div>
        </div>
      )}
    </div>
  );
};

const RecordedClassesPageWithErrorBoundary = (props) => {
  return (
    <ErrorBoundary>
      <RecordedClassesPage {...props} />
    </ErrorBoundary>
  );
};

export default RecordedClassesPageWithErrorBoundary;
