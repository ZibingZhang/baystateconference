# Sniffing MeetMobile traffic

Goal: inspect the network traffic MeetMobile sends/receives on your phone.

## The approach: point the iPhone's Wi-Fi proxy at a computer on your network

No hotspot, no Internet Sharing, no Ethernet adapter needed.
Keep the phone on your normal home Wi-Fi, with a computer (Mac or PC) joined to that same network, then tell iOS to route its HTTP(S) traffic through a proxy running on that computer.
Everything below works the same on Mac or Windows except the two steps marked per-OS.

1. Install mitmproxy on the computer:
   - Mac: `brew install mitmproxy`.
   - Windows: use the installer from [mitmproxy.org](https://mitmproxy.org/), or `pip install mitmproxy` / `pipx install mitmproxy`.
2. Run it with a UI:
   ```
   mitmweb --listen-host 0.0.0.0 --listen-port 8080
   ```
3. Find the computer's LAN IP:
   - Mac: `ipconfig getifaddr en0` (or check **System Settings → Network → Wi-Fi → Details**).
   - Windows: run `ipconfig` and read the IPv4 address of the active adapter.
4. On the iPhone: **Settings → Wi-Fi → (ⓘ next to the connected network) → Configure Proxy → Manual**.
   - Server: the computer's LAN IP from step 3.
   - Port: `8080`.
5. On the iPhone, open Safari and browse to `http://mitm.it`, then install the mitmproxy CA certificate profile.
6. **Required extra step on iOS:** go to **Settings → General → About → Certificate Trust Settings** and enable full trust for the mitmproxy root certificate.
   Without this, TLS handshakes fail even though the profile shows as "installed."
7. Open MeetMobile and use it normally.
   Decrypted requests/responses show up live in mitmweb's UI (`http://127.0.0.1:8081` by default) — inspect headers and JSON bodies there, or export them (Flow → Export, or run mitmproxy with `-w outfile` to save a flow file for later/scripted analysis).

## Quick checklist

- [ ] mitmweb running on the computer (`mitmweb --listen-host 0.0.0.0 --listen-port 8080`)
- [ ] Computer and iPhone on the same Wi-Fi network
- [ ] iPhone Wi-Fi proxy set to Manual, computer's LAN IP, port 8080
- [ ] mitmproxy CA installed via `http://mitm.it` **and** trusted (Settings → General → About → Certificate Trust Settings)
- [ ] MeetMobile opened and used while the proxy is active
- [ ] Flows reviewed/exported in mitmweb (`http://127.0.0.1:8081`)
