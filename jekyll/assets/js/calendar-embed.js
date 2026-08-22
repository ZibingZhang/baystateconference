function initCalendarEmbed(embed) {
  const iframe = embed.querySelector("iframe");
  const loading = embed.querySelector(".calendar-loading");

  if (!iframe || !loading) return;

  iframe.addEventListener("load", () => {
    loading.hidden = true;
  });
}

function initCalendarEmbeds() {
  document.querySelectorAll(".calendar-embed").forEach(initCalendarEmbed);
}

initCalendarEmbeds();
