import React, { useState, useEffect, useRef } from 'react';
import { Search, RotateCcw, Download, ChevronDown, FileText, FileSpreadsheet } from 'lucide-react';

const FilterBar = ({
  searchPlaceholder = 'Search...',
  searchValue = '',
  onSearchChange,
  filters = [], // Array of { label, value, options: [{value, label}], onChange }
  // Date-related props
  showDateFilter = false,
  activeQuickFilter = 'Today',
  onQuickFilterChange,
  startDateValue = '',
  endDateValue = '',
  onStartDateChange,
  onEndDateChange,
  // Reset and Export actions
  onReset,
  onExportCSV,
  onExportExcel,
  onExportPDF
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const quickFilterOptions = ['Today', 'This Week', 'This Month', 'This Year', 'Custom Range'];

  return (
    <div className="levlox-filter-bar animate-fade-in">
      {/* Row 1 */}
      <div className="levlox-filter-row-1">
        {/* Search Box (left) */}
        {onSearchChange !== undefined && (
          <div className="levlox-filter-search-container">
            <Search size={16} className="levlox-filter-search-icon" />
            <input
              type="text"
              className="levlox-filter-search-input"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        )}

        {/* Dropdown Filters (center) */}
        <div className="levlox-filter-dropdown-container">
          {filters.map((filter, index) => (
            <select
              key={index}
              className="levlox-filter-dropdown"
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
            >
              <option value="">{filter.label}</option>
              {filter.options.map((opt, oIdx) => (
                <option key={oIdx} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ))}
        </div>

        {/* Action Buttons: Reset & Export (right) */}
        <div className="levlox-filter-actions">
          {onReset && (
            <button
              type="button"
              className="levlox-filter-reset-btn"
              onClick={onReset}
              title="Reset all filters"
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          )}

          {/* Export Menu Dropdown */}
          <div className="levlox-filter-export-container" ref={exportRef}>
            <button
              type="button"
              className="levlox-filter-export-btn"
              onClick={() => setExportOpen(!exportOpen)}
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown
                size={12}
                style={{
                  transform: exportOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                  marginLeft: '4px'
                }}
              />
            </button>

            {exportOpen && (
              <div className="levlox-filter-export-menu">
                {onExportCSV && (
                  <button
                    type="button"
                    className="levlox-filter-export-item"
                    onClick={() => {
                      onExportCSV();
                      setExportOpen(false);
                    }}
                  >
                    <FileText size={14} />
                    <span>Export CSV</span>
                  </button>
                )}
                {onExportExcel && (
                  <button
                    type="button"
                    className="levlox-filter-export-item"
                    onClick={() => {
                      onExportExcel();
                      setExportOpen(false);
                    }}
                  >
                    <FileSpreadsheet size={14} style={{ color: '#10B981' }} />
                    <span>Export Excel</span>
                  </button>
                )}
                {onExportPDF && (
                  <button
                    type="button"
                    className="levlox-filter-export-item"
                    onClick={() => {
                      onExportPDF();
                      setExportOpen(false);
                    }}
                  >
                    <FileText size={14} style={{ color: '#EF4444' }} />
                    <span>Export PDF</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2 (Quick Filter Chips, only shown if showDateFilter is true) */}
      {showDateFilter && (
        <div className="levlox-filter-row-2">
          <div className="levlox-filter-pill-container">
            {quickFilterOptions.map((pill, pIdx) => (
              <button
                key={pIdx}
                type="button"
                className={`levlox-filter-pill ${activeQuickFilter === pill ? 'active' : ''}`}
                onClick={() => onQuickFilterChange && onQuickFilterChange(pill)}
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers displayed inline next to the pills when Custom Range is active */}
          {activeQuickFilter === 'Custom Range' && onStartDateChange && onEndDateChange && (
            <div className="levlox-filter-date-container">
              <input
                type="date"
                className="levlox-filter-date-input"
                value={startDateValue}
                onChange={(e) => onStartDateChange(e.target.value)}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>to</span>
              <input
                type="date"
                className="levlox-filter-date-input"
                value={endDateValue}
                onChange={(e) => onEndDateChange(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
