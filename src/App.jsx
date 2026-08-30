import { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  blue: "#2563EB",
  blueDark: "#1D4ED8",
  blueLight: "#EFF6FF",
  blueMid: "#BFDBFE",
  white: "#FFFFFF",
  gray50: "#F8FAFC",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray300: "#CBD5E1",
  gray400: "#94A3B8",
  gray500: "#64748B",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1E293B",
  gray900: "#0F172A",
  green: "#16A34A",
  greenLight: "#DCFCE7",
  yellow: "#CA8A04",
  yellowLight: "#FEF9C3",
  red: "#DC2626",
  redLight: "#FEE2E2",
  orange: "#EA580C",
  orangeLight: "#FFEDD5",
  purple: "#7C3AED",
  purpleLight: "#EDE9FE",
};

const statusColors = {
  Pending: { bg: C.yellowLight, text: C.yellow, dot: C.yellow },
  Shortlisted: { bg: C.blueLight, text: C.blue, dot: C.blue },
  Rejected: { bg: C.redLight, text: C.red, dot: C.red },
  Accepted: { bg: C.greenLight, text: C.green, dot: C.green },
  Interview: { bg: C.purpleLight, text: C.purple, dot: C.purple },
};

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const s = statusColors[status] || statusColors.Pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: s.bg, color: s.text,
      padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {status}
    </span>
  );
};

const Btn = ({ children, variant = "primary", onClick, full, small, style: ext = {} }) => {
  const [hov, setHov] = useState(false);
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    padding: small ? "6px 14px" : "10px 22px",
    borderRadius: 8, fontWeight: 600, fontSize: small ? 13 : 14,
    cursor: "pointer", border: "none", transition: "all .15s",
    width: full ? "100%" : undefined,
  };
  const styles = {
    primary: { background: hov ? C.blueDark : C.blue, color: C.white },
    outline: { background: "transparent", color: C.blue, border: `1.5px solid ${C.blue}`, ...(hov ? { background: C.blueLight } : {}) },
    ghost: { background: hov ? C.gray100 : "transparent", color: C.gray700 },
    danger: { background: hov ? "#B91C1C" : C.red, color: C.white },
    success: { background: hov ? "#15803D" : C.green, color: C.white },
  };
  return (
    <button style={{ ...base, ...styles[variant], ...ext }}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}>
      {children}
    </button>
  );
};

const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.white, borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
    border: `1px solid ${C.gray200}`,
    padding: 24, ...style
  }}>
    {children}
  </div>
);

const Input = ({ label, type = "text", value, onChange, placeholder, options, textarea }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {label && <label style={{ fontSize: 13, fontWeight: 600, color: C.gray700 }}>{label}</label>}
    {textarea ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        rows={4} style={{
          padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${C.gray300}`,
          fontSize: 14, color: C.gray800, resize: "vertical", fontFamily: "inherit",
          outline: "none",
        }} />
    ) : options ? (
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${C.gray300}`,
        fontSize: 14, color: C.gray800, background: C.white, cursor: "pointer",
      }}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} style={{
          padding: "10px 12px", borderRadius: 8, border: `1.5px solid ${C.gray300}`,
          fontSize: 14, color: C.gray800, outline: "none",
        }} />
    )}
  </div>
);

const StatCard = ({ icon, label, value, color = C.blue, sub }) => (
  <Card style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 13, color: C.gray500, fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.gray900, marginTop: 4 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: C.green, marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
        {icon}
      </div>
    </div>
  </Card>
);

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
const Sidebar = ({ role, page, setPage, user }) => {
  const seekerNav = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "profile", icon: "👤", label: "My Profile" },
    { id: "jobs", icon: "🔍", label: "Find Jobs" },
    { id: "applications", icon: "📋", label: "My Applications" },
    { id: "notifications", icon: "🔔", label: "Notifications" },
  ];
  const employerNav = [
    { id: "emp-dashboard", icon: "⊞", label: "Dashboard" },
    { id: "post-job", icon: "➕", label: "Post a Job" },
    { id: "applicants", icon: "👥", label: "View Applicants" },
    { id: "notifications", icon: "🔔", label: "Notifications" },
  ];
  const adminNav = [
    { id: "admin-dashboard", icon: "⊞", label: "Dashboard" },
    { id: "admin-users", icon: "👥", label: "Users" },
    { id: "admin-jobs", icon: "💼", label: "Jobs" },
    { id: "notifications", icon: "🔔", label: "Notifications" },
  ];
  const nav = role === "employer" ? employerNav : role === "admin" ? adminNav : seekerNav;

  return (
    <div style={{
      width: 240, minHeight: "100vh", background: C.gray900,
      display: "flex", flexDirection: "column", position: "fixed", left: 0, top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 16px", borderBottom: `1px solid ${C.gray700}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎯</div>
          <div>
            <div style={{ color: C.white, fontWeight: 800, fontSize: 16 }}>CareerTrack</div>
            <div style={{ color: C.gray400, fontSize: 11 }}>{role === "employer" ? "Employer" : role === "admin" ? "Admin" : "Job Seeker"}</div>
          </div>
        </div>
      </div>

      {/* User */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.gray700}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontWeight: 700, fontSize: 14 }}>
            {user?.name?.[0] || "U"}
          </div>
          <div>
            <div style={{ color: C.white, fontSize: 13, fontWeight: 600 }}>{user?.name || "User"}</div>
            <div style={{ color: C.gray400, fontSize: 11 }}>{user?.email || ""}</div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ flex: 1, padding: "12px 10px" }}>
        {nav.map(item => {
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => setPage(item.id)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: active ? C.blue : "transparent",
              color: active ? C.white : C.gray400,
              fontSize: 14, fontWeight: active ? 600 : 400,
              marginBottom: 2, transition: "all .15s",
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "12px 10px", borderTop: `1px solid ${C.gray700}` }}>
        <button onClick={() => setPage("landing")} style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
          background: "transparent", color: C.gray400, fontSize: 14,
        }}>
          <span>🚪</span> Log Out
        </button>
      </div>
    </div>
  );
};

