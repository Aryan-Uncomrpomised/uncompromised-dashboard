const Logo = ({ className, style }) => (
  <img 
    src="/logo.png" 
    alt="Uncompromised Logo" 
    className={className}
    style={{ objectFit: 'contain', ...style }} 
  />
);

export default Logo;
