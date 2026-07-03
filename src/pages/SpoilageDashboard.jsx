import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Trash2, ArrowDownRight } from 'lucide-react';

const spoilageData = [
  { name: 'Spoilage from Farm', value: 450 },
  { name: 'Shop Spoilage (Vegetables)', value: 150 },
];

const COLORS = ['#f59e0b', '#ef4444'];

const SpoilageDashboard = () => {
  return (
    <div>
      <h1 className="mb-6">Spoilage Tracking</h1>
      
      <div className="dashboard-grid">
        <div className="col-span-12 card glass-panel">
          <div className="card-header">
            <span className="card-title">Total Spoilage (kg)</span>
            <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
              <Trash2 size={20} color="var(--color-danger)" />
            </div>
          </div>
          <div className="metric-value">600 kg</div>
          <div className="metric-trend trend-down">
            <ArrowDownRight size={16} /> <span>-2% vs last month</span>
          </div>
        </div>
      </div>
      
      <div className="dashboard-grid">
        <div className="col-span-12 card glass-panel">
          <h3 className="mb-6">Spoilage Breakdown</h3>
          <div style={{ height: '400px' }}>
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
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SpoilageDashboard;