const Layout = ({ children, role, page, setPage, user }) => (
  <div style={{ display: "flex", minHeight: "100vh", background: C.gray50 }}>
    <Sidebar role={role} page={page} setPage={setPage} user={user} />
    <main style={{ marginLeft: 240, flex: 1, padding: 32, maxWidth: "calc(100vw - 240px)" }}>
      {children}
    </main>
  </div>
);

const PageHeader = ({ title, sub, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: C.gray900, margin: 0 }}>{title}</h1>
      {sub && <p style={{ color: C.gray500, margin: "4px 0 0", fontSize: 14 }}>{sub}</p>}
    </div>
    {action}
  </div>
);

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
const LandingPage = ({ setPage }) => {
  const features = [
    { icon: "🎯", title: "Skill-Based Matching", desc: "Get matched with jobs that suit your exact skillset using our intelligent algorithm." },
    { icon: "📊", title: "Application Tracking", desc: "Track every application in real-time from submission to final decision." },
    { icon: "🤝", title: "Employer Engagement", desc: "Direct connection between job seekers and verified South African employers." },
    { icon: "🔔", title: "Real-Time Notifications", desc: "Instant alerts when your application status changes or new jobs match your profile." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.white, fontFamily: "'Segoe UI', sans-serif" }}>
      {/* Navbar */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50, background: C.white,
        borderBottom: `1px solid ${C.gray200}`, padding: "0 48px",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: 64,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🎯</div>
          <span style={{ fontWeight: 800, fontSize: 18, color: C.gray900 }}>CareerTrack</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Btn variant="ghost" onClick={() => setPage("login")}>Log In</Btn>
          <Btn onClick={() => setPage("register")}>Get Started</Btn>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        background: `linear-gradient(135deg, #1E3A8A 0%, ${C.blue} 60%, #3B82F6 100%)`,
        padding: "80px 48px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,.08) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(255,255,255,.06) 0%, transparent 50%)" }} />
        <div style={{ position: "relative", maxWidth: 700, margin: "0 auto" }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,.15)", color: C.white, padding: "6px 16px", borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
            🇿🇦 Connecting South African Youth with Opportunity
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, color: C.white, lineHeight: 1.1, margin: "0 0 20px" }}>
            Your Career Journey<br />Starts Here
          </h1>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,.85)", maxWidth: 500, margin: "0 auto 36px" }}>
            Find your perfect job match, track applications, and connect directly with top South African employers.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <Btn onClick={() => setPage("register")} style={{ padding: "14px 32px", fontSize: 15, background: C.white, color: C.blue }}>Find Jobs →</Btn>
            <Btn variant="outline" onClick={() => setPage("register")} style={{ padding: "14px 32px", fontSize: 15, borderColor: "rgba(255,255,255,.5)", color: C.white }}>Post a Job</Btn>
          </div>
          <div style={{ display: "flex", gap: 40, justifyContent: "center", marginTop: 48 }}>
            {[["12,000+", "Jobs Posted"], ["45,000+", "Job Seekers"], ["3,200+", "Employers"]].map(([n, l]) => (
              <div key={l} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.white }}>{n}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,.7)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "72px 48px", background: C.gray50 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h2 style={{ fontSize: 34, fontWeight: 800, color: C.gray900, margin: 0 }}>Everything You Need</h2>
          <p style={{ color: C.gray500, marginTop: 8, fontSize: 16 }}>A complete platform for job seekers and employers alike</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, maxWidth: 960, margin: "0 auto" }}>
          {features.map(f => (
            <Card key={f.title}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: C.gray900, margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: C.gray500, margin: 0, lineHeight: 1.6 }}>{f.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "60px 48px", background: C.blue, textAlign: "center" }}>
        <h2 style={{ fontSize: 30, fontWeight: 800, color: C.white, margin: "0 0 12px" }}>Ready to Find Your Dream Job?</h2>
        <p style={{ color: "rgba(255,255,255,.8)", marginBottom: 28, fontSize: 16 }}>Join thousands of South Africans who found their career through CareerTrack</p>
        <Btn onClick={() => setPage("register")} style={{ background: C.white, color: C.blue, padding: "14px 36px", fontSize: 15 }}>Create Free Account</Btn>
      </section>

      {/* Footer */}
      <footer style={{ padding: "28px 48px", background: C.gray900, color: C.gray400, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span>© 2025 CareerTrack. All rights reserved.</span>
        <span>Connect South African youth with opportunity</span>
      </footer>
    </div>
  );
};


