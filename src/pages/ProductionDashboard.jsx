import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Factory, ArrowUpRight } from 'lucide-react';

const productionData = [
  { plot: 'Plot A', yield: 1200 },
  { plot: 'Plot B', yield: 950 },
  { plot: 'Plot C', yield: 1500 },
  { plot: 'Plot D', yield: 800 },
  { plot: 'Plot E', yield: 1100 },
];

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

const ProductionDashboard = () => {
  return (
    <div>
      <h1 className="mb-6">Farm Production</h1>
      
      <div className="dashboard-grid">
        <div className="col-span-12 card glass-panel">
          <div className="card-header">
            <span className="card-title">Total Farm Production (kg)</span>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
              <Factory size={20} color="var(--color-success)" />
            </div>
          </div>
          <div className="metric-value">5,550 kg</div>
          <div className="metric-trend trend-up">
            <ArrowUpRight size={16} /> <span>15% vs last season</span>
          </div>
        </div>
      </div>
      
      <div className="dashboard-grid">
        <div className="col-span-12 card glass-panel">
          <h3 className="mb-6">Plot Wise Production</h3>
          <div style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="plot" stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                />
                <Bar dataKey="yield" radius={[4, 4, 0, 0]}>
                  {productionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProductionDashboard;
