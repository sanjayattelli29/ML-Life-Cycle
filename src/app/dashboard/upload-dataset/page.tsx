export default function ApiNoticePage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>System Notice</h1>
      <p>The API services are currently being updated. Please check back later.</p>
      <a href="/" style={{ color: 'blue', textDecoration: 'underline' }}>
        Return to Dashboard
      </a>
    </div>
  );
}