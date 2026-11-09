function formatRemaining(ms) {
  if (ms <= 0) return "Today!";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;

  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
}

const ONE_DAY_MS = 86400000;

function tickCountdowns() {
  document.querySelectorAll(".countdown-timer[data-target]").forEach((el) => {
    const target = new Date(el.getAttribute("data-target")).getTime();
    const ms = target - Date.now();

    if (ms <= -ONE_DAY_MS) {
      el.closest(".countdown-item")?.remove();
      return;
    }

    el.textContent = formatRemaining(ms);
  });

  document.querySelectorAll(".countdown-banner").forEach((banner) => {
    if (!banner.querySelector(".countdown-item")) banner.remove();
  });
}

tickCountdowns();
setInterval(tickCountdowns, 1000);