// ─── AUTH PAGES ───────────────────────────────────────────────────────────────
const LoginPage = ({ setPage, setUser, setRole }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [roleChoice, setRoleChoice] = useState("seeker");

  const handle = () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (!email.includes("@")) { setError("Enter a valid email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError("");
    const name = email.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, c => c.toUpperCase());
    setUser({ name, email });
    setRole(roleChoice);
    setPage(roleChoice === "employer" ? "emp-dashboard" : roleChoice === "admin" ? "admin-dashboard" : "dashboard");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.gray50 }}>
      <div style={{ width: "100%", maxWidth: 420, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 14px" }}>🎯</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: C.gray900, margin: 0 }}>Welcome Back</h1>
          <p style={{ color: C.gray500, margin: "6px 0 0" }}>Sign in to your CareerTrack account</p>
        </div>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Role toggle */}
            <div style={{ display: "flex", background: C.gray100, borderRadius: 8, padding: 4 }}>
              {[["seeker", "Job Seeker"], ["employer", "Employer"], ["admin", "Admin"]].map(([r, l]) => (
                <button key={r} onClick={() => setRoleChoice(r)} style={{
                  flex: 1, padding: "8px 4px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  background: roleChoice === r ? C.white : "transparent",
                  color: roleChoice === r ? C.blue : C.gray500,
                  boxShadow: roleChoice === r ? "0 1px 3px rgba(0,0,0,.1)" : "none",
                }}>
                  {l}
                </button>
              ))}
            </div>
            <Input label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            <Input label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
            {error && <div style={{ background: C.redLight, color: C.red, padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>⚠️ {error}</div>}
            <Btn full onClick={handle}>Sign In</Btn>
            <div style={{ textAlign: "center", fontSize: 13, color: C.gray500 }}>
              Don't have an account?{" "}
              <button onClick={() => setPage("register")} style={{ color: C.blue, fontWeight: 600, border: "none", background: "none", cursor: "pointer" }}>Register</button>
            </div>
            <div style={{ textAlign: "center" }}>
              <button onClick={() => setPage("landing")} style={{ color: C.gray400, fontSize: 12, border: "none", background: "none", cursor: "pointer" }}>← Back to Home</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const RegisterPage = ({ setPage, setUser, setRole }) => {
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "", role: "seeker" });
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Full name is required";
    if (!form.email.includes("@")) e.email = "Valid email required";
    if (form.password.length < 6) e.password = "At least 6 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handle = () => {
    if (!validate()) return;
    setUser({ name: form.name, email: form.email });
    setRole(form.role);
    setDone(true);
    setTimeout(() => {
      setPage(form.role === "employer" ? "emp-dashboard" : "dashboard");
    }, 1500);
  };

  if (done) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.gray50 }}>
      <Card style={{ textAlign: "center", padding: 48 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: C.green, margin: "0 0 8px" }}>Account Created!</h2>
        <p style={{ color: C.gray500 }}>Redirecting you to your dashboard…</p>
      </Card>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.gray50 }}>
      <div style={{ width: "100%", maxWidth: 460, padding: 24 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 14px" }}>🎯</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: C.gray900, margin: 0 }}>Create Account</h1>
          <p style={{ color: C.gray500, margin: "6px 0 0" }}>Join CareerTrack today — it's free</p>
        </div>
        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.gray700 }}>I am a…</label>
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                {[["seeker", "🙋 Job Seeker"], ["employer", "🏢 Employer"]].map(([r, l]) => (
                  <button key={r} onClick={() => set("role")(r)} style={{
                    flex: 1, padding: "10px", borderRadius: 8, border: `2px solid ${form.role === r ? C.blue : C.gray200}`,
                    cursor: "pointer", fontWeight: 600, fontSize: 14,
                    background: form.role === r ? C.blueLight : C.white,
                    color: form.role === r ? C.blue : C.gray600,
                  }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Full Name" value={form.name} onChange={set("name")} placeholder="Thabo Nkosi" />
            {errors.name && <span style={{ color: C.red, fontSize: 12 }}>{errors.name}</span>}
            <Input label="Email Address" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
            {errors.email && <span style={{ color: C.red, fontSize: 12 }}>{errors.email}</span>}
            <Input label="Password" type="password" value={form.password} onChange={set("password")} placeholder="Min 6 characters" />
            {errors.password && <span style={{ color: C.red, fontSize: 12 }}>{errors.password}</span>}
            <Input label="Confirm Password" type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" />
            {errors.confirm && <span style={{ color: C.red, fontSize: 12 }}>{errors.confirm}</span>}
            <Btn full onClick={handle}>Create Account</Btn>
            <div style={{ textAlign: "center", fontSize: 13, color: C.gray500 }}>
              Already have an account?{" "}
              <button onClick={() => setPage("login")} style={{ color: C.blue, fontWeight: 600, border: "none", background: "none", cursor: "pointer" }}>Sign In</button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── SEEKER DASHBOARD ─────────────────────────────────────────────────────────
const applications = [
  { id: 1, job: "Frontend Developer", company: "TechHub ZA", location: "Cape Town", date: "2025-05-10", status: "Shortlisted" },
  { id: 2, job: "UX Designer", company: "CreativeFlow", location: "Johannesburg", date: "2025-05-08", status: "Pending" },
  { id: 3, job: "Data Analyst", company: "InsightSA", location: "Durban", date: "2025-05-05", status: "Rejected" },
  { id: 4, job: "Product Manager", company: "Innovate Inc", location: "Pretoria", date: "2025-05-02", status: "Accepted" },
  { id: 5, job: "Backend Engineer", company: "CloudBase", location: "Cape Town", date: "2025-04-28", status: "Interview" },
];

const SeekerDashboard = ({ user, setPage }) => (
  <div>
    <PageHeader
      title={`Welcome back, ${user?.name?.split(" ")[0] || "there"} 👋`}
      sub="Here's a snapshot of your job search activity"
    />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
      <StatCard icon="📋" label="Total Applications" value="12" sub="↑ 3 this week" />
      <StatCard icon="⏳" label="Under Review" value="5" color={C.yellow} />
      <StatCard icon="✅" label="Shortlisted" value="3" color={C.green} />
      <StatCard icon="❌" label="Rejected" value="4" color={C.red} />
    </div>

    {/* Recent Applications */}
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.gray900 }}>Recent Applications</h2>
        <Btn variant="outline" small onClick={() => setPage("applications")}>View All</Btn>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.gray100}` }}>
            {["Job Title", "Company", "Date Applied", "Status"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 700, color: C.gray400, textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {applications.slice(0, 4).map(a => (
            <tr key={a.id} style={{ borderBottom: `1px solid ${C.gray100}` }}>
              <td style={{ padding: "12px 12px", fontWeight: 600, color: C.gray800, fontSize: 14 }}>{a.job}</td>
              <td style={{ padding: "12px 12px", color: C.gray600, fontSize: 14 }}>{a.company}</td>
              <td style={{ padding: "12px 12px", color: C.gray500, fontSize: 13 }}>{a.date}</td>
              <td style={{ padding: "12px 12px" }}><Badge status={a.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>

    {/* Quick links */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 24 }}>
      <Card style={{ cursor: "pointer" }} onClick={() => setPage("jobs")}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
        <h3 style={{ margin: "0 0 6px", color: C.gray900 }}>Browse Jobs</h3>
        <p style={{ margin: 0, color: C.gray500, fontSize: 13 }}>Find new opportunities matching your skills</p>
      </Card>
      <Card style={{ cursor: "pointer" }} onClick={() => setPage("profile")}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>👤</div>
        <h3 style={{ margin: "0 0 6px", color: C.gray900 }}>Complete Profile</h3>
        <p style={{ margin: 0, color: C.gray500, fontSize: 13 }}>Your profile is 72% complete — boost your visibility</p>
      </Card>
    </div>
  </div>
);


// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
const ProfilePage = ({ user }) => {
  const [skills, setSkills] = useState(["React", "TypeScript", "Figma", "Node.js"]);
  const [newSkill, setNewSkill] = useState("");
  const [saved, setSaved] = useState(false);

  const addSkill = () => {
    if (newSkill.trim()) { setSkills(s => [...s, newSkill.trim()]); setNewSkill(""); }
  };

  return (
    <div>
      <PageHeader title="My Profile" sub="Keep your profile updated to improve job matches" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
        {/* Profile Card */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ textAlign: "center" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, color: C.white, margin: "0 auto 14px", fontWeight: 800 }}>
              {user?.name?.[0] || "U"}
            </div>
            <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>{user?.name}</h2>
            <p style={{ margin: "0 0 12px", color: C.gray500, fontSize: 13 }}>{user?.email}</p>
            <div style={{ background: C.blueLight, borderRadius: 8, padding: "8px 12px", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>Profile Completion</span>
                <span style={{ fontSize: 12, color: C.blue, fontWeight: 700 }}>72%</span>
              </div>
              <div style={{ height: 6, background: C.blueMid, borderRadius: 999 }}>
                <div style={{ width: "72%", height: "100%", background: C.blue, borderRadius: 999 }} />
              </div>
            </div>
            <Btn full variant="outline" small>Upload Photo</Btn>
          </Card>

          {/* CV Upload */}
          <Card>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>📄 CV / Resume</h3>
            <div style={{ border: `2px dashed ${C.gray300}`, borderRadius: 8, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: C.gray500 }}>Drag & drop or click to upload</p>
              <Btn small variant="outline">Browse Files</Btn>
            </div>
          </Card>
        </div>

        {/* Main Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Personal Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Input label="Full Name" value={user?.name || ""} onChange={() => {}} />
              <Input label="Email" value={user?.email || ""} onChange={() => {}} />
              <Input label="Phone" value="+27 72 000 0000" onChange={() => {}} />
              <Input label="Location" value="Johannesburg, GP" onChange={() => {}} />
            </div>
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Skills</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
              {skills.map(s => (
                <span key={s} style={{
                  background: C.blueLight, color: C.blue, padding: "5px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  {s}
                  <button onClick={() => setSkills(prev => prev.filter(x => x !== s))} style={{ border: "none", background: "none", cursor: "pointer", color: C.blue, fontWeight: 700, padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={newSkill} onChange={e => setNewSkill(e.target.value)} onKeyDown={e => e.key === "Enter" && addSkill()}
                placeholder="Add a skill..." style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1.5px solid ${C.gray300}`, fontSize: 14 }} />
              <Btn small onClick={addSkill}>Add</Btn>
            </div>
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Education</h3>
            {[{ degree: "BSc Computer Science", school: "University of the Witwatersrand", year: "2019 – 2022" }].map(e => (
              <div key={e.degree} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.gray100}` }}>
                <div>
                  <div style={{ fontWeight: 700, color: C.gray800 }}>{e.degree}</div>
                  <div style={{ fontSize: 13, color: C.gray500 }}>{e.school}</div>
                </div>
                <span style={{ fontSize: 13, color: C.gray400 }}>{e.year}</span>
              </div>
            ))}
            <Btn variant="outline" small style={{ marginTop: 12 }}>+ Add Education</Btn>
          </Card>

          <Card>
            <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Work Experience</h3>
            {[{ role: "Junior Developer", company: "StartupSA", period: "Jan 2023 – Present" }].map(e => (
              <div key={e.role} style={{ padding: "12px 0", borderBottom: `1px solid ${C.gray100}` }}>
                <div style={{ fontWeight: 700, color: C.gray800 }}>{e.role}</div>
                <div style={{ fontSize: 13, color: C.gray500 }}>{e.company} · {e.period}</div>
              </div>
            ))}
            <Btn variant="outline" small style={{ marginTop: 12 }}>+ Add Experience</Btn>
          </Card>

          {saved && <div style={{ background: C.greenLight, color: C.green, padding: "12px 16px", borderRadius: 8, fontWeight: 600 }}>✅ Profile saved successfully!</div>}
          <Btn onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}>Save Profile</Btn>
        </div>
      </div>
    </div>
  );
};





// ─── JOB SEARCH ───────────────────────────────────────────────────────────────
const jobListings = [
  { id: 1, title: "Frontend Developer", company: "TechHub ZA", location: "Cape Town", type: "Full-time", salary: "R30,000 – R45,000/mo", skills: ["React", "TypeScript", "CSS"], posted: "2 days ago", match: 92 },
  { id: 2, title: "UX/UI Designer", company: "CreativeFlow", location: "Johannesburg", type: "Full-time", salary: "R25,000 – R38,000/mo", skills: ["Figma", "Adobe XD", "Prototyping"], posted: "3 days ago", match: 85 },
  { id: 3, title: "Data Analyst", company: "InsightSA", location: "Durban", type: "Contract", salary: "R20,000 – R30,000/mo", skills: ["Python", "SQL", "Power BI"], posted: "5 days ago", match: 74 },
  { id: 4, title: "Product Manager", company: "Innovate Inc", location: "Pretoria", type: "Full-time", salary: "R45,000 – R65,000/mo", skills: ["Agile", "Roadmapping", "Analytics"], posted: "1 week ago", match: 68 },
  { id: 5, title: "Backend Engineer", company: "CloudBase", location: "Remote", type: "Remote", salary: "R35,000 – R55,000/mo", skills: ["Node.js", "AWS", "PostgreSQL"], posted: "1 week ago", match: 80 },
  { id: 6, title: "Marketing Coordinator", company: "BrandSA", location: "Cape Town", type: "Part-time", salary: "R15,000 – R22,000/mo", skills: ["Social Media", "Content", "SEO"], posted: "2 weeks ago", match: 55 },
];

const JobSearchPage = ({ setPage, setApplyJob }) => {
  const [kw, setKw] = useState("");
  const [loc, setLoc] = useState("All Locations");
  const [type, setType] = useState("All Types");

  const filtered = jobListings.filter(j => {
    const kwMatch = !kw || j.title.toLowerCase().includes(kw.toLowerCase()) || j.company.toLowerCase().includes(kw.toLowerCase());
    const locMatch = loc === "All Locations" || j.location === loc;
    const typeMatch = type === "All Types" || j.type === type;
    return kwMatch && locMatch && typeMatch;
  });

  return (
    <div>
      <PageHeader title="Find Jobs" sub={`${filtered.length} opportunities found`} />

      {/* Search filters */}
      <Card style={{ marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "flex-end" }}>
          <Input label="Keywords" value={kw} onChange={setKw} placeholder="Job title, company, skill..." />
          <Input label="Location" value={loc} onChange={setLoc} options={["All Locations", "Cape Town", "Johannesburg", "Durban", "Pretoria", "Remote"]} />
          <Input label="Job Type" value={type} onChange={setType} options={["All Types", "Full-time", "Part-time", "Contract", "Remote"]} />
          <Btn>Search</Btn>
        </div>
      </Card>

      {/* Job Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map(job => (
          <Card key={job.id} style={{ cursor: "pointer", transition: "box-shadow .15s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: C.blueLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>💼</div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.gray900 }}>{job.title}</h3>
                    <span style={{ fontSize: 13, color: C.gray500 }}>{job.company} · {job.location}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  <span style={{ background: C.gray100, color: C.gray600, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500 }}>{job.type}</span>
                  <span style={{ background: C.gray100, color: C.gray600, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 500 }}>📍 {job.location}</span>
                  <span style={{ background: C.greenLight, color: C.green, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{job.salary}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {job.skills.map(s => (
                    <span key={s} style={{ background: C.blueLight, color: C.blue, padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500 }}>{s}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12, marginLeft: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: job.match >= 80 ? C.green : job.match >= 60 ? C.yellow : C.red }}>{job.match}%</div>
                  <div style={{ fontSize: 11, color: C.gray400 }}>match</div>
                </div>
                <span style={{ fontSize: 12, color: C.gray400 }}>{job.posted}</span>
                <Btn small onClick={() => { setApplyJob(job); setPage("apply"); }}>Apply Now</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};



// ─── APPLICATION PAGE ─────────────────────────────────────────────────────────
const ApplicationPage = ({ job, setPage, user }) => {
  const [cover, setCover] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  if (!job) return <div style={{ padding: 40, textAlign: "center" }}>
    <p>No job selected. <button onClick={() => setPage("jobs")} style={{ color: C.blue, fontWeight: 700, border: "none", background: "none", cursor: "pointer" }}>Browse Jobs →</button></p>
  </div>;

  if (submitted) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <Card style={{ textAlign: "center", maxWidth: 400, padding: 48 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <h2 style={{ color: C.green, margin: "0 0 10px" }}>Application Submitted!</h2>
        <p style={{ color: C.gray500, marginBottom: 24 }}>Your application for <strong>{job.title}</strong> at {job.company} has been sent.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Btn variant="outline" onClick={() => setPage("applications")}>Track Applications</Btn>
          <Btn onClick={() => setPage("jobs")}>Find More Jobs</Btn>
        </div>
      </Card>
    </div>
  );

  return (
    <div>
      <PageHeader title="Apply for Job" sub={`${job.title} at ${job.company}`} action={<Btn variant="ghost" onClick={() => setPage("jobs")}>← Back</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Job Details</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: C.blueLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>💼</div>
              <div>
                <div style={{ fontWeight: 700, color: C.gray900 }}>{job.title}</div>
                <div style={{ fontSize: 13, color: C.gray500 }}>{job.company}</div>
              </div>
            </div>
            {[["📍", "Location", job.location], ["⏱", "Type", job.type], ["💰", "Salary", job.salary]].map(([i, l, v]) => (
              <div key={l} style={{ display: "flex", gap: 8, fontSize: 13 }}>
                <span>{i}</span>
                <div><span style={{ color: C.gray400 }}>{l}: </span><span style={{ color: C.gray700, fontWeight: 600 }}>{v}</span></div>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13, color: C.gray400, marginBottom: 6 }}>Required Skills</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {job.skills.map(s => <span key={s} style={{ background: C.blueLight, color: C.blue, padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 500 }}>{s}</span>)}
              </div>
            </div>
            <div style={{ background: job.match >= 80 ? C.greenLight : C.yellowLight, borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: job.match >= 80 ? C.green : C.yellow }}>{job.match}%</div>
              <div style={{ fontSize: 12, color: job.match >= 80 ? C.green : C.yellow }}>Profile Match</div>
            </div>
          </div>
        </Card>

        <Card>
          <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Your Application</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: C.gray50, borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.gray500, marginBottom: 4 }}>Applying as</div>
              <div style={{ fontWeight: 700, color: C.gray900 }}>{user?.name}</div>
              <div style={{ fontSize: 13, color: C.gray500 }}>{user?.email}</div>
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: C.gray700, display: "block", marginBottom: 6 }}>CV / Resume</label>
              <div style={{ border: `2px dashed ${C.gray300}`, borderRadius: 8, padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>📄</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: C.gray700 }}>Thabo_Nkosi_CV.pdf</div>
                  <div style={{ fontSize: 12, color: C.gray400 }}>From your profile · Click to change</div>
                </div>
                <Btn small variant="ghost">Change</Btn>
              </div>
            </div>
            <Input label="Cover Letter" textarea value={cover} onChange={setCover}
              placeholder={`Dear Hiring Manager,\n\nI am excited to apply for the ${job.title} position at ${job.company}...`} />
            {error && <div style={{ background: C.redLight, color: C.red, padding: "10px 14px", borderRadius: 8, fontSize: 13 }}>⚠️ {error}</div>}
            <Btn full onClick={() => {
              if (!cover.trim()) { setError("Please write a cover letter before submitting."); return; }
              setError(""); setSubmitted(true);
            }}>
              Submit Application 🚀
            </Btn>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ─── APPLICATION TRACKING ─────────────────────────────────────────────────────
const ApplicationsPage = () => {
  const [filter, setFilter] = useState("All");
  const statuses = ["All", "Pending", "Shortlisted", "Interview", "Accepted", "Rejected"];
  const filtered = filter === "All" ? applications : applications.filter(a => a.status === filter);

  return (
    <div>
      <PageHeader title="My Applications" sub="Track all your job applications in one place" />
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {statuses.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "7px 16px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: filter === s ? C.blue : C.gray100,
              color: filter === s ? C.white : C.gray600,
            }}>{s}</button>
          ))}
        </div>
      </Card>
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.gray100}` }}>
              {["Job Title", "Company", "Location", "Date Applied", "Status", "Action"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 12, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                <td style={{ padding: "14px 14px", fontWeight: 600, color: C.gray800 }}>{a.job}</td>
                <td style={{ padding: "14px 14px", color: C.gray600 }}>{a.company}</td>
                <td style={{ padding: "14px 14px", color: C.gray500, fontSize: 13 }}>📍 {a.location}</td>
                <td style={{ padding: "14px 14px", color: C.gray400, fontSize: 13 }}>{a.date}</td>
                <td style={{ padding: "14px 14px" }}><Badge status={a.status} /></td>
                <td style={{ padding: "14px 14px" }}>
                  <Btn small variant="ghost">View</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: C.gray400 }}>No applications found for this filter.</div>
        )}
      </Card>
    </div>
  );
};


