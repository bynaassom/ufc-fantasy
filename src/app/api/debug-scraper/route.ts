fetch("/api/debug-scraper", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: "http://www.ufcstats.com/event-details/babc6b5745335f18",
  }),
})
  .then((r) => r.json())
  .then(console.log);
