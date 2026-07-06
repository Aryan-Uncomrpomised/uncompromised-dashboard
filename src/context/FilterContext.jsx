import { createContext, useContext, useState } from 'react';
import { subDays, format } from 'date-fns';

const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const thirtyDaysAgoStr = format(subDays(new Date(), 29), 'yyyy-MM-dd');

  const [filters, setFilters] = useState({
    datePreset: 'quick',
    startDate: thirtyDaysAgoStr,
    endDate: todayStr,
    dateLabel: 'Last 30 days',
    category: 'all',
    city: 'all',
    customer: 'all'
  });
  
  const [filterOptions, setFilterOptions] = useState({
    cities: [],
    customers: [],
    categories: []
  });

  return (
    <FilterContext.Provider value={{ filters, setFilters, filterOptions, setFilterOptions }}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => useContext(FilterContext);
