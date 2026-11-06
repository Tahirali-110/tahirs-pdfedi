import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronUp, X, CaseSensitive } from 'lucide-react';
import { usePdfStore } from '../store/usePdfStore';
import { searchDocument } from '../utils/api';

export default function SearchBar() {
  const {
    isSearchOpen,
    closeSearch,
    searchQuery,
    searchMatches,
    currentMatchIndex,
    setSearch,
    nextMatch,
    prevMatch,
    showToast,
  } = usePdfStore();

  const [inputVal, setInputVal] = useState(searchQuery || '');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) {
      setSearch({ query: '', matches: [] });
      return;
    }

    try {
      setIsSearching(true);
      const res = await searchDocument(inputVal.trim(), caseSensitive);
      setSearch({ query: inputVal.trim(), matches: res.matches || [] });
      if (res.matches?.length > 0) {
        showToast(`Found ${res.matches.length} match(es)`, 'info');
      } else {
        showToast(`No matches found for "${inputVal}"`, 'info');
      }
    } catch (err) {
      showToast(`Search error: ${err.message}`, 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      closeSearch();
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        prevMatch();
      } else if (searchMatches.length > 0) {
        nextMatch();
      } else {
        handleSearch();
      }
    }
  };

  return (
    <div className="search-floating-bar">
      <Search size={16} color="var(--accent-primary)" />

      <input
        ref={inputRef}
        type="text"
        className="search-floating-input"
        placeholder="Find in document..."
        value={inputVal}
        onChange={(e) => setInputVal(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {/* Match Count Indicator */}
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: '60px' }}>
        {searchMatches.length > 0
          ? `${currentMatchIndex + 1} of ${searchMatches.length}`
          : inputVal
          ? '0 found'
          : ''}
      </span>

      {/* Case Sensitive Toggle */}
      <button
        className={`action-icon-btn ${caseSensitive ? 'active' : ''}`}
        onClick={() => setCaseSensitive(!caseSensitive)}
        title={caseSensitive ? 'Match Case (Active)' : 'Match Case'}
        style={{ color: caseSensitive ? 'var(--accent-primary)' : 'var(--text-muted)' }}
      >
        <CaseSensitive size={16} />
      </button>

      {/* Navigation Buttons */}
      <button
        className="action-icon-btn"
        disabled={searchMatches.length === 0}
        onClick={prevMatch}
        title="Previous Match (Shift+Enter)"
      >
        <ChevronUp size={16} />
      </button>
      <button
        className="action-icon-btn"
        disabled={searchMatches.length === 0}
        onClick={nextMatch}
        title="Next Match (Enter)"
      >
        <ChevronDown size={16} />
      </button>

      <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)', margin: '0 2px' }} />

      {/* Close Button */}
      <button className="action-icon-btn" onClick={closeSearch} title="Close (Esc)">
        <X size={16} />
      </button>
    </div>
  );
}