// ─── NOTIFICATIONS ─────────────────────────────────────────────────────────────
const notifData = [
  { id: 1, icon: "🎉", title: "Application Accepted!", body: "Congratulations! Innovate Inc has accepted your application for Product Manager.", time: "2 hours ago", read: false, type: "success" },
  { id: 2, icon: "📋", title: "Shortlisted by TechHub ZA", body: "You have been shortlisted for the Frontend Developer position. Interview details to follow.", time: "1 day ago", read: false, type: "info" },
  { id: 3, icon: "🔔", title: "New Job Match Found", body: "A new role matching your profile: Senior React Developer at PixelSA — 94% match!", time: "2 days ago", read: true, type: "info" },
  { id: 4, icon: "❌", title: "Application Update", body: "Your application for UX Designer at DesignCo was not successful this time.", time: "3 days ago", read: true, type: "warning" },
  { id: 5, icon: "🔍", title: "Profile Viewed", body: "Your profile was viewed by HR at CloudBase Technologies.", time: "4 days ago", read: true, type: "info" },
];

const NotificationsPage = () => {
  const [notifs, setNotifs] = useState(notifData);
  const markAll = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  const colors = { success: C.greenLight, info: C.blueLight, warning: C.yellowLight };

  return (
    <div>
      <PageHeader
        title="Notifications"
        sub={`${notifs.filter(n => !n.read).length} unread notifications`}
        action={<Btn variant="outline" small onClick={markAll}>Mark All Read</Btn>}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {notifs.map(n => (
          <Card key={n.id} style={{
            borderLeft: `4px solid ${n.read ? C.gray200 : C.blue}`,
            background: n.read ? C.white : C.blueLight,
            opacity: n.read ? 0.85 : 1,
          }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: colors[n.type], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                {n.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 700, color: C.gray900, fontSize: 14 }}>{n.title}</span>
                  <span style={{ fontSize: 12, color: C.gray400 }}>{n.time}</span>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: C.gray600, lineHeight: 1.5 }}>{n.body}</p>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, flexShrink: 0, marginTop: 6 }} />}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ─── EMPLOYER DASHBOARD ───────────────────────────────────────────────────────
