const Placeholder = ({ title }) => {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700 }}>{title}</h1>
      <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>This module is currently under construction.</p>
    </div>
  );
};
export default Placeholder;
