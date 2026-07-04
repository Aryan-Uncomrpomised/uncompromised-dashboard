import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Trash2, ArrowDownRight } from 'lucide-react';
import { useFilters } from '../context/FilterContext';

const COLORS = ['#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#3b82f6'];

const SpoilageDashboard = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { filters } = useFilters();

  useEffect(() => {
    fetch('/api/spoilage')
      .then(res => res.json())
      .then(json => {
        setData(json.lines || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredLines = data.filter(line => {
    if (!line.date) return true;
    const d = line.date.split(' ')[0];
    return d >= filters.startDate && d <= filters.endDate;
  });

  const totalSpoilage = filteredLines.reduce((sum, line) => sum + (line.revised_qty || 0), 0);

  const partnerMap = {};
  filteredLines.forEach(line => {
    const p = line.partner || 'Unknown';
    partnerMap[p] = (partnerMap[p] || 0) + (line.revised_qty || 0);
  });
  
  const spoilageData = Object.keys(partnerMap)
    .filter(k => partnerMap[k] > 0)
    .map(k => ({ name: k, value: Number(partnerMap[k].toFixed(2)) }))
    .sort((a, b) => b.value - a.value);

  if (loading) return <div className="p-8 text-center text-[var(--text-secondary)]">Loading spoilage data...</div>;

  return (
    <div>
      <h1 className="mb-6">Spoilage Tracking</h1>
      
      <div className="dashboard-grid">
        <div className="col-span-12 md:col-span-4 card glass-panel">
          <div className="card-header">
            <span className="card-title">Total Spoilage (kg)</span>
            <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
              <Trash2 size={20} color="var(--color-danger)" />
            </div>
          </div>
          <div className="metric-value">{totalSpoilage.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Kg</div>
          <div className="metric-trend trend-down">
            <ArrowDownRight size={16} /> <span>Live Data</span>
          </div>
        </div>
      </div>
      
      <div className="dashboard-grid mt-6">
        <div className="col-span-12 md:col-span-8 card glass-panel">
          <h3 className="mb-6">Spoilage Breakdown (by Category)</h3>
          <div style={{ height: '400px' }}>
            {spoilageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spoilageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={100}
                    outerRadius={140}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {spoilageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={(value) => [`${value} Kg`, 'Spoilage']}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                No spoilage data available for this period.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default SpoilageDashboard;
