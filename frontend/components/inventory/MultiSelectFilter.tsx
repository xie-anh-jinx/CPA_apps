"use client";
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check } from 'lucide-react';

export interface MultiSelectOption {
  label: string;
  value: string;
  badge?: string;
  count?: number;
  color?: string;
  subLabel?: string;
}

export interface MultiSelectFilterProps {
  title: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  onRemoteSearch?: (query: string) => void;
  remoteSearchLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  searchable?: boolean;
  align?: 'left' | 'right';
  popoverWidth?: string | number;
  icon?: React.ReactNode;
  compact?: boolean;
  style?: React.CSSProperties;
}

export default function MultiSelectFilter({
  title,
  options,
  selectedValues = [],
  onChange,
  onRemoteSearch,
  remoteSearchLabel,
  placeholder = "Semua",
  searchPlaceholder = "Cari opsi...",
  searchable = true,
  align = 'left',
  popoverWidth = 260,
  icon,
  compact = false,
  style,
}: MultiSelectFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reset search when opening
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(
      opt =>
        opt.label.toLowerCase().includes(term) ||
        opt.value.toLowerCase().includes(term) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(term))
    );
  }, [options, searchTerm]);

  const handleToggle = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAllFiltered = () => {
    const allFilteredVals = filteredOptions.map(o => o.value);
    const combined = Array.from(new Set([...selectedValues, ...allFilteredVals]));
    onChange(combined);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const hasSelection = selectedValues.length > 0;

  // Compute trigger label
  const triggerLabel = useMemo(() => {
    if (!hasSelection) return placeholder;
    if (selectedValues.length === 1) {
      const match = options.find(o => o.value === selectedValues[0]);
      return match ? match.label : selectedValues[0];
    }
    return `${selectedValues.length} Dipilih`;
  }, [hasSelection, selectedValues, options, placeholder]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          padding: compact ? '4px 8px' : '7px 10px',
          fontSize: compact ? '0.74rem' : '0.82rem',
          borderRadius: '6px',
          border: hasSelection
            ? '1px solid #38bdf8'
            : '1px solid var(--bg-border, #444444)',
          background: hasSelection
            ? 'rgba(56, 189, 248, 0.12)'
            : 'var(--bg-card, #1e1e1e)',
          color: hasSelection
            ? '#38bdf8'
            : 'var(--text-secondary, #b6b6b6)',
          cursor: 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
          fontWeight: hasSelection ? 600 : 400,
          textAlign: 'left',
          minHeight: compact ? '28px' : '34px',
        }}
        title={`${title}: ${triggerLabel}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', flex: 1 }}>
          {icon && (
            <span style={{ display: 'inline-flex', opacity: hasSelection ? 1 : 0.7, flexShrink: 0 }}>
              {icon}
            </span>
          )}
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
              color: hasSelection ? '#38bdf8' : 'var(--text-secondary, #b6b6b6)',
            }}
          >
            {triggerLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {hasSelection && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              title="Hapus filter"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                borderRadius: '50%',
                background: 'rgba(56, 189, 248, 0.2)',
                color: '#38bdf8',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(56, 189, 248, 0.2)')}
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={13}
            style={{
              transition: 'transform 0.15s ease',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              opacity: 0.7,
            }}
          />
        </div>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            [align]: 0,
            width: typeof popoverWidth === 'number' ? `${popoverWidth}px` : popoverWidth,
            minWidth: '240px',
            maxWidth: '92vw',
            background: 'var(--bg-surface, #242424)',
            border: '1px solid var(--bg-border, #444444)',
            borderRadius: '8px',
            boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.6), 0 6px 12px -2px rgba(0, 0, 0, 0.4)',
            zIndex: 999,
            padding: '8px',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.15s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header & Quick Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '6px',
              borderBottom: '1px solid var(--bg-border, #3a3a3a)',
              marginBottom: '6px',
              fontSize: '0.72rem',
              color: 'var(--text-muted, #828690)',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-primary, #ffffff)' }}>
              Filter {title}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                }}
                title="Pilih semua yang tampil"
              >
                Pilih Semua
              </button>
              {hasSelection && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#f87171',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                  }}
                  title="Reset pilihan"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Search box if searchable */}
          {searchable && (
            <div style={{ position: 'relative', marginBottom: '6px' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted, #828690)',
                }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onRemoteSearch && searchTerm.trim()) {
                    e.preventDefault();
                    onRemoteSearch(searchTerm.trim());
                    setIsOpen(false);
                  }
                }}
                placeholder={searchPlaceholder}
                autoFocus
                style={{
                  width: '100%',
                  padding: '5px 24px 5px 26px',
                  fontSize: '0.74rem',
                  borderRadius: '5px',
                  border: '1px solid var(--bg-border, #444444)',
                  background: 'var(--bg-base, #1a1a1a)',
                  color: 'var(--text-primary, #ffffff)',
                  outline: 'none',
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted, #828690)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Options List */}
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              paddingRight: '2px',
            }}
          >
            {filteredOptions.length === 0 ? (
              <div
                style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted, #828690)',
                }}
              >
                <div>Tidak ada opsi yang cocok</div>
                {searchTerm.trim() && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      handleToggle(searchTerm.trim());
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      borderRadius: '4px',
                      border: '1px solid #38bdf8',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    + Pilih &ldquo;{searchTerm.trim()}&rdquo;
                  </button>
                )}
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    onClick={(e) => {
                      e.preventDefault();
                      handleToggle(opt.value);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '5px 8px',
                      borderRadius: '5px',
                      background: isChecked ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.12s ease',
                      userSelect: 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      {/* Custom Checkbox */}
                      <div
                        style={{
                          width: '15px',
                          height: '15px',
                          borderRadius: '4px',
                          border: `1.5px solid ${isChecked ? '#38bdf8' : 'var(--bg-border, #666)'}`,
                          background: isChecked ? '#38bdf8' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.12s ease',
                        }}
                      >
                        {isChecked && <Check size={11} color="#000" strokeWidth={3} />}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: isChecked ? '#38bdf8' : 'var(--text-primary, #ffffff)',
                            fontWeight: isChecked ? 600 : 400,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={opt.label}
                        >
                          {opt.badge && <span style={{ marginRight: '5px' }}>{opt.badge}</span>}
                          {opt.label}
                        </div>
                        {opt.subLabel && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted, #828690)' }}>
                            {opt.subLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {opt.count !== undefined && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '1px 5px',
                          borderRadius: '10px',
                          background: isChecked ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.07)',
                          color: isChecked ? '#38bdf8' : 'var(--text-muted, #828690)',
                          flexShrink: 0,
                          fontWeight: 500,
                        }}
                      >
                        {opt.count}
                      </span>
                    )}
                  </label>
                );
              })
            )}
          </div>

          {/* Remote Search Across Database if provided */}
          {onRemoteSearch && searchTerm.trim() && (
            <div style={{ paddingTop: '6px', marginTop: '6px', borderTop: '1px solid var(--bg-border, #3a3a3a)' }}>
              <button
                type="button"
                onClick={() => {
                  onRemoteSearch(searchTerm.trim());
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  fontSize: '0.74rem',
                  borderRadius: '5px',
                  border: '1px solid #38bdf8',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
                title={`Cari "${searchTerm.trim()}" di seluruh database`}
              >
                <Search size={12} />
                <span>{remoteSearchLabel || `Cari "${searchTerm.trim()}" di Semua Tahun`}</span>
              </button>
            </div>
          )}

          {/* Footer Info */}
          <div
            style={{
              paddingTop: '6px',
              marginTop: '6px',
              borderTop: '1px solid var(--bg-border, #3a3a3a)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.68rem',
              color: 'var(--text-muted, #828690)',
            }}
          >
            <span>Total: {options.length} opsi</span>
            {hasSelection && (
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>
                {selectedValues.length} dipilih
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
