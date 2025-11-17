import React from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth } from 'date-fns';
// @ts-ignore
import * as dateFnsTz from 'date-fns-tz';
const toZonedTime = dateFnsTz.toZonedTime || ((date: Date, _tz: string) => date);

interface Holiday {
  id: string;
  name: string;
  date: string;
  type?: string; // e.g. 'public', 'optional', etc.
  description?: string;
}

interface CustomCalendarProps {
  month: Date;
  holidays: Holiday[];
  onMonthChange?: (date: Date) => void;
}

const HOLIDAY_COLORS: Record<string, string> = {
  public: 'bg-blue-500',
  optional: 'bg-green-500',
  religious: 'bg-yellow-500',
  other: 'bg-gray-400',
};

function getHolidayColor(type?: string) {
  if (!type) return HOLIDAY_COLORS.other;
  return HOLIDAY_COLORS[type] || HOLIDAY_COLORS.other;
}

export const CustomCalendar: React.FC<CustomCalendarProps> = ({ month, holidays, onMonthChange }) => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = '';

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      // Convert both calendar day and holiday date to EST
      const formattedDate = format(day, 'd');
      const holiday = holidays.find(h => {
        const holidayDate = new Date(h.date + 'T00:00:00');
        return (
          holidayDate.getFullYear() === day.getFullYear() &&
          holidayDate.getMonth() === day.getMonth() &&
          holidayDate.getDate() === day.getDate()
        );
      });
      days.push(
        <div
          className={`flex flex-col items-center justify-center border h-24 relative bg-white rounded-xl transition-all duration-150 cursor-pointer group
            ${!isSameMonth(day, monthStart) ? 'bg-gray-50 text-gray-300' : ''}
            ${(day.getDay() === 0 || day.getDay() === 6) && isSameMonth(day, monthStart) ? 'bg-pink-50' : ''}
            ${holiday ? getHolidayColor(holiday?.type) + ' bg-opacity-20 ring-2 ring-blue-100' : ''}
            hover:bg-blue-50 hover:shadow-lg`}
          key={day.toString()}
        >
          <span className={`font-semibold text-lg mb-1 transition-all duration-150
            ${format(new Date(), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') ? 'text-white bg-blue-500 ring-4 ring-blue-300 rounded-full px-2 py-1 shadow-md' : ''}
            ${holiday ? 'font-extrabold text-blue-900' : ''}
          `}>{formattedDate}</span>
          {holiday && (
            <div className="mt-1 flex flex-col items-center">
              <span className={`w-3 h-3 rounded-full ${getHolidayColor(holiday.type)} border-2 border-white shadow`} title={holiday.name}></span>
              <span className="text-xs mt-2 font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded shadow-sm group-hover:bg-blue-200 transition-all duration-150" title={holiday.description}>{holiday.name}</span>
            </div>
          )}
        </div>
      );
      day = addDays(day, 1);
    }
    rows.push(...days);
    days = [];
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-xl shadow-2xl p-6 border border-blue-100">
      <div className="flex items-center justify-between mb-6">
        <button
          className="px-3 py-1 rounded-lg border border-gray-300 bg-gray-100 hover:bg-blue-100 text-lg font-bold transition-all duration-150"
          onClick={() => onMonthChange && onMonthChange(addDays(monthStart, -1))}
        >
          {'<'}
        </button>
        <h2 className="text-2xl font-extrabold tracking-wide text-blue-800 drop-shadow-sm">{format(month, 'MMMM yyyy')}</h2>
        <button
          className="px-3 py-1 rounded-lg border border-gray-300 bg-gray-100 hover:bg-blue-100 text-lg font-bold transition-all duration-150"
          onClick={() => onMonthChange && onMonthChange(addDays(monthEnd, 1))}
        >
          {'>'}
        </button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, idx) => (
          <div
            className={`text-center font-semibold ${idx === 0 || idx === 6 ? 'text-pink-500 bg-pink-50' : 'text-gray-600'} py-2 rounded-lg`}
            key={d}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 w-full">
        {rows}
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-6">
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-200"></span> <span className="text-sm font-semibold text-blue-700">Public</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-200"></span> <span className="text-sm font-semibold text-green-700">Optional</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-yellow-200"></span> <span className="text-sm font-semibold text-yellow-700">Religious</span></div>
        <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-gray-400 border-2 border-gray-200"></span> <span className="text-sm font-semibold text-gray-700">Other</span></div>
      </div>
    </div>
  );
};
