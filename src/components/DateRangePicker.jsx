import React, { useState, useRef, useEffect } from 'react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, getYear, setMonth, setYear } from 'date-fns';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import './DateRangePicker.css';

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const QUICK_PRESETS = [
  { label: "Today", get: () => { const t = format(new Date(), "yyyy-MM-dd"); return { start: t, end: t, label: "Today" }; } },
  { label: "Yesterday", get: () => { const t = format(subDays(new Date(), 1), "yyyy-MM-dd"); return { start: t, end: t, label: "Yesterday" }; } },
  { label: "Last 7 days", get: () => ({ start: format(subDays(new Date(), 6), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd"), label: "Last 7 days" }) },
  { label: "Last 30 days", get: () => ({ start: format(subDays(new Date(), 29), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd"), label: "Last 30 days" }) },
  { label: "This month", get: () => ({ start: format(startOfMonth(new Date()), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd"), label: "This month" }) },
  { label: "This year", get: () => ({ start: format(startOfYear(new Date()), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd"), label: "This year" }) },
  { label: "All time", get: () => ({ start: "2020-01-01", end: format(new Date(), "yyyy-MM-dd"), label: "All time" }) }
];

export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("quick");
  const [monthYear, setMonthYear] = useState(getYear(new Date()));
  const [customFrom, setCustomFrom] = useState(value.start);
  const [customTo, setCustomTo] = useState(value.end);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const close = () => setOpen(false);

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    const start = customFrom <= customTo ? customFrom : customTo;
    const end = customFrom <= customTo ? customTo : customFrom;
    onChange({ start, end, label: `Custom (${start} to ${end})` });
    close();
  };

  const selectMonth = (monthIndex) => {
    const d = setMonth(setYear(new Date(), monthYear), monthIndex);
    const start = format(startOfMonth(d), "yyyy-MM-dd");
    const endD = endOfMonth(d);
    const end = endD > new Date() ? format(new Date(), "yyyy-MM-dd") : format(endD, "yyyy-MM-dd");
    onChange({ start, end, label: `${MONTH_NAMES[monthIndex]} ${monthYear}` });
    close();
  };

  const currentYear = getYear(new Date());
  const displayLabel = value.label || `${value.start} to ${value.end}`;

  return (
    <div className="drp-container" ref={ref}>
      <button className="drp-trigger" onClick={() => setOpen(!open)}>
        <Calendar size={14} className="drp-icon" />
        <span className="drp-label">{displayLabel}</span>
        <ChevronDown size={14} className="drp-chevron" />
      </button>

      {open && (
        <div className="drp-popover">
          <div className="drp-tabs">
            {["quick", "month", "custom"].map(t => (
              <button 
                key={t}
                className={`drp-tab-btn ${tab === t ? 'active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "quick" && (
            <div className="drp-quick-list">
              {QUICK_PRESETS.map(p => (
                <button
                  key={p.label}
                  className={`drp-quick-btn ${value.label === p.label ? 'active' : ''}`}
                  onClick={() => { onChange(p.get()); close(); }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {tab === "month" && (
            <div className="drp-month-picker">
              <div className="drp-year-nav">
                <button onClick={() => setMonthYear(y => y - 1)} disabled={monthYear <= 2020}>
                  <ChevronLeft size={16} />
                </button>
                <span>{monthYear}</span>
                <button onClick={() => setMonthYear(y => y + 1)} disabled={monthYear >= currentYear}>
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="drp-month-grid">
                {MONTH_NAMES.map((name, i) => {
                  const isFuture = monthYear === currentYear && i > new Date().getMonth();
                  return (
                    <button
                      key={name}
                      onClick={() => !isFuture && selectMonth(i)}
                      disabled={isFuture}
                      className={`drp-month-btn ${isFuture ? 'disabled' : ''}`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "custom" && (
            <div className="drp-custom-picker">
              <div className="drp-input-group">
                <label>From Date</label>
                <input type="date" value={customFrom} max={format(new Date(), "yyyy-MM-dd")} onChange={e => setCustomFrom(e.target.value)} />
              </div>
              <div className="drp-input-group">
                <label>To Date</label>
                <input type="date" value={customTo} max={format(new Date(), "yyyy-MM-dd")} onChange={e => setCustomTo(e.target.value)} />
              </div>
              <button className="drp-apply-btn" onClick={applyCustom} disabled={!customFrom || !customTo}>
                Apply Range
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
