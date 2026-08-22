function decodeObfuscatedEmails() {
  document.querySelectorAll(".obfuscated-email").forEach((el) => {
    const address = `${el.dataset.user}@${el.dataset.domain}`;
    el.href = `mailto:${address}`;
    el.textContent = address;
  });
}

decodeObfuscatedEmails();
