export function Spinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="spinner-container">
      <div className="spinner" />
      <span className="spinner-text">{text}</span>
    </div>
  );
}
