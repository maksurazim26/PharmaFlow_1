const { useState, useEffect, createContext, useContext } = React;

axios.defaults.baseURL = '/api';


const ThemeContext = createContext();
function useTheme() { return useContext(ThemeContext); }

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);
  return <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>{children}</ThemeContext.Provider>;
}


const ToastContext = createContext();
function useToast() { return useContext(ToastContext); }

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };
  const colors = { info: 'bg-blue-600', success: 'bg-green-600', error: 'bg-red-600' };
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className={`${colors[t.type]} text-white px-4 py-2 rounded shadow-lg text-sm animate-pulse`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}


const AuthContext = createContext();
function useAuth() { return useContext(AuthContext); }

function useCanEdit() {
  const { user } = useAuth();
  return ['super_admin', 'hub_admin', 'depot_manager'].includes(user?.role);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('/auth/me').then(r => setUser(r.data)).catch(() => logout()).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const r = await axios.post('/auth/login', { email, password });
    localStorage.setItem('token', r.data.token);
    setToken(r.data.token);
    setUser(r.data.user);
    axios.defaults.headers.common['Authorization'] = `Bearer ${r.data.token}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const refreshUser = () => axios.get('/auth/me').then(r => setUser(r.data));

  return <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>{children}</AuthContext.Provider>;
}


function Card({ label, value, accent }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-slate-100 dark:border-slate-700">
      <p className="text-slate-500 dark:text-slate-400 text-sm">{label}</p>
      <p className={`text-2xl font-bold ${accent || 'text-slate-800 dark:text-white'}`}>{value}</p>
    </div>
  );
}

function Badge({ children, color }) {
  const colors = {
    gray: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
    green: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200',
    red: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200',
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[color] || colors.gray}`}>{children}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-2xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null;
  return (
    <div className="flex justify-center gap-2 mt-4">
      <button disabled={meta.current_page === 1} onClick={() => onPage(meta.current_page - 1)}
        className="px-3 py-1 rounded border dark:border-slate-600 dark:text-white disabled:opacity-40">Prev</button>
      <span className="px-3 py-1 dark:text-white">Page {meta.current_page} of {meta.last_page}</span>
      <button disabled={meta.current_page === meta.last_page} onClick={() => onPage(meta.current_page + 1)}
        className="px-3 py-1 rounded border dark:border-slate-600 dark:text-white disabled:opacity-40">Next</button>
    </div>
  );
}

function exportCSV(filename, rows, columns) {
  const header = columns.map(c => c.label).join(',');
  const body = rows.map(r => columns.map(c => `"${(c.value(r) ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}


function printReport(title, rows, columns) {
  const win = window.open('', '_blank');
  const rowsHtml = rows.map(r => `<tr>${columns.map(c => `<td style="padding:6px;border:1px solid #ddd">${c.value(r) ?? ''}</td>`).join('')}</tr>`).join('');
  win.document.write(`
    <html><head><title>${title}</title></head>
    <body style="font-family:sans-serif">
      <h2>${title}</h2>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <table style="border-collapse:collapse;width:100%">
        <thead><tr>${columns.map(c => `<th style="padding:6px;border:1px solid #ddd;text-align:left;background:#f1f5f9">${c.label}</th>`).join('')}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <script>window.print()</script>
    </body></html>
  `);
  win.document.close();
}

function Login() {
  const { login } = useAuth();
  const { dark, toggle } = useTheme();
  const [email, setEmail] = useState('@pharmaflow.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(email, password); }
    catch (err) { setError('Invalid credentials'); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 relative">
      <button onClick={toggle} className="absolute top-4 right-4 text-2xl">{dark ? '☀️' : '🌙'}</button>
      <form onSubmit={submit} className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-1 text-slate-800 dark:text-white">PharmaFlow</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Pharmaceutical Supply Chain</p>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}
        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Email</label>
        <input className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 mb-4" value={email} onChange={e => setEmail(e.target.value)} />
        <label className="block text-sm font-medium mb-1 dark:text-slate-300">Password</label>
        <input type="password" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 mb-6" value={password} onChange={e => setPassword(e.target.value)} />
        <button disabled={busy} className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50">{busy ? 'Logging in...' : 'Login'}</button>
      </form>
    </div>
  );
}


function Sidebar({ page, setPage, open, setOpen }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
const items = ['Dashboard', 'Inventory', 'Transfers', 'Alerts', 'Expiry Timeline', 'Depot Comparison', 'Depots', 'Medicines', 'Suppliers'];  if (user?.role === 'super_admin') items.push('Users');

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)}></div>}
      <div className={`fixed md:static z-40 w-64 bg-slate-800 dark:bg-slate-950 text-white min-h-screen p-4 transition-transform ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">PharmaFlow</h2>
          <button className="md:hidden text-2xl" onClick={() => setOpen(false)}>&times;</button>
        </div>
        {items.map(i => (
          <div key={i} onClick={() => { setPage(i); setOpen(false); }}
            className={`p-2 rounded cursor-pointer mb-1 ${page === i ? 'bg-blue-600' : 'hover:bg-slate-700'}`}>
            {i}
          </div>
        ))}
       <div className="mt-8 pt-4 border-t border-slate-600 text-sm">
  <div onClick={() => { setPage('Profile'); setOpen(false); }} className="cursor-pointer hover:text-blue-300 mb-3 flex items-center justify-between">
    <span>{user?.name}</span>
    <button onClick={(e) => { e.stopPropagation(); toggle(); }} className="text-lg">{dark ? '☀️' : '🌙'}</button>
  </div>
  <button onClick={logout} className="text-red-300 hover:text-red-100 block">Logout</button>
</div>
      </div>
    </>
  );
}

function NotificationBell() {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = () => axios.get('/alerts').then(r => setAlerts(r.data.data));
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative text-xl dark:text-white">
        🔔
        {alerts.length > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{alerts.length > 9 ? '9+' : alerts.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
          <div className="p-3 border-b dark:border-slate-700 font-bold dark:text-white text-sm">Alerts ({alerts.length})</div>
          {alerts.length === 0 && <div className="p-3 text-sm text-slate-500 dark:text-slate-400">No active alerts</div>}
          {alerts.slice(0, 8).map(a => (
            <div key={a.id} className="p-3 border-b dark:border-slate-700 text-sm dark:text-slate-200">
              <Badge color={severityColor(a.severity)}>{a.severity}</Badge>
              <p className="mt-1">{a.message}</p>
            </div>
          ))}
          <div onClick={() => { window.location.hash = 'Alerts'; setOpen(false); }} className="p-2 text-center text-blue-600 text-sm cursor-pointer hover:underline">View all</div>
        </div>
      )}
    </div>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);

  const search = async (query) => {
    setQ(query);
    if (query.length < 2) { setResults(null); return; }
    const [meds, depots] = await Promise.all([
      axios.get('/medicines', { params: { search: query } }).catch(() => ({ data: { data: [] } })),
      axios.get('/depots').catch(() => ({ data: [] })),
    ]);
    const medMatches = meds.data.data.filter(m => m.name.toLowerCase().includes(query.toLowerCase()));
    const depotMatches = depots.data.filter(d => d.name.toLowerCase().includes(query.toLowerCase()) || d.district.toLowerCase().includes(query.toLowerCase()));
    setResults({ medicines: medMatches.slice(0, 5), depots: depotMatches.slice(0, 5) });
    setOpen(true);
  };

  return (
    <div className="relative flex-1 max-w-md">
      <input
        placeholder="Search medicines, depots..."
        className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-1.5 text-sm"
        value={q}
        onChange={e => search(e.target.value)}
        onFocus={() => q.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results && (
        <div className="absolute mt-1 w-full bg-white dark:bg-slate-800 rounded shadow-lg z-50 max-h-72 overflow-y-auto text-sm">
          {results.medicines.length === 0 && results.depots.length === 0 && <div className="p-3 text-slate-500 dark:text-slate-400">No results</div>}
          {results.medicines.length > 0 && <div className="p-2 font-bold text-xs text-slate-400 uppercase">Medicines</div>}
          {results.medicines.map(m => (
            <div key={m.id} onClick={() => { window.location.hash = 'Medicines'; setOpen(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer dark:text-white">{m.name} <span className="text-slate-400">({m.category})</span></div>
          ))}
          {results.depots.length > 0 && <div className="p-2 font-bold text-xs text-slate-400 uppercase">Depots</div>}
          {results.depots.map(d => (
            <div key={d.id} onClick={() => { window.location.hash = 'Depots'; setOpen(false); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer dark:text-white">{d.name} <span className="text-slate-400">({d.district})</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

function Topbar({ setOpen, title }) {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 shadow mb-4 sticky top-0 z-20 gap-3">
      <button onClick={() => setOpen(true)} className="md:hidden text-2xl dark:text-white">☰</button>
      <h1 className="font-bold dark:text-white hidden md:block whitespace-nowrap">{title}</h1>
      <GlobalSearch />
      <NotificationBell />
    </div>
  );
}


function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [alertStats, setAlertStats] = useState(null);

  useEffect(() => {
    axios.get('/inventory/summary').then(r => setSummary(r.data));
    axios.get('/alerts/stats').then(r => setAlertStats(r.data));
  }, []);

  if (!summary || !alertStats) return <p className="dark:text-white">Loading...</p>;

  const maxAlert = Math.max(alertStats.critical, alertStats.low_stock, alertStats.near_expiry, alertStats.expired, 1);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 dark:text-white">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card label="Total Medicines" value={summary.total_medicines} />
        <Card label="Total Units" value={summary.total_units} />
        <Card label="Total Value" value={`$${Number(summary.total_value).toFixed(2)}`} accent="text-green-600" />
        <Card label="Low Stock Items" value={summary.low_stock_count} accent="text-orange-600" />
        <Card label="Active Alerts" value={alertStats.total} accent="text-red-600" />
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow">
        <h2 className="font-bold mb-4 dark:text-white">Alert Breakdown</h2>
        <div className="space-y-3">
          {[
            ['Critical', alertStats.critical, 'bg-red-500'],
            ['Low Stock', alertStats.low_stock, 'bg-orange-500'],
            ['Near Expiry', alertStats.near_expiry, 'bg-yellow-500'],
            ['Expired', alertStats.expired, 'bg-slate-500'],
          ].map(([label, val, color]) => (
            <div key={label}>
              <div className="flex justify-between text-sm mb-1 dark:text-slate-300">
                <span>{label}</span><span>{val}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded h-3">
                <div className={`${color} h-3 rounded`} style={{ width: `${(val / maxAlert) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function Inventory() {
  const [data, setData] = useState({ data: [], meta: {} });
  const [medicines, setMedicines] = useState([]);
  const [depots, setDepots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [depotFilter, setDepotFilter] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ medicine_id: '', depot_id: '', lot_number: '', quantity: '', cost_per_unit: '', expiry_date: '', manufacture_date: '' });
  const [error, setError] = useState('');

  const load = () => axios.get('/inventory', { params: { search, depot_id: depotFilter, page } }).then(r => setData(r.data));
  useEffect(() => { load(); }, [search, depotFilter, page]);
  useEffect(() => {
    axios.get('/medicines').then(r => setMedicines(r.data.data));
    axios.get('/depots').then(r => setDepots(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('/inventory/receive', form);
      setForm({ medicine_id: '', depot_id: '', lot_number: '', quantity: '', cost_per_unit: '', expiry_date: '', manufacture_date: '' });
      setShowForm(false);
      load();
    } catch (err) { setError(err.response?.data?.message || 'Failed to receive batch'); }
  };

  const flag = async (id) => {
    if (!confirm('Flag this batch for review?')) return;
    await axios.patch(`/inventory/batches/${id}/flag`);
    load();
  };

  const statusColor = { active: 'green', near_expiry: 'yellow', expired: 'red', flagged: 'orange', disposed: 'gray' };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold dark:text-white">Inventory</h1>
        <div className="flex gap-2">
          
         <button onClick={() => exportCSV('inventory.csv', data.data, [
  { label: 'Medicine', value: r => r.medicine?.name },
  { label: 'Lot', value: r => r.lot_number },
  { label: 'Qty', value: r => r.quantity_available },
  { label: 'Expiry', value: r => r.expiry_date?.split('T')[0] },
  { label: 'Status', value: r => r.status },
])} className="bg-slate-600 text-white px-3 py-2 rounded text-sm hover:bg-slate-700">Export CSV</button>

<button onClick={() => printReport('Inventory Report', data.data, [
  { label: 'Medicine', value: r => r.medicine?.name },
  { label: 'Lot', value: r => r.lot_number },
  { label: 'Qty', value: r => r.quantity_available },
  { label: 'Expiry', value: r => r.expiry_date?.split('T')[0] },
  { label: 'Status', value: r => r.status },
])} className="bg-slate-500 text-white px-3 py-2 rounded text-sm hover:bg-slate-600">Print PDF</button>


          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {showForm ? 'Cancel' : '+ Receive Stock'}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input placeholder="Search medicine or lot..." className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 flex-1 min-w-[200px]" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <select className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={depotFilter} onChange={e => { setDepotFilter(e.target.value); setPage(1); }}>
          <option value="">All Depots</option>
          {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white dark:bg-slate-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {error && <div className="md:col-span-2 bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>}
          <select required className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.medicine_id} onChange={e => setForm({...form, medicine_id: e.target.value})}>
            <option value="">Select Medicine</option>
            {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select required className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.depot_id} onChange={e => setForm({...form, depot_id: e.target.value})}>
            <option value="">Select Depot</option>
            {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input required placeholder="Lot Number" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.lot_number} onChange={e => setForm({...form, lot_number: e.target.value})} />
          <input required type="number" placeholder="Quantity" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
          <input required type="number" step="0.01" placeholder="Cost per unit" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.cost_per_unit} onChange={e => setForm({...form, cost_per_unit: e.target.value})} />
          <input type="date" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.manufacture_date} onChange={e => setForm({...form, manufacture_date: e.target.value})} />
          <input required type="date" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.expiry_date} onChange={e => setForm({...form, expiry_date: e.target.value})} />
          <button className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700 md:col-span-2">Receive Batch</button>
        </form>
      )}

      <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded shadow">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr>
              <th className="p-2 text-left dark:text-white">Medicine</th>
              <th className="p-2 text-left dark:text-white">Lot</th>
              <th className="p-2 text-left dark:text-white">Qty</th>
              <th className="p-2 text-left dark:text-white">Expiry</th>
              <th className="p-2 text-left dark:text-white">Status</th>
              <th className="p-2 text-left dark:text-white">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map(b => (
              <tr key={b.id} className="border-t dark:border-slate-700 dark:text-slate-200">
                <td className="p-2">{b.medicine?.name}</td>
                <td className="p-2">{b.lot_number}</td>
                <td className="p-2">{b.quantity_available}</td>
                <td className="p-2">{b.expiry_date?.split('T')[0]}</td>
                <td className="p-2"><Badge color={statusColor[b.status]}>{b.status}</Badge></td>
                <td className="p-2">
                  {b.status !== 'flagged' && <button onClick={() => flag(b.id)} className="text-orange-600 hover:underline text-sm">Flag</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination meta={data.meta} onPage={setPage} />
    </div>
  );
}

function TransferDetail({ id, onClose }) {
  const [t, setT] = useState(null);
  useEffect(() => { axios.get(`/transfers/${id}`).then(r => setT(r.data)); }, [id]);
  if (!t) return <Modal title="Loading..." onClose={onClose}><p className="dark:text-white">Loading...</p></Modal>;
  return (
    <Modal title={`Transfer #${t.id}`} onClose={onClose}>
      <div className="space-y-2 text-sm dark:text-slate-200 mb-4">
        <p><b>Medicine:</b> {t.medicine?.name}</p>
        <p><b>From:</b> {t.from_depot?.name} <b>To:</b> {t.to_depot?.name}</p>
        <p><b>Quantity:</b> {t.quantity}</p>
        <p><b>Status:</b> <Badge color="blue">{t.status}</Badge></p>
        <p><b>Requested by:</b> {t.requested_by?.name}</p>
        {t.notes && <p><b>Notes:</b> {t.notes}</p>}
      </div>
      <h3 className="font-bold mb-2 dark:text-white">Audit Trail</h3>
      <div className="space-y-2">
        {t.logs?.map(l => (
          <div key={l.id} className="text-sm border-l-2 border-blue-400 pl-3 dark:text-slate-300">
            <p>{l.from_status} → {l.to_status}</p>
            <p className="text-xs text-slate-400">{new Date(l.changed_at).toLocaleString()}</p>
            {l.note && <p className="text-xs italic">{l.note}</p>}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function Transfers() {
  const [data, setData] = useState({ data: [], meta: {} });
  const [depots, setDepots] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [batches, setBatches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState(null);
  const [form, setForm] = useState({ from_depot_id: '', to_depot_id: '', medicine_id: '', batch_id: '', quantity: '', notes: '' });
  const [error, setError] = useState('');

  const load = () => axios.get('/transfers', { params: { status: statusFilter, page } }).then(r => setData(r.data));
  useEffect(() => { load(); }, [statusFilter, page]);
  useEffect(() => {
    axios.get('/depots').then(r => setDepots(r.data));
    axios.get('/medicines').then(r => setMedicines(r.data.data));
    axios.get('/inventory').then(r => setBatches(r.data.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.post('/transfers', form);
      setForm({ from_depot_id: '', to_depot_id: '', medicine_id: '', batch_id: '', quantity: '', notes: '' });
      setShowForm(false);
      load();
    } catch (err) { setError(err.response?.data?.message || 'Failed to create transfer'); }
  };

  const updateStatus = async (id, status) => {
    try { await axios.patch(`/transfers/${id}/status`, { status }); load(); }
    catch (err) { alert(err.response?.data?.message || 'Failed to update status'); }
  };

  const nextAction = { requested: 'approved', approved: 'dispatched', dispatched: 'in_transit', in_transit: 'received' };
  const statusColor = { requested: 'yellow', approved: 'blue', dispatched: 'orange', in_transit: 'orange', received: 'green', delayed: 'red', rejected: 'red' };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold dark:text-white">Transfers</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          {showForm ? 'Cancel' : '+ New Transfer'}
        </button>
      </div>

      <select className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 mb-4" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
        <option value="">All Statuses</option>
        {['requested','approved','dispatched','in_transit','received','delayed','rejected'].map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {showForm && (
        <form onSubmit={submit} className="bg-white dark:bg-slate-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {error && <div className="md:col-span-2 bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>}
          <select required className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.from_depot_id} onChange={e => setForm({...form, from_depot_id: e.target.value})}>
            <option value="">From Depot</option>
            {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select required className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.to_depot_id} onChange={e => setForm({...form, to_depot_id: e.target.value})}>
            <option value="">To Depot</option>
            {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select required className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.medicine_id} onChange={e => setForm({...form, medicine_id: e.target.value})}>
            <option value="">Medicine</option>
            {medicines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select required className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.batch_id} onChange={e => setForm({...form, batch_id: e.target.value})}>
            <option value="">Batch</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.lot_number} (avail: {b.quantity_available})</option>)}
          </select>
          <input required type="number" placeholder="Quantity" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
          <input placeholder="Notes" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          <button className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700 md:col-span-2">Request Transfer</button>
        </form>
      )}

      <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded shadow">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr>
              <th className="p-2 text-left dark:text-white">Medicine</th>
              <th className="p-2 text-left dark:text-white">From</th>
              <th className="p-2 text-left dark:text-white">To</th>
              <th className="p-2 text-left dark:text-white">Qty</th>
              <th className="p-2 text-left dark:text-white">Status</th>
              <th className="p-2 text-left dark:text-white">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map(t => (
              <tr key={t.id} className="border-t dark:border-slate-700 dark:text-slate-200">
                <td className="p-2 cursor-pointer hover:underline" onClick={() => setDetailId(t.id)}>{t.medicine?.name}</td>
                <td className="p-2">{t.from_depot?.name}</td>
                <td className="p-2">{t.to_depot?.name}</td>
                <td className="p-2">{t.quantity}</td>
                <td className="p-2"><Badge color={statusColor[t.status]}>{t.status}</Badge></td>
                <td className="p-2">
                  {nextAction[t.status] && (
                    <button onClick={() => updateStatus(t.id, nextAction[t.status])} className="text-blue-600 hover:underline text-sm">
                      Mark {nextAction[t.status]}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination meta={data.meta} onPage={setPage} />
      {detailId && <TransferDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}


function severityColor(sev) {
  const map = { critical: 'red', high: 'orange', medium: 'yellow', low: 'gray' };
  return map[sev] || 'gray';
}

function Alerts() {
  const [data, setData] = useState({ data: [] });
  const [filter, setFilter] = useState('all');

  const load = () => axios.get('/alerts').then(r => setData(r.data));
  useEffect(() => { load(); }, []);

  const resolve = async (id) => {
    try { await axios.patch(`/alerts/${id}/resolve`); load(); }
    catch (err) { alert(err.response?.data?.message || 'Failed to resolve'); }
  };

  const filtered = filter === 'all' ? data.data : data.data.filter(a => a.type === filter);

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold dark:text-white">Alerts</h1>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2">
          <option value="all">All Types</option>
          <option value="low_stock">Low Stock</option>
          <option value="near_expiry">Near Expiry</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      {filtered.length === 0 && <div className="bg-white dark:bg-slate-800 p-6 rounded shadow text-center text-slate-500 dark:text-slate-400">No active alerts</div>}
      <div className="space-y-2">
        {filtered.map(a => (
          <div key={a.id} className="bg-white dark:bg-slate-800 p-4 rounded shadow flex flex-wrap justify-between items-center gap-2">
            <div>
              <Badge color={severityColor(a.severity)}>{a.severity.toUpperCase()}</Badge>
              <span className="text-slate-500 dark:text-slate-400 text-xs mx-2">[{a.type.replace('_', ' ')}]</span>
              <span className="dark:text-slate-200">{a.message}</span>
            </div>
            <button onClick={() => resolve(a.id)} className="text-green-600 hover:text-green-800 text-sm font-medium">✓ Resolve</button>
          </div>
        ))}
      </div>
    </div>
  );
}


function Depots() {
  const [depots, setDepots] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ hub_id: '', name: '', district: '', capacity: '' });
  const [error, setError] = useState('');

  const load = () => axios.get('/depots').then(r => setDepots(r.data));
  useEffect(() => { load(); axios.get('/depots/hierarchy').then(r => setHubs(r.data)); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { await axios.post('/depots', form); setForm({ hub_id: '', name: '', district: '', capacity: '' }); setShowForm(false); load(); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold dark:text-white">Depots</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{showForm ? 'Cancel' : '+ Add Depot'}</button>
      </div>
      {showForm && (
        <form onSubmit={submit} className="bg-white dark:bg-slate-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {error && <div className="md:col-span-2 bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>}
          <select required className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.hub_id} onChange={e => setForm({...form, hub_id: e.target.value})}>
            <option value="">Select Hub</option>
            {hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <input required placeholder="Depot Name" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input required placeholder="District" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.district} onChange={e => setForm({...form, district: e.target.value})} />
          <input required type="number" placeholder="Capacity" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} />
          <button className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700 md:col-span-2">Save Depot</button>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {depots.map(d => (
          <div key={d.id} className="bg-white dark:bg-slate-800 p-4 rounded shadow">
            <p className="font-bold dark:text-white">{d.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{d.district}</p>
            <p className="text-sm dark:text-slate-300">Capacity: {d.capacity}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Medicines() {
      const canEdit = useCanEdit();
  const [data, setData] = useState({ data: [] });
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', category: '', unit: '', cost_per_unit: '', reorder_threshold: '' });
  const [error, setError] = useState('');

  const load = () => axios.get('/medicines').then(r => setData(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { await axios.post('/medicines', form); setForm({ name: '', category: '', unit: '', cost_per_unit: '', reorder_threshold: '' }); setShowForm(false); load(); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const filtered = data.data.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold dark:text-white">Medicines</h1>
{canEdit && <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{showForm ? 'Cancel' : '+ Add Medicine'}</button>}      </div>
      <input placeholder="Search medicines..." className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 mb-4 w-full md:w-80" value={search} onChange={e => setSearch(e.target.value)} />
      {showForm && (
        <form onSubmit={submit} className="bg-white dark:bg-slate-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {error && <div className="md:col-span-2 bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>}
          <input required placeholder="Name" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input required placeholder="Category" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
          <input required placeholder="Unit" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} />
          <input required type="number" step="0.01" placeholder="Cost per unit" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.cost_per_unit} onChange={e => setForm({...form, cost_per_unit: e.target.value})} />
          <input required type="number" placeholder="Reorder threshold" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.reorder_threshold} onChange={e => setForm({...form, reorder_threshold: e.target.value})} />
          <button className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700 md:col-span-2">Save Medicine</button>
        </form>
      )}
      <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded shadow">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr><th className="p-2 text-left dark:text-white">Name</th><th className="p-2 text-left dark:text-white">Category</th><th className="p-2 text-left dark:text-white">Unit</th><th className="p-2 text-left dark:text-white">Cost</th></tr>
          </thead>
          <tbody>
            {filtered.map(m => (
              <tr key={m.id} className="border-t dark:border-slate-700 dark:text-slate-200">
                <td className="p-2">{m.name}</td><td className="p-2">{m.category}</td><td className="p-2">{m.unit}</td><td className="p-2">${m.cost_per_unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function Suppliers() {
  const canEdit = useCanEdit();
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', lead_time_days: '' });
  const [error, setError] = useState('');

  const load = () => axios.get('/suppliers').then(r => setSuppliers(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { await axios.post('/suppliers', form); setForm({ name: '', contact_person: '', email: '', phone: '', lead_time_days: '' }); setShowForm(false); load(); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold dark:text-white">Suppliers</h1>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{showForm ? 'Cancel' : '+ Add Supplier'}</button>
        )}
      </div>
      {showForm && (
        <form onSubmit={submit} className="bg-white dark:bg-slate-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {error && <div className="md:col-span-2 bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>}
          <input required placeholder="Name" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input placeholder="Contact Person" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} />
          <input placeholder="Email" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <input placeholder="Phone" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          <input required type="number" placeholder="Lead Time (days)" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.lead_time_days} onChange={e => setForm({...form, lead_time_days: e.target.value})} />
          <button className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700 md:col-span-2">Save Supplier</button>
        </form>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <div key={s.id} className="bg-white dark:bg-slate-800 p-4 rounded shadow">
            <p className="font-bold dark:text-white">{s.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{s.contact_person}</p>
            <p className="text-sm dark:text-slate-300">{s.email}</p>
            <p className="text-xs text-slate-400">Lead time: {s.lead_time_days} days</p>
          </div>
        ))}
      </div>
    </div>
  );
}


function Users() {
  const [users, setUsers] = useState([]);
  const [depots, setDepots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff', depot_id: '' });
  const [error, setError] = useState('');

  const load = () => axios.get('/users').then(r => setUsers(r.data));
  useEffect(() => { load(); axios.get('/depots').then(r => setDepots(r.data)); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try { await axios.post('/users', form); setForm({ name: '', email: '', password: '', role: 'staff', depot_id: '' }); setShowForm(false); load(); }
    catch (err) { setError(err.response?.data?.message || 'Failed'); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this user?')) return;
    try { await axios.delete(`/users/${id}`); load(); }
    catch (err) { alert(err.response?.data?.message || 'Failed to delete'); }
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold dark:text-white">Users</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">{showForm ? 'Cancel' : '+ Add User'}</button>
      </div>
      {showForm && (
        <form onSubmit={submit} className="bg-white dark:bg-slate-800 p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {error && <div className="md:col-span-2 bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>}
          <input required placeholder="Name" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          <input required type="email" placeholder="Email" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <input required type="password" placeholder="Password" className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <select className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
            <option value="staff">Staff</option>
            <option value="depot_manager">Depot Manager</option>
            <option value="hub_admin">Hub Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <select className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2 md:col-span-2" value={form.depot_id} onChange={e => setForm({...form, depot_id: e.target.value})}>
            <option value="">No Depot</option>
            {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700 md:col-span-2">Save User</button>
        </form>
      )}
      <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded shadow">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr><th className="p-2 text-left dark:text-white">Name</th><th className="p-2 text-left dark:text-white">Email</th><th className="p-2 text-left dark:text-white">Role</th><th className="p-2 text-left dark:text-white">Depot</th><th className="p-2 text-left dark:text-white">Action</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t dark:border-slate-700 dark:text-slate-200">
                <td className="p-2">{u.name}</td><td className="p-2">{u.email}</td>
                <td className="p-2"><Badge color="blue">{u.role}</Badge></td>
                <td className="p-2">{u.depot?.name || '-'}</td>
                <td className="p-2"><button onClick={() => remove(u.id)} className="text-red-600 hover:underline text-sm">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function Profile() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', password: '' });
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const payload = {};
      if (form.name) payload.name = form.name;
      if (form.phone) payload.phone = form.phone;
      if (form.password) payload.password = form.password;

      await axios.patch('/auth/profile', payload);
      await refreshUser();
      setMsg('Profile updated successfully.');
      setForm({ name: '', phone: '', password: '' });
    } catch (err) { setMsg('Failed to update profile.'); }
  };

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold mb-4 dark:text-white">Profile & Settings</h1>
      <form onSubmit={submit} className="bg-white dark:bg-slate-800 p-4 rounded shadow space-y-3">
        {msg && <div className="bg-blue-100 text-blue-700 p-2 rounded text-sm">{msg}</div>}
        <div>
          <label className="block text-sm mb-1 dark:text-slate-300">Name (current: {user?.name})</label>
          <input placeholder="Enter  name" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm mb-1 dark:text-slate-300">Phone (current: {user?.phone || 'not set'})</label>
          <input placeholder="Enter  phone" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm mb-1 dark:text-slate-300">New Password (leave blank to keep current)</label>
          <input type="password" placeholder="Enter new password" className="w-full border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">Role: {user?.role} | Depot: {user?.depot?.name || 'N/A'}</div>
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Save Changes</button>
      </form>
    </div>
  );
}
function AppShell() {
  const { user, loading } = useAuth();
const validPages = ['Dashboard', 'Inventory', 'Transfers', 'Alerts', 'Expiry Timeline', 'Depot Comparison', 'Depots', 'Medicines', 'Suppliers', 'Users', 'Profile'];
  const getPageFromHash = () => {
  const hash = decodeURIComponent(window.location.hash.replace('#', ''));
  return validPages.includes(hash) ? hash : 'Dashboard';
};

  const [page, setPageState] = useState(getPageFromHash());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const setPage = (p) => {
    window.location.hash = p;
  };

  useEffect(() => {
    const onHashChange = () => setPageState(getPageFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center dark:text-white dark:bg-slate-900">Loading...</div>;
  if (!user) return <Login />;

  if (page === 'Users' && user.role !== 'super_admin') {
    return (
      <div className="flex min-h-screen dark:bg-slate-900">
        <Sidebar page={page} setPage={setPage} open={sidebarOpen} setOpen={setSidebarOpen} />
        <div className="flex-1 min-w-0">
          <Topbar setOpen={setSidebarOpen} title={page} />
          <div className="p-4 md:p-6 dark:text-white">Access denied. Super Admin only.</div>
        </div>
      </div>
    );
  }

const pages = { Dashboard, Inventory, Transfers, Alerts, 'Expiry Timeline': ExpiryTimeline, 'Depot Comparison': DepotComparison, Depots, Medicines, Suppliers, Users, Profile };  const Page = pages[page] || Dashboard;

  return (
    <div className="flex min-h-screen dark:bg-slate-900">
      <Sidebar page={page} setPage={setPage} open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 min-w-0">
        <Topbar setOpen={setSidebarOpen} title={page} />
        <div className="p-4 md:p-6">
          <Page />
        </div>
      </div>
    </div>
  );
}

function ExpiryTimeline() {
  const [days, setDays] = useState(90);
  const [data, setData] = useState([]);

  useEffect(() => { axios.get('/inventory/expiring', { params: { days } }).then(r => setData(r.data)); }, [days]);

  const grouped = { '0-7': [], '8-30': [], '31-90': [], '90+': [] };
  data.forEach(b => {
    const d = b.days_to_expiry;
    if (d <= 7) grouped['0-7'].push(b);
    else if (d <= 30) grouped['8-30'].push(b);
    else if (d <= 90) grouped['31-90'].push(b);
    else grouped['90+'].push(b);
  });

  const groupColor = { '0-7': 'border-red-500', '8-30': 'border-orange-500', '31-90': 'border-yellow-500', '90+': 'border-green-500' };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold dark:text-white">Expiry Timeline</h1>
        <select value={days} onChange={e => setDays(e.target.value)} className="border dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded px-3 py-2">
          <option value={30}>Next 30 days</option>
          <option value={90}>Next 90 days</option>
          <option value={180}>Next 180 days</option>
        </select>
      </div>
      {Object.entries(grouped).map(([range, items]) => items.length > 0 && (
        <div key={range} className="mb-4">
          <h2 className="font-bold text-sm text-slate-500 dark:text-slate-400 mb-2">{range} days ({items.length})</h2>
          <div className="space-y-2">
            {items.map(b => (
              <div key={b.id} className={`bg-white dark:bg-slate-800 p-3 rounded shadow border-l-4 ${groupColor[range]} flex justify-between`}>
                <span className="dark:text-white">{b.medicine?.name} — {b.lot_number} ({b.depot?.name})</span>
                <span className="text-sm text-slate-500 dark:text-slate-400">{b.days_to_expiry} days left</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {data.length === 0 && <div className="bg-white dark:bg-slate-800 p-6 rounded shadow text-center text-slate-500 dark:text-slate-400">Nothing expiring soon 🎉</div>}
    </div>
  );
}

function DepotComparison() {
  const [depots, setDepots] = useState([]);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    axios.get('/depots').then(async r => {
      setDepots(r.data);
      const results = await Promise.all(r.data.map(d => axios.get('/inventory/summary', { params: { depot_id: d.id } })));
      setRows(r.data.map((d, i) => ({ depot: d, ...results[i].data })));
    });
  }, []);

  const maxValue = Math.max(...rows.map(r => Number(r.total_value) || 0), 1);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 dark:text-white">Depot Comparison</h1>
      <div className="overflow-x-auto bg-white dark:bg-slate-800 rounded shadow">
        <table className="w-full">
          <thead className="bg-slate-100 dark:bg-slate-700">
            <tr>
              <th className="p-2 text-left dark:text-white">Depot</th>
              <th className="p-2 text-left dark:text-white">Medicines</th>
              <th className="p-2 text-left dark:text-white">Total Units</th>
              <th className="p-2 text-left dark:text-white">Value</th>
              <th className="p-2 text-left dark:text-white">Low Stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.depot.id} className="border-t dark:border-slate-700 dark:text-slate-200">
                <td className="p-2 font-medium">{r.depot.name}</td>
                <td className="p-2">{r.total_medicines}</td>
                <td className="p-2">{r.total_units}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-100 dark:bg-slate-700 rounded h-2 w-24">
                      <div className="bg-blue-500 h-2 rounded" style={{ width: `${(r.total_value / maxValue) * 100}%` }}></div>
                    </div>
                    ${Number(r.total_value).toFixed(2)}
                  </div>
                </td>
                <td className="p-2">{r.low_stock_count > 0 ? <Badge color="orange">{r.low_stock_count}</Badge> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider><ToastProvider><AuthProvider><AppShell /></AuthProvider></ToastProvider></ThemeProvider>
);
