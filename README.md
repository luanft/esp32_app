# ESP32 Task Manager

React (create-react-app) UI for an ESP32-C3. The UI bundle is hosted on GitHub Pages; the ESP32 only stores a ~400 byte `index.html` that loads `app.js` / `app.css` from `https://luanft.github.io/esp32_app/`, so firmware flash/RAM stay small.

## Flow
1. `npm run build` builds the app, copies the hashed bundle to stable names (`app.js`, `app.css`) and generates `../esp32c3/src/index_html.h`.
2. Push to `main`: `.github/workflows/deploy.yml` publishes `build/` to GitHub Pages (enable Settings → Pages → Source: GitHub Actions).
3. Copy `esp32c3/include/secrets.h.example` to `secrets.h`, set Wi-Fi, flash the firmware (`pio run -t upload`). The serial monitor prints the IP; also reachable at `http://esp32.local`.

Because the bundle names are stable, the ESP32 only needs reflashing when the API changes, not on every UI deploy.

## API (served by the ESP32)
| Method | Path | Description |
|---|---|---|
| GET | `/api/info` | chip, IP, RSSI, uptime, heap, flash |
| GET | `/api/tasks` | FreeRTOS task list |
| GET / POST | `/api/led` | read / set `{"on":true}` |
| POST | `/api/led/toggle` | toggle LED |
| POST | `/api/restart` | reboot |

## Development
`npm start`, then in Settings set the device address (e.g. `http://192.168.1.50`), or `REACT_APP_DEVICE_URL`. The firmware sends CORS headers. An https page (github.io) can't call an http device (mixed content), so use the page served by the ESP32 itself.
