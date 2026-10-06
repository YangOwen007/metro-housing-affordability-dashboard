"use client";

// Offer recovery without exposing server error messages or database configuration.
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="page-shell"><section className="panel-card" role="alert">
    <h1>Housing data is unavailable</h1>
    <p>Please try again. If this continues, the data service may need attention.</p>
    <button onClick={reset}>Try again</button>
  </section></main>;
}
