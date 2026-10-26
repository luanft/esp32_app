import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { api, getBaseUrl, setBaseUrl } from './api';

const POLL_MS = 2000;

const formatUptime = (s) => {
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d ? d + 'd ' : ''}${h}h ${m}m ${s % 60}s`;
};

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

function Bar({ used, total }) {
  const pct = total ? Math.round((used / total) * 100) : 0;
  return (
    <div className="bar" title={`${pct}%`}>
      <div className="bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function LedCard({ on, busy, onSet, onToggle }) {
  return (
    <section className="card">
      <h2>Built-in LED</h2>
      <div className="led-row">
        <span className={`led ${on ? 'on' : ''}`} aria-label={on ? 'LED on' : 'LED off'} />
        <strong>{on === null ? '—' : on ? 'ON' : 'OFF'}</strong>
      </div>
      <div className="btn-row">
        <button disabled={busy} onClick={() => onSet(true)}>Turn on</button>
        <button disabled={busy} onClick={() => onSet(false)}>Turn off</button>
        <button disabled={busy} onClick={onToggle}>Toggle</button>
      </div>
    </section>
  );
}

function SystemCard({ info }) {
  if (!info) return <section className="card"><h2>System</h2><p className="muted">No data</p></section>;
  const heapUsed = info.heapTotal - info.heapFree;
  const rows = [
    ['Chip', `${info.chip} rev ${info.revision} @ ${info.cpuMhz} MHz`],
    ['IP', info.ip],
    ['Wi-Fi', `${info.ssid} (${info.rssi} dBm)`],
    ['Uptime', formatUptime(info.uptime)],
    ['Flash', `${kb(info.sketchSize)} used of ${kb(info.flashSize)}`],
    ['Free heap', `${kb(info.heapFree)} (min ${kb(info.heapMinFree)})`],
  ];
  return (
    <section className="card">
      <h2>System</h2>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      <label className="muted">Heap used</label>
      <Bar used={heapUsed} total={info.heapTotal} />
    </section>
  );
}

function TaskTable({ tasks }) {
  return (
    <section className="card wide">
      <h2>Tasks <span className="muted">({tasks.length})</span></h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Name</th><th>State</th><th>Prio</th><th>Core</th>
              <th>Stack free</th><th>CPU %</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td>
                <td>{t.name}</td>
                <td><span className={`state ${t.state.toLowerCase()}`}>{t.state}</span></td>
                <td>{t.prio}</td>
                <td>{t.core < 0 ? '–' : t.core}</td>
                <td>{t.stackFree} B</td>
                <td>{t.cpu.toFixed(1)}</td>
              </tr>
            ))}
            {tasks.length === 0 && (
              <tr><td colSpan="7" className="muted">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Settings({ onSaved }) {
  const [value, setValue] = useState(getBaseUrl());
  return (
    <form
      className="settings"
      onSubmit={(e) => {
        e.preventDefault();
        setValue(setBaseUrl(value));
        onSaved();
      }}
    >
      <label htmlFor="dev">Device address</label>
      <input
        id="dev"
        value={value}
        placeholder="same origin (leave empty) or http://192.168.1.50"
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit">Save</button>
    </form>
  );
}

export default function App() {
  const [info, setInfo] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [led, setLed] = useState(null);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [i, t, l] = await Promise.all([api.info(), api.tasks(), api.led()]);
      setInfo(i);
      setTasks(t.tasks);
      setLed(l.on);
      setOnline(true);
      setError('');
    } catch (e) {
      setOnline(false);
      setError(e.name === 'AbortError' ? 'Request timed out' : e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const run = async (fn) => {
    setBusy(true);
    try {
      const r = await fn();
      if (r && typeof r.on === 'boolean') setLed(r.on);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const restart = () => {
    if (window.confirm('Restart the ESP32?')) run(api.restart);
  };

  return (
    <div className="app">
      <header>
        <h1>ESP32 Task Manager</h1>
        <div className="header-right">
          <span className={`dot ${online ? 'ok' : 'bad'}`} />
          <span>{online ? 'Connected' : 'Offline'}</span>
          <button className="ghost" onClick={() => setShowSettings((s) => !s)}>Settings</button>
          <button className="danger" onClick={restart} disabled={!online || busy}>Restart</button>
        </div>
      </header>

      {showSettings && <Settings onSaved={refresh} />}
      {error && <div className="error">Cannot reach device: {error}</div>}

      <main>
        <LedCard
          on={led}
          busy={busy || !online}
          onSet={(on) => run(() => api.setLed(on))}
          onToggle={() => run(api.toggleLed)}
        />
        <SystemCard info={info} />
        <TaskTable tasks={tasks} />
      </main>
    </div>
  );
}