const activeJobs = [
  { id: 1, title: "Senior React Developer", applicants: 24, shortlisted: 6, posted: "2025-05-01", deadline: "2025-06-01", status: "Active" },
  { id: 2, title: "DevOps Engineer", applicants: 18, shortlisted: 3, posted: "2025-05-05", deadline: "2025-06-05", status: "Active" },
  { id: 3, title: "Product Designer", applicants: 41, shortlisted: 9, posted: "2025-04-20", deadline: "2025-05-31", status: "Closing Soon" },
];

const EmployerDashboard = ({ user, setPage }) => (
  <div>
    <PageHeader title={`Welcome, ${user?.name?.split(" ")[0] || "there"} 🏢`} sub="Manage your job postings and applicants"
      action={<Btn onClick={() => setPage("post-job")}>+ Post New Job</Btn>} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
      <StatCard icon="💼" label="Active Jobs" value="3" />
      <StatCard icon="👥" label="Total Applicants" value="83" sub="↑ 12 this week" color={C.purple} />
      <StatCard icon="✅" label="Shortlisted" value="18" color={C.green} />
      <StatCard icon="🤝" label="Interviews Set" value="5" color={C.orange} />
    </div>

    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Active Job Listings</h2>
        <Btn variant="outline" small onClick={() => setPage("applicants")}>View All Applicants</Btn>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: `2px solid ${C.gray100}` }}>
            {["Job Title", "Applicants", "Shortlisted", "Posted", "Deadline", "Status"].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 12, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeJobs.map(j => (
            <tr key={j.id} style={{ borderBottom: `1px solid ${C.gray100}` }}>
              <td style={{ padding: "14px 14px", fontWeight: 600, color: C.gray800 }}>{j.title}</td>
              <td style={{ padding: "14px 14px" }}><span style={{ fontWeight: 700, color: C.blue }}>{j.applicants}</span></td>
              <td style={{ padding: "14px 14px" }}><span style={{ fontWeight: 700, color: C.green }}>{j.shortlisted}</span></td>
              <td style={{ padding: "14px 14px", fontSize: 13, color: C.gray500 }}>{j.posted}</td>
              <td style={{ padding: "14px 14px", fontSize: 13, color: C.gray500 }}>{j.deadline}</td>
              <td style={{ padding: "14px 14px" }}>
                <span style={{ background: j.status === "Active" ? C.greenLight : C.yellowLight, color: j.status === "Active" ? C.green : C.yellow, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{j.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </div>
);

// ─── POST JOB ─────────────────────────────────────────────────────────────────
const PostJobPage = ({ setPage }) => {
  const [form, setForm] = useState({ title: "", company: "", location: "", type: "Full-time", salary: "", description: "", requirements: "", skills: "" });
  const [done, setDone] = useState(false);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));

  if (done) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <Card style={{ textAlign: "center", maxWidth: 400, padding: 48 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: C.green, margin: "0 0 10px" }}>Job Posted Successfully!</h2>
        <p style={{ color: C.gray500, marginBottom: 24 }}>Your job listing is now live on CareerTrack.</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Btn variant="outline" onClick={() => { setDone(false); setForm({ title: "", company: "", location: "", type: "Full-time", salary: "", description: "", requirements: "", skills: "" }); }}>Post Another</Btn>
          <Btn onClick={() => setPage("applicants")}>View Applicants</Btn>
        </div>
      </Card>
    </div>
  );

  return (
    <div>
      <PageHeader title="Post a Job" sub="Fill in the details to attract the right candidates" />
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card>
            <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Job Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <Input label="Job Title" value={form.title} onChange={set("title")} placeholder="e.g. Senior React Developer" />
                <Input label="Company Name" value={form.company} onChange={set("company")} placeholder="Your company name" />
                <Input label="Location" value={form.location} onChange={set("location")} placeholder="e.g. Cape Town, Remote" />
                <Input label="Job Type" value={form.type} onChange={set("type")} options={["Full-time", "Part-time", "Contract", "Remote", "Internship"]} />
              </div>
              <Input label="Salary Range" value={form.salary} onChange={set("salary")} placeholder="e.g. R30,000 – R50,000/month" />
              <Input label="Job Description" textarea value={form.description} onChange={set("description")} placeholder="Describe the role, responsibilities, and what the day-to-day looks like..." />
              <Input label="Requirements" textarea value={form.requirements} onChange={set("requirements")} placeholder="List minimum qualifications and experience required..." />
              <Input label="Required Skills (comma-separated)" value={form.skills} onChange={set("skills")} placeholder="React, Node.js, SQL, Agile..." />
            </div>
          </Card>
          <Btn full onClick={() => { if (form.title && form.company) setDone(true); }}>🚀 Publish Job Listing</Btn>
        </div>

        <Card style={{ height: "fit-content" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Posting Tips</h3>
          {[
            ["🎯", "Be Specific", "Clear job titles attract 40% more qualified applicants"],
            ["💰", "Include Salary", "Listings with salary ranges get 3× more applications"],
            ["📋", "List Skills", "Specific skill requirements help our matching algorithm"],
            ["🕒", "Set Deadline", "Jobs with deadlines create urgency and more applications"],
          ].map(([i, t, d]) => (
            <div key={t} style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 18 }}>{i}</span>
              <div>
                <div style={{ fontWeight: 700, color: C.gray800, fontSize: 13 }}>{t}</div>
                <div style={{ color: C.gray500, fontSize: 12, marginTop: 2 }}>{d}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

// ─── VIEW APPLICANTS ──────────────────────────────────────────────────────────
const applicantData = [
  { id: 1, name: "Thabo Nkosi", role: "Senior React Developer", match: 94, skills: ["React", "TypeScript", "Node.js"], status: "Pending", applied: "2025-05-12" },
  { id: 2, name: "Ayanda Dlamini", role: "Senior React Developer", match: 87, skills: ["React", "Redux", "CSS"], status: "Shortlisted", applied: "2025-05-11" },
  { id: 3, name: "Sipho Mokoena", role: "Senior React Developer", match: 76, skills: ["React", "GraphQL"], status: "Rejected", applied: "2025-05-10" },
  { id: 4, name: "Nomsa Khumalo", role: "Senior React Developer", match: 91, skills: ["React", "TypeScript", "Testing"], status: "Interview", applied: "2025-05-09" },
  { id: 5, name: "Lebo Sithole", role: "DevOps Engineer", match: 83, skills: ["AWS", "Docker", "Kubernetes"], status: "Pending", applied: "2025-05-08" },
];

const ApplicantsPage = () => {
  const [applicants, setApplicants] = useState(applicantData);
  const updateStatus = (id, status) => setApplicants(prev => prev.map(a => a.id === id ? { ...a, status } : a));

  return (
    <div>
      <PageHeader title="View Applicants" sub={`${applicants.length} candidates across all positions`} />
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.gray100}` }}>
              {["Candidate", "Position", "Skills Match", "Skills", "Applied", "Status", "Actions"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 12, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {applicants.map(a => (
              <tr key={a.id} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                <td style={{ padding: "14px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.blue, color: C.white, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>
                      {a.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: C.gray800, fontSize: 14 }}>{a.name}</div>
                      <button style={{ fontSize: 12, color: C.blue, fontWeight: 600, border: "none", background: "none", cursor: "pointer", padding: 0 }}>📥 Download CV</button>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 14px", fontSize: 13, color: C.gray600 }}>{a.role}</td>
                <td style={{ padding: "14px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: C.gray200, borderRadius: 999 }}>
                      <div style={{ width: `${a.match}%`, height: "100%", background: a.match >= 85 ? C.green : a.match >= 70 ? C.yellow : C.red, borderRadius: 999 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: a.match >= 85 ? C.green : a.match >= 70 ? C.yellow : C.red, minWidth: 34 }}>{a.match}%</span>
                  </div>
                </td>
                <td style={{ padding: "14px 14px" }}>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {a.skills.map(s => <span key={s} style={{ background: C.blueLight, color: C.blue, padding: "2px 6px", borderRadius: 4, fontSize: 11, fontWeight: 500 }}>{s}</span>)}
                  </div>
                </td>
                <td style={{ padding: "14px 14px", fontSize: 13, color: C.gray400 }}>{a.applied}</td>
                <td style={{ padding: "14px 14px" }}><Badge status={a.status} /></td>
                <td style={{ padding: "14px 14px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant="success" onClick={() => updateStatus(a.id, "Shortlisted")}>Shortlist</Btn>
                    <Btn small variant="outline" onClick={() => updateStatus(a.id, "Interview")}>Interview</Btn>
                    <Btn small variant="danger" onClick={() => updateStatus(a.id, "Rejected")}>Reject</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
const AdminDashboard = ({ user }) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May"];
  const regData = [120, 145, 190, 210, 250];
  const maxVal = Math.max(...regData);

  return (
    <div>
      <PageHeader title="Admin Dashboard" sub="Platform-wide statistics and system health" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard icon="👥" label="Total Users" value="45,820" sub="↑ 8% this month" />
        <StatCard icon="💼" label="Jobs Posted" value="12,340" sub="↑ 142 today" color={C.purple} />
        <StatCard icon="🤝" label="Placements" value="3,280" sub="↑ 24 this week" color={C.green} />
        <StatCard icon="⚡" label="Active Sessions" value="1,247" color={C.orange} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Chart */}
        <Card>
          <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>User Registrations (2025)</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20, height: 160 }}>
            {months.map((m, i) => (
              <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.gray600 }}>{regData[i]}</span>
                <div style={{ width: "100%", background: i === months.length - 1 ? C.blue : C.blueMid, borderRadius: "4px 4px 0 0", height: `${(regData[i] / maxVal) * 120}px` }} />
                <span style={{ fontSize: 12, color: C.gray400 }}>{m}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* System Metrics */}
        <Card>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>System Metrics</h3>
          {[
            { label: "Server Uptime", value: "99.98%", color: C.green },
            { label: "API Response", value: "142ms avg", color: C.blue },
            { label: "Match Success Rate", value: "78%", color: C.purple },
            { label: "Email Delivery", value: "98.5%", color: C.green },
          ].map(m => (
            <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.gray100}` }}>
              <span style={{ fontSize: 13, color: C.gray600 }}>{m.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: m.color }}>{m.value}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Recent Platform Activity</h3>
        {[
          { icon: "👤", text: "New user registered: Sipho Dlamini (Job Seeker)", time: "2 min ago" },
          { icon: "💼", text: "New job posted: Senior Backend Engineer at CloudBase", time: "8 min ago" },
          { icon: "🤝", text: "Successful placement: Thabo Nkosi → TechHub ZA", time: "1 hour ago" },
          { icon: "⚠️", text: "Flagged listing reviewed and approved: Marketing Intern", time: "2 hours ago" },
          { icon: "📊", text: "Monthly report generated and sent to admins", time: "5 hours ago" },
        ].map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < 4 ? `1px solid ${C.gray100}` : "none" }}>
            <span style={{ fontSize: 18 }}>{a.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: C.gray700 }}>{a.text}</div>
              <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>{a.time}</div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
};

// ─── ADMIN USERS/JOBS STUBS ───────────────────────────────────────────────────
const AdminUsersPage = () => {
  const users = [
    { name: "Thabo Nkosi", email: "thabo@email.com", role: "Job Seeker", joined: "2025-04-12", status: "Active" },
    { name: "Ayanda Dlamini", email: "ayanda@corp.co.za", role: "Employer", joined: "2025-04-10", status: "Active" },
    { name: "Sipho Mokoena", email: "sipho@email.com", role: "Job Seeker", joined: "2025-04-08", status: "Suspended" },
    { name: "Nomsa Khumalo", email: "nomsa@co.za", role: "Employer", joined: "2025-03-28", status: "Active" },
  ];
  return (
    <div>
      <PageHeader title="User Management" sub="All registered platform users" />
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.gray100}` }}>
              {["Name", "Email", "Role", "Joined", "Status", "Actions"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 14px", fontSize: 12, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.email} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                <td style={{ padding: "14px", fontWeight: 700, color: C.gray800 }}>{u.name}</td>
                <td style={{ padding: "14px", color: C.gray500, fontSize: 13 }}>{u.email}</td>
                <td style={{ padding: "14px" }}><span style={{ background: u.role === "Employer" ? C.purpleLight : C.blueLight, color: u.role === "Employer" ? C.purple : C.blue, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{u.role}</span></td>
                <td style={{ padding: "14px", color: C.gray400, fontSize: 13 }}>{u.joined}</td>
                <td style={{ padding: "14px" }}><span style={{ background: u.status === "Active" ? C.greenLight : C.redLight, color: u.status === "Active" ? C.green : C.red, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>{u.status}</span></td>
                <td style={{ padding: "14px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn small variant="ghost">Edit</Btn>
                    <Btn small variant="danger">Suspend</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("landing");
  const [role, setRole] = useState("seeker");
  const [user, setUser] = useState(null);
  const [applyJob, setApplyJob] = useState(null);

  const authPages = ["landing", "login", "register"];
  const isAuth = authPages.includes(page);

  if (isAuth) {
    if (page === "landing") return <LandingPage setPage={setPage} />;
    if (page === "login") return <LoginPage setPage={setPage} setUser={setUser} setRole={setRole} />;
    if (page === "register") return <RegisterPage setPage={setPage} setUser={setUser} setRole={setRole} />;
  }

  const content = (() => {
    switch (page) {
      case "dashboard": return <SeekerDashboard user={user} setPage={setPage} />;
      case "profile": return <ProfilePage user={user} />;
      case "jobs": return <JobSearchPage setPage={setPage} setApplyJob={setApplyJob} />;
      case "apply": return <ApplicationPage job={applyJob} setPage={setPage} user={user} />;
      case "applications": return <ApplicationsPage />;
      case "notifications": return <NotificationsPage />;
      case "emp-dashboard": return <EmployerDashboard user={user} setPage={setPage} />;
      case "post-job": return <PostJobPage setPage={setPage} />;
      case "applicants": return <ApplicantsPage />;
      case "admin-dashboard": return <AdminDashboard user={user} />;
      case "admin-users": return <AdminUsersPage />;
      case "admin-jobs": return <div style={{ padding: 20 }}><PageHeader title="Job Listings" sub="All jobs on the platform" /></div>;
      default: return <SeekerDashboard user={user} setPage={setPage} />;
    }
  })();

  return (
    <Layout role={role} page={page} setPage={setPage} user={user}>
      {content}
    </Layout>
  );
}
