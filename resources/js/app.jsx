import '../css/app.css';
import React, { createContext, useContext, useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Toaster, toast } from 'react-hot-toast';
import axios from 'axios';

// ─────────────────────────────────────────────
// API SERVICE
// ─────────────────────────────────────────────
const api = axios.create({
    baseURL: '/api',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
api.interceptors.response.use(
    (r) => r,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

const authAPI = {
    login:  (d) => api.post('/auth/login', d),
    logout: ()  => api.post('/auth/logout'),
    me:     ()  => api.get('/auth/me'),
};
const inventoryAPI = {
    list:     (p) => api.get('/inventory', { params: p }),
    summary:  (id) => api.get('/inventory/summary', { params: { depot_id: id } }),
    expiring: (p) => api.get('/inventory/expiring', { params: p }),
    receive:  (d) => api.post('/inventory/receive', d),
    flagBatch:(id) => api.patch(`/inventory/batches/${id}/flag`),
};
const transferAPI = {
    list:   (p) => api.get('/transfers', { params: p }),
    create: (d) => api.post('/transfers', d),
    update: (id, d) => api.patch(`/transfers/${id}/status`, d),
};
const alertAPI = {
    list:    (p) => api.get('/alerts', { params: p }),
    stats:   (id) => api.get('/alerts/stats', { params: { depot_id: id } }),
    resolve: (id) => api.patch(`/alerts/${id}/resolve`),
};
const depotAPI = {
    list: () => api.get('/depots'),
};
const medicineAPI = {
    list: () => api.get('/medicines'),
};

// ─────────────────────────────────────────────
// AUTH CONTEXT
// ─────────────────────────────────────────────
const AuthContext = createContext(null);
function AuthProvider({ children }) {
    const [user, setUser]       = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            authAPI.me()
                .then((r) => setUser(r.data))
                .catch(() => localStorage.removeItem('token'))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);
    const login = async (email, password) => {
        const r = await authAPI.login({ email, password });
        localStorage.setItem('token', r.data.token);
        setUser(r.data.user);
        return r.data.user;
    };
    const logout = async () => {
        await authAPI.logout().catch(() => {});
        localStorage.removeItem('token');
        setUser(null);
    };
    return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}
const useAuth = () => useContext(AuthContext);

// ─────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────
function Badge({ status }) {
    const map = {
        active:      ['#dcfce7', '#16a34a'],
        near_expiry: ['#fef9c3', '#d97706'],
        expired:     ['#fee2e2', '#dc2626'],
        flagged:     ['#fee2e2', '#dc2626'],
        disposed:    ['#f3f4f6', '#6b7280'],
        requested:   ['#fef9c3', '#d97706'],
        approved:    ['#dbeafe', '#2563eb'],
        dispatched:  ['#dbeafe', '#2563eb'],
        in_transit:  ['#dbeafe', '#2563eb'],
        received:    ['#dcfce7', '#16a34a'],
        rejected:    ['#fee2e2', '#dc2626'],
        delayed:     ['#fee2e2', '#dc2626'],
        low_stock:   ['#fef9c3', '#d97706'],
        near_expiry2:['#fef9c3', '#d97706'],
        critical:    ['#fee2e2', '#dc2626'],
        high:        ['#fee2e2', '#dc2626'],
        medium:      ['#fef9c3', '#d97706'],
        low:         ['#f3f4f6', '#6b7280'],
    };
    const [bg, color] = map[status] || ['#f3f4f6', '#6b7280'];
    return (
        <span style={{ background: bg, color, fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {status?.replace(/_/g, ' ')}
        </span>
    );
}

function StatCard({ label, value, color }) {
    return (
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 26, fontWeight: 600, color: color || '#111827' }}>{value ?? '—'}</div>
        </div>
    );
}

function Table({ cols, data, loading, empty = 'No data.' }) {
    return (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#f9fafb' }}>
                        {cols.map((c) => (
                            <th key={c} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, fontWeight: 500, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr><td colSpan={cols.length} style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading…</td></tr>
                    ) : data?.length === 0 ? (
                        <tr><td colSpan={cols.length} style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>{empty}</td></tr>
                    ) : data?.map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>{row}</tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Td({ children, mono }) {
    return <td style={{ padding: '11px 14px', fontSize: 13, fontFamily: mono ? 'monospace' : undefined }}>{children}</td>;
}

function PageHeader({ title, sub, action }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div>
                <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{title}</h1>
                {sub && <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{sub}</p>}
            </div>
            {action}
        </div>
    );
}

function Modal({ open, onClose, title, children }) {
    if (!open) return null;
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280', padding: 4 }}>×</button>
                </div>
                {children}
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 5, color: '#374151' }}>{label}</label>
            {children}
        </div>
    );
}

const inp = { width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 11px', fontSize: 14, outline: 'none' };
const btn = { padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500 };
const btnPrimary   = { ...btn, background: '#2563eb', color: '#fff' };
const btnSecondary = { ...btn, background: '#f3f4f6', color: '#374151' };
const btnDanger    = { ...btn, background: '#fee2e2', color: '#dc2626' };
const btnSuccess   = { ...btn, background: '#dcfce7', color: '#16a34a' };

// ─────────────────────────────────────────────
// LAYOUT
// ─────────────────────────────────────────────
const navItems = [
    { path: '/',          label: 'Dashboard', icon: '📊' },
    { path: '/inventory', label: 'Inventory', icon: '💊' },
    { path: '/transfers', label: 'Transfers', icon: '🔄' },
    { path: '/alerts',    label: 'Alerts',    icon: '🔔' },
    { path: '/depots',    label: 'Depots',    icon: '🏭' },
    { path: '/medicines', label: 'Medicines', icon: '🧪' },
];

function AppLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f8fa' }}>
            {/* Sidebar */}
            <aside style={{ width: collapsed ? 60 : 220, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0, transition: 'width 0.2s' }}>
                <div style={{ padding: '18px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>💊</span>
                    {!collapsed && <span style={{ fontWeight: 600, fontSize: 15 }}>PharmaFlow</span>}
                </div>
                <nav style={{ flex: 1, padding: '10px 8px' }}>
                    {navItems.map((item) => {
                        const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                            <Link key={item.path} to={item.path} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                                textDecoration: 'none', fontSize: 14, fontWeight: active ? 500 : 400,
                                background: active ? '#dbeafe' : 'transparent',
                                color: active ? '#2563eb' : '#6b7280',
                            }}>
                                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                                {!collapsed && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>
                <div style={{ padding: '12px 14px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: '#2563eb', flexShrink: 0 }}>
                        {user?.name?.charAt(0).toUpperCase()}
                    </div>
                    {!collapsed && (
                        <>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                                <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'capitalize' }}>{user?.role?.replace(/_/g, ' ')}</div>
                            </div>
                            <button onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9ca3af' }} title="Logout">↩</button>
                        </>
                    )}
                </div>
            </aside>

            {/* Main */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button onClick={() => setCollapsed((c) => !c)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7280' }}>☰</button>
                    <span style={{ fontSize: 13, color: '#9ca3af' }}>{user?.depot?.name || 'All Depots'}</span>
                </header>
                <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────
function Login() {
    const { login } = useAuth();
    const [form, setForm]       = useState({ email: '', password: '' });
    const [error, setError]     = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(form.email, form.password);
            window.location.href = '/';
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fa' }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: '36px 32px', border: '1px solid #e5e7eb', width: '100%', maxWidth: 380 }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>💊</div>
                    <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>PharmaFlow</h1>
                    <p style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>Medicine Supply Chain Management</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <Field label="Email">
                        <input type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="admin@pharmaflow.com" style={inp} />
                    </Field>
                    <Field label="Password">
                        <input type="password" required value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="••••••••" style={inp} />
                    </Field>
                    {error && <div style={{ background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '9px 12px', fontSize: 13, marginBottom: 14 }}>{error}</div>}
                    <button type="submit" disabled={loading} style={{ ...btnPrimary, width: '100%', padding: '10px 0', marginTop: 4 }}>
                        {loading ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>
                <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 16 }}>
                    Demo: admin@pharmaflow.com / password
                </p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────
function Dashboard() {
    const { user } = useAuth();
    const depotId = user?.depot_id;

    const { data: summary } = useQuery({ queryKey: ['summary', depotId], queryFn: () => inventoryAPI.summary(depotId).then((r) => r.data) });
    const { data: alertStats } = useQuery({ queryKey: ['alert-stats', depotId], queryFn: () => alertAPI.stats(depotId).then((r) => r.data) });
    const { data: transfers } = useQuery({ queryKey: ['transfers-recent'], queryFn: () => transferAPI.list({ per_page: 5 }).then((r) => r.data) });

    return (
        <div>
            <PageHeader title="Dashboard" sub={user?.depot?.name || 'All depots overview'} />

            <h3 style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Inventory</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 28 }}>
                <StatCard label="Total Medicines"  value={summary?.total_medicines} />
                <StatCard label="Total Units"       value={summary?.total_units?.toLocaleString()} />
                <StatCard label="Stock Value (৳)"   value={summary ? Number(summary.total_value).toLocaleString() : null} />
                <StatCard label="Expiring (90 days)" value={summary?.expiring_90} color="#d97706" />
                <StatCard label="Low Stock Items"   value={summary?.low_stock_count} color="#dc2626" />
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Alerts</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 12, marginBottom: 28 }}>
                <StatCard label="Unresolved"  value={alertStats?.total} />
                <StatCard label="Critical"    value={alertStats?.critical}    color="#dc2626" />
                <StatCard label="Low Stock"   value={alertStats?.low_stock}   color="#d97706" />
                <StatCard label="Near Expiry" value={alertStats?.near_expiry} color="#d97706" />
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Recent Transfers</h3>
            <Table
                cols={['Medicine', 'From → To', 'Qty', 'Status']}
                loading={!transfers}
                empty="No transfers yet."
                data={transfers?.data?.map((t) => (
                    <>
                        <Td><div style={{ fontWeight: 500 }}>{t.medicine?.name}</div></Td>
                        <Td><span style={{ color: '#6b7280' }}>{t.from_depot?.name} → {t.to_depot?.name}</span></Td>
                        <Td>{t.quantity}</Td>
                        <Td><Badge status={t.status} /></Td>
                    </>
                ))}
            />
        </div>
    );
}

// ─────────────────────────────────────────────
// INVENTORY PAGE
// ─────────────────────────────────────────────
function Inventory() {
    const qc = useQueryClient();
    const [tab, setTab]           = useState('stock');
    const [search, setSearch]     = useState('');
    const [days, setDays]         = useState(90);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm]         = useState({ medicine_id: '', depot_id: '', lot_number: '', quantity: '', cost_per_unit: '', expiry_date: '', manufacture_date: '' });

    const { data: inventory, isLoading } = useQuery({ queryKey: ['inventory', search], queryFn: () => inventoryAPI.list({ search }).then((r) => r.data) });
    const { data: expiring }             = useQuery({ queryKey: ['expiring', days], queryFn: () => inventoryAPI.expiring({ days }).then((r) => r.data) });
    const { data: medicines }            = useQuery({ queryKey: ['medicines'], queryFn: () => medicineAPI.list().then((r) => r.data) });
    const { data: depots }               = useQuery({ queryKey: ['depots'], queryFn: () => depotAPI.list().then((r) => r.data) });

    const receive = useMutation({
        mutationFn: inventoryAPI.receive,
        onSuccess: () => { qc.invalidateQueries(['inventory']); setShowModal(false); setForm({ medicine_id:'', depot_id:'', lot_number:'', quantity:'', cost_per_unit:'', expiry_date:'', manufacture_date:'' }); toast.success('Batch received!'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });

    const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    return (
        <div>
            <PageHeader
                title="Inventory"
                sub="Batch-level stock tracking"
                action={<button style={btnPrimary} onClick={() => setShowModal(true)}>+ Receive Batch</button>}
            />

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 20 }}>
                {['stock', 'expiring'].map((t) => (
                    <button key={t} onClick={() => setTab(t)} style={{ background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #2563eb' : '2px solid transparent', color: tab === t ? '#2563eb' : '#6b7280', padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: tab === t ? 500 : 400, marginBottom: -1 }}>
                        {t === 'stock' ? 'Current Stock' : 'Expiry Tracking'}
                    </button>
                ))}
            </div>

            {tab === 'stock' && (
                <>
                    <input placeholder="Search medicine or lot number…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inp, width: 280, marginBottom: 16 }} />
                    <Table
                        cols={['Medicine', 'Lot Number', 'Depot', 'Available', 'Cost/Unit', 'Expiry', 'Status']}
                        loading={isLoading}
                        data={inventory?.data?.map((b) => (
                            <>
                                <Td><div style={{ fontWeight: 500 }}>{b.medicine?.name}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{b.medicine?.category}</div></Td>
                                <Td mono>{b.lot_number}</Td>
                                <Td>{b.depot?.name}</Td>
                                <Td><strong>{b.quantity_available}</strong> {b.medicine?.unit}</Td>
                                <Td>৳{b.cost_per_unit}</Td>
                                <Td>{b.expiry_date}</Td>
                                <Td><Badge status={b.status} /></Td>
                            </>
                        ))}
                    />
                </>
            )}

            {tab === 'expiring' && (
                <>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontSize: 13, color: '#6b7280' }}>Show expiring within</span>
                        {[30, 60, 90].map((d) => (
                            <button key={d} onClick={() => setDays(d)} style={{ ...btnSecondary, background: days === d ? '#dbeafe' : '#f3f4f6', color: days === d ? '#2563eb' : '#6b7280', padding: '4px 14px', borderRadius: 99, fontSize: 13 }}>{d} days</button>
                        ))}
                    </div>
                    <Table
                        cols={['Medicine', 'Lot No.', 'Depot', 'Qty', 'Expiry Date', 'Days Left', 'Action']}
                        data={expiring?.map((b) => (
                            <>
                                <Td><strong>{b.medicine?.name}</strong></Td>
                                <Td mono>{b.lot_number}</Td>
                                <Td>{b.depot?.name}</Td>
                                <Td>{b.quantity_available}</Td>
                                <Td>{b.expiry_date}</Td>
                                <Td><span style={{ color: b.days_to_expiry <= 30 ? '#dc2626' : '#d97706', fontWeight: 600 }}>{b.days_to_expiry}d</span></Td>
                                <Td><button onClick={() => { inventoryAPI.flagBatch(b.id).then(() => { toast.success('Flagged'); qc.invalidateQueries(['expiring']); }); }} style={{ ...btnDanger, padding: '4px 10px', fontSize: 12 }}>Flag</button></Td>
                            </>
                        ))}
                    />
                </>
            )}

            {/* Receive Batch Modal */}
            <Modal open={showModal} onClose={() => setShowModal(false)} title="Receive New Batch">
                <Field label="Medicine">
                    <select value={form.medicine_id} onChange={(e) => setF('medicine_id', e.target.value)} style={inp}>
                        <option value="">Select medicine…</option>
                        {medicines?.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </Field>
                <Field label="Depot">
                    <select value={form.depot_id} onChange={(e) => setF('depot_id', e.target.value)} style={inp}>
                        <option value="">Select depot…</option>
                        {depots?.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </Field>
                <Field label="Lot Number"><input value={form.lot_number} onChange={(e) => setF('lot_number', e.target.value)} placeholder="e.g. LOT-2024-001" style={inp} /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Quantity"><input type="number" value={form.quantity} onChange={(e) => setF('quantity', e.target.value)} placeholder="500" style={inp} /></Field>
                    <Field label="Cost / Unit (৳)"><input type="number" value={form.cost_per_unit} onChange={(e) => setF('cost_per_unit', e.target.value)} placeholder="2.50" style={inp} /></Field>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Manufacture Date"><input type="date" value={form.manufacture_date} onChange={(e) => setF('manufacture_date', e.target.value)} style={inp} /></Field>
                    <Field label="Expiry Date"><input type="date" value={form.expiry_date} onChange={(e) => setF('expiry_date', e.target.value)} style={inp} /></Field>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                    <button style={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
                    <button style={btnPrimary} onClick={() => receive.mutate(form)} disabled={receive.isPending}>
                        {receive.isPending ? 'Saving…' : 'Receive Batch'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}

// ─────────────────────────────────────────────
// TRANSFERS PAGE
// ─────────────────────────────────────────────
function Transfers() {
    const qc = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [filter, setFilter]       = useState('');
    const [form, setForm]           = useState({ from_depot_id: '', to_depot_id: '', medicine_id: '', batch_id: '', quantity: '', notes: '' });

    const { data: transfers, isLoading } = useQuery({ queryKey: ['transfers', filter], queryFn: () => transferAPI.list(filter ? { status: filter } : {}).then((r) => r.data) });
    const { data: depots }    = useQuery({ queryKey: ['depots'],    queryFn: () => depotAPI.list().then((r) => r.data) });
    const { data: medicines } = useQuery({ queryKey: ['medicines'], queryFn: () => medicineAPI.list().then((r) => r.data) });

    const create = useMutation({
        mutationFn: transferAPI.create,
        onSuccess: () => { qc.invalidateQueries(['transfers']); setShowModal(false); toast.success('Transfer requested!'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
    });

    const updateStatus = useMutation({
        mutationFn: ({ id, status }) => transferAPI.update(id, { status }),
        onSuccess: () => { qc.invalidateQueries(['transfers']); toast.success('Status updated'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Cannot update status'),
    });

    const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const nextAction = (status) => {
        const map = { requested: ['approved','rejected'], approved: ['dispatched'], dispatched: ['in_transit'], in_transit: ['received'] };
        return map[status] || [];
    };

    const actionBtn = (t, s) => {
        const styles = { approved: btnSuccess, dispatched: btnPrimary, in_transit: btnPrimary, received: btnSuccess, rejected: btnDanger };
        return <button key={s} style={{ ...(styles[s] || btnSecondary), padding: '4px 10px', fontSize: 12, marginLeft: 4 }} onClick={() => updateStatus.mutate({ id: t.id, status: s })}>{s}</button>;
    };

    const statuses = ['', 'requested', 'approved', 'dispatched', 'in_transit', 'received', 'rejected'];

    return (
        <div>
            <PageHeader
                title="Transfers"
                sub="Inter-depot stock transfers"
                action={<button style={btnPrimary} onClick={() => setShowModal(true)}>+ New Transfer</button>}
            />

            {/* Status filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
                {statuses.map((s) => (
                    <button key={s} onClick={() => setFilter(s)} style={{ ...btnSecondary, background: filter === s ? '#dbeafe' : '#f3f4f6', color: filter === s ? '#2563eb' : '#6b7280', padding: '4px 14px', borderRadius: 99, fontSize: 13 }}>
                        {s || 'All'}
                    </button>
                ))}
            </div>

            <Table
                cols={['Medicine', 'From', 'To', 'Qty', 'Status', 'Requested By', 'Actions']}
                loading={isLoading}
                empty="No transfers found."
                data={transfers?.data?.map((t) => (
                    <>
                        <Td><strong>{t.medicine?.name}</strong></Td>
                        <Td>{t.from_depot?.name}</Td>
                        <Td>{t.to_depot?.name}</Td>
                        <Td>{t.quantity}</Td>
                        <Td><Badge status={t.status} /></Td>
                        <Td>{t.requested_by?.name}</Td>
                        <Td>{nextAction(t.status).map((s) => actionBtn(t, s))}</Td>
                    </>
                ))}
            />

            {/* New Transfer Modal */}
            <Modal open={showModal} onClose={() => setShowModal(false)} title="New Transfer Request">
                <Field label="From Depot">
                    <select value={form.from_depot_id} onChange={(e) => setF('from_depot_id', e.target.value)} style={inp}>
                        <option value="">Select source depot…</option>
                        {depots?.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </Field>
                <Field label="To Depot">
                    <select value={form.to_depot_id} onChange={(e) => setF('to_depot_id', e.target.value)} style={inp}>
                        <option value="">Select destination depot…</option>
                        {depots?.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </Field>
                <Field label="Medicine">
                    <select value={form.medicine_id} onChange={(e) => setF('medicine_id', e.target.value)} style={inp}>
                        <option value="">Select medicine…</option>
                        {medicines?.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </Field>
                <Field label="Batch ID"><input type="number" value={form.batch_id} onChange={(e) => setF('batch_id', e.target.value)} placeholder="Batch ID from inventory" style={inp} /></Field>
                <Field label="Quantity"><input type="number" value={form.quantity} onChange={(e) => setF('quantity', e.target.value)} placeholder="e.g. 200" style={inp} /></Field>
                <Field label="Notes (optional)"><textarea value={form.notes} onChange={(e) => setF('notes', e.target.value)} rows={2} placeholder="Reason for transfer…" style={{ ...inp, resize: 'vertical' }} /></Field>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                    <button style={btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
                    <button style={btnPrimary} onClick={() => create.mutate(form)} disabled={create.isPending}>
                        {create.isPending ? 'Submitting…' : 'Submit Request'}
                    </button>
                </div>
            </Modal>
        </div>
    );
}

// ─────────────────────────────────────────────
// ALERTS PAGE
// ─────────────────────────────────────────────
function Alerts() {
    const qc = useQueryClient();
    const [type, setType] = useState('');

    const { data: alerts, isLoading } = useQuery({ queryKey: ['alerts', type], queryFn: () => alertAPI.list(type ? { type } : {}).then((r) => r.data) });
    const { data: stats }             = useQuery({ queryKey: ['alert-stats'], queryFn: () => alertAPI.stats().then((r) => r.data) });

    const resolve = useMutation({
        mutationFn: alertAPI.resolve,
        onSuccess: () => { qc.invalidateQueries(['alerts']); qc.invalidateQueries(['alert-stats']); toast.success('Alert resolved'); },
    });

    const types = ['', 'low_stock', 'near_expiry', 'expired', 'transfer_delayed'];

    return (
        <div>
            <PageHeader title="Alerts" sub="Active system alerts" />

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
                <StatCard label="Total Active"  value={stats?.total} />
                <StatCard label="Critical"      value={stats?.critical}    color="#dc2626" />
                <StatCard label="Low Stock"     value={stats?.low_stock}   color="#d97706" />
                <StatCard label="Near Expiry"   value={stats?.near_expiry} color="#d97706" />
                <StatCard label="Expired"       value={stats?.expired}     color="#dc2626" />
            </div>

            {/* Type filter */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
                {types.map((t) => (
                    <button key={t} onClick={() => setType(t)} style={{ ...btnSecondary, background: type === t ? '#dbeafe' : '#f3f4f6', color: type === t ? '#2563eb' : '#6b7280', padding: '4px 14px', borderRadius: 99, fontSize: 13 }}>
                        {t ? t.replace(/_/g, ' ') : 'All'}
                    </button>
                ))}
            </div>

            <Table
                cols={['Type', 'Medicine', 'Depot', 'Severity', 'Message', 'Action']}
                loading={isLoading}
                empty="No active alerts 🎉"
                data={alerts?.data?.map((a) => (
                    <>
                        <Td><Badge status={a.type} /></Td>
                        <Td><strong>{a.medicine?.name}</strong></Td>
                        <Td>{a.depot?.name}</Td>
                        <Td><Badge status={a.severity} /></Td>
                        <Td><span style={{ color: '#6b7280', fontSize: 12 }}>{a.message}</span></Td>
                        <Td>
                            <button style={{ ...btnSuccess, padding: '4px 10px', fontSize: 12 }} onClick={() => resolve.mutate(a.id)} disabled={resolve.isPending}>
                                Resolve
                            </button>
                        </Td>
                    </>
                ))}
            />
        </div>
    );
}

// ─────────────────────────────────────────────
// DEPOTS PAGE
// ─────────────────────────────────────────────
function Depots() {
    const { data: depots, isLoading } = useQuery({ queryKey: ['depots'], queryFn: () => depotAPI.list().then((r) => r.data) });

    return (
        <div>
            <PageHeader title="Depots" sub="Hub-and-spoke depot network" />
            <Table
                cols={['Name', 'District', 'Hub', 'Capacity', 'Status']}
                loading={isLoading}
                empty="No depots found."
                data={depots?.data?.map((d) => (
                    <>
                        <Td><strong>{d.name}</strong></Td>
                        <Td>{d.district}</Td>
                        <Td>{d.hub?.name}</Td>
                        <Td>{d.capacity?.toLocaleString()} units</Td>
                        <Td><Badge status={d.is_active ? 'active' : 'disposed'} /></Td>
                    </>
                ))}
            />
        </div>
    );
}

// ─────────────────────────────────────────────
// MEDICINES PAGE
// ─────────────────────────────────────────────
function Medicines() {
    const { data: medicines, isLoading } = useQuery({ queryKey: ['medicines'], queryFn: () => medicineAPI.list().then((r) => r.data) });

    return (
        <div>
            <PageHeader title="Medicines" sub="Medicine catalogue" />
            <Table
                cols={['Name', 'Generic Name', 'Category', 'Unit', 'Cost/Unit', 'Reorder Threshold', 'Supplier']}
                loading={isLoading}
                empty="No medicines found."
                data={medicines?.data?.map((m) => (
                    <>
                        <Td><strong>{m.name}</strong></Td>
                        <Td>{m.generic_name}</Td>
                        <Td>{m.category}</Td>
                        <Td>{m.unit}</Td>
                        <Td>৳{m.cost_per_unit}</Td>
                        <Td>{m.reorder_threshold}</Td>
                        <Td>{m.supplier?.name || '—'}</Td>
                    </>
                ))}
            />
        </div>
    );
}

// ─────────────────────────────────────────────
// PRIVATE ROUTE WRAPPER
// ─────────────────────────────────────────────
function PrivateRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontSize: 14, color: '#6b7280' }}>Loading…</div>;
    return user ? children : <Navigate to="/login" replace />;
}

// ─────────────────────────────────────────────
// APP ROUTER
// ─────────────────────────────────────────────
function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
                <Route index          element={<Dashboard />} />
                <Route path="inventory" element={<Inventory />} />
                <Route path="transfers" element={<Transfers />} />
                <Route path="alerts"    element={<Alerts />} />
                <Route path="depots"    element={<Depots />} />
                <Route path="medicines" element={<Medicines />} />
            </Route>
        </Routes>
    );
}

// ─────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } });

ReactDOM.createRoot(document.getElementById('app')).render(
    <BrowserRouter>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <AppRoutes />
                <Toaster position="top-right" toastOptions={{ style: { fontSize: 13 } }} />
            </AuthProvider>
        </QueryClientProvider>
    </BrowserRouter>
);