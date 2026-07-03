import { createContext, useContext, useState } from 'react';

const FilterContext = createContext();

export const FilterProvider = ({ children }) => {
  const [filters, setFilters] = useState({
    datePreset: 'custom',
    startDate: '2020-01-01',
    endDate: new Date().toISOString().split('T')[0],
    dateLabel: 'All Time',
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
