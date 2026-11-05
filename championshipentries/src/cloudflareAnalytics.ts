export default function loadCloudflareAnalytics(): void {
  if (!import.meta.env.PROD) return;
  try {
    if (localStorage.getItem("skip_analytics") === "true") return;
  } catch {}
  const script = document.createElement("script");
  script.type = "module";
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.setAttribute("data-cf-beacon", '{"token": "21b1e5f9582d4343bc569b6d19a902bb"}');
  document.head.appendChild(script);
}
