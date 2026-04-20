import React, { useState } from 'react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AttendanceCalendar = ({ calendarData, year, month, joinDate, expiryDate, onMonthChange }) => {
  const [tooltipDay, setTooltipDay] = useState(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  const joinStart = joinDate ? new Date(new Date(joinDate).setHours(0, 0, 0, 0)) : null;
  const expiryEnd = expiryDate ? new Date(new Date(expiryDate).setHours(23, 59, 59, 999)) : null;

  const days = calendarData?.days || {};

  const getCellState = (day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(year, month - 1, day);
    const isToday = dateStr === todayStr;
    const isFuture = date > today;
    const isBeforeJoin = joinStart && date < joinStart;
    const isAfterExpiry = expiryEnd && date > expiryEnd;
    const isMembershipDay = !isBeforeJoin && !isAfterExpiry;
    const hasCheckIn = days[dateStr]?.some((l) => l.type === 'check-in');
    const logs = days[dateStr] || [];

    let status;
    if (!isMembershipDay) {
      status = 'no-membership';
    } else if (isFuture) {
      status = 'future';
    } else if (hasCheckIn) {
      status = 'present';
    } else {
      status = 'absent';
    }

    return { dateStr, status, isToday, logs };
  };

  const getStatusClasses = (status, isToday) => {
    const base = 'aspect-square flex flex-col items-center justify-center text-xs sm:text-sm rounded-[5px] relative cursor-default transition-colors';
    const ring = isToday ? ' ring-2 ring-slate-900' : '';

    switch (status) {
      case 'present':
        return `${base} bg-green-100 text-green-800 font-semibold${ring}`;
      case 'absent':
        return `${base} bg-red-50 text-red-400${ring}`;
      case 'future':
        return `${base} bg-white text-slate-400 border border-dashed border-slate-200${ring}`;
      case 'no-membership':
        return `${base} bg-slate-50 text-slate-300${ring}`;
      default:
        return `${base} bg-white text-slate-400${ring}`;
    }
  };

  const handlePrev = () => {
    const newMonth = month === 1 ? 12 : month - 1;
    const newYear = month === 1 ? year - 1 : year;
    onMonthChange({ year: newYear, month: newMonth });
  };

  const handleNext = () => {
    const newMonth = month === 12 ? 1 : month + 1;
    const newYear = month === 12 ? year + 1 : year;
    onMonthChange({ year: newYear, month: newMonth });
  };

  // Count stats for this month view
  let presentCount = 0;
  let absentCount = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const { status } = getCellState(d);
    if (status === 'present') presentCount++;
    if (status === 'absent') absentCount++;
  }

  return (
    <div className="bg-white border border-slate-200 p-6 shadow-sm dark:bg-slate-900 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrev}
          aria-label="Previous month"
          className="rounded-[5px] border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-100"
        >
          &lt;
        </button>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <button
          onClick={handleNext}
          aria-label="Next month"
          className="rounded-[5px] border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-100"
        >
          &gt;
        </button>
      </div>

      {/* Month summary */}
      <div className="flex gap-4 mb-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-200 dark:border-green-800/60"></span>
          Present: {presentCount}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/60"></span>
          Absent: {absentCount}
        </span>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((day, i) => (
          <div key={day} className="text-center text-xs font-semibold text-slate-500 uppercase py-1 dark:text-slate-400">
            <span className="hidden sm:inline">{day}</span>
            <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading blanks */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square"></div>
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const { dateStr, status, isToday, logs } = getCellState(day);

          return (
            <div
              key={day}
              className={getStatusClasses(status, isToday)}
              onMouseEnter={() => logs.length > 0 && setTooltipDay(dateStr)}
              onMouseLeave={() => setTooltipDay(null)}
            >
              <span>{day}</span>
              {status === 'present' && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-0.5"></span>
              )}

              {/* Tooltip */}
              {tooltipDay === dateStr && logs.length > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10 bg-slate-900 text-white text-xs rounded-[5px] px-3 py-2 whitespace-nowrap shadow-lg">
                  {logs
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                    .map((log, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className={log.type === 'check-in' ? 'text-green-400' : 'text-red-400'}>
                          {log.type === 'check-in' ? 'In' : 'Out'}
                        </span>
                        <span>{formatTime(log.timestamp)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {presentCount === 0 && absentCount === 0 && (
        <div className="mt-3 bg-slate-50 border border-slate-200 rounded-[5px] px-4 py-3 text-center dark:bg-slate-950 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">No attendance recorded this month</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceCalendar;
