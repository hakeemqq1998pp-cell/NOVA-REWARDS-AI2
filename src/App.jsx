import { useEffect, useMemo, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowUpRight, BadgeCheck, Bell, Check,
  ChevronLeft, CircleHelp, Coins, Gift, Globe2, LayoutDashboard, LogOut,
  Menu, Plus, Settings, ShieldCheck, Sparkles, Target, TrendingUp, Users,
  Wallet, X, Zap
} from "lucide-react";
import { backendReady, supabase } from "./lib/supabase";

const copy = {
  ar: {
    brand:"NOVA REWARDS", tagline:"كل إنجاز يقربك من مكافأتك",
    overview:"نظرة عامة", tasks:"المهام", wallet:"المحفظة", referrals:"الإحالات",
    history:"النشاط", settings:"الإعدادات", welcome:"مرحباً بعودتك 👋",
    subtitle:"تابع نقاطك واكتشف فرصاً جديدة لكسب المكافآت.",
    points:"رصيد النقاط", earned:"إجمالي المكتسب", completed:"مهام مكتملة", invites:"دعوات ناجحة",
    discover:"مهام مقترحة", seeAll:"عرض الكل", available:"متاحة الآن",
    start:"ابدأ المهمة", review:"قيد المراجعة", approved:"مكتملة", rejected:"مرفوضة", daily:"مكافأة يومية", dailyText:"عد يومياً واكتشف فرصاً جديدة.",
    claim:"استلام", claimed:"تم الاستلام", recent:"آخر النشاطات", all:"عرض السجل", referralTitle:"ادعُ أصدقاءك واكسب نقاطاً",
    referralText:"شارك رابطك. ستظهر المكافأة بعد التحقق من الإحالة وفق شروط البرنامج.", referralLogin:"سجّل الدخول أولاً للحصول على رابط إحالة حقيقي.", referralUnavailable:"تعذر تحميل رمز الإحالة من الحساب.",
    copy:"نسخ الرابط", copied:"تم النسخ", pointsUnit:"نقطة", demo:"وضع تجريبي",
    demoNotice:"هذه نسخة أولية. النقاط المعروضة تجريبية ولا تمثل أموالاً أو رصيداً قابلاً للسحب.",
    backend:"حالة الربط", connected:"Supabase متصل بالإعدادات", notConnected:"لم تتم إضافة مفاتيح Supabase بعد",
    walletTitle:"محفظتك", walletText:"راجع رصيد النقاط وسجل الحركات وطلبات الاستبدال.",
    redeem:"طلب استبدال", noCash:"الاستبدال والسحب غير مفعلين حتى ربط مزود دفع والتحقق من الشروط.",
    task1:"أكمل ملفك الشخصي", task1d:"أضف معلوماتك الأساسية لتهيئة حسابك.",
    task2:"استكشف ميزة NOVA AI", task2d:"جرّب مساحة الأدوات الذكية داخل المنصة.",
    task3:"ادعُ صديقاً", task3d:"شارك رابط الدعوة مع شخص تعرفه.",
    profile:"الملف الشخصي", language:"اللغة", admin:"الإدارة", login:"دخول تجريبي",
    logout:"تسجيل الخروج", signIn:"تسجيل الدخول", email:"البريد الإلكتروني",
    password:"كلمة المرور", create:"إنشاء حساب", signInHint:"استخدم بريدك للبدء. يتطلب الحساب الحقيقي إعداد Supabase.",
    authError:"تعذر إكمال العملية. تحقق من إعدادات Supabase والبريد.",
    loginSuccess:"تم إرسال رابط التحقق إلى بريدك إذا كان إعداد المصادقة مفعلاً.",
    close:"إغلاق", pointsLabel:"النقاط", progress:"تقدمك", secure:"مكافآت بشفافية وأمان", noActivity:"لا توجد حركات بعد.",
    adminNote:"لوحة الإدارة تتطلب حساباً بصلاحية admin في قاعدة البيانات.", approve:"موافقة", reject:"رفض", noPending:"لا توجد طلبات معلقة.", reviewTitle:"طلبات مراجعة المهام"
  },
  en: {
    brand:"NOVA REWARDS", tagline:"Every action brings you closer",
    overview:"Overview", tasks:"Tasks", wallet:"Wallet", referrals:"Referrals",
    history:"Activity", settings:"Settings", welcome:"Welcome back 👋",
    subtitle:"Track your points and discover new ways to earn rewards.",
    points:"Points balance", earned:"Total earned", completed:"Tasks completed", invites:"Successful invites",
    discover:"Suggested tasks", seeAll:"See all", available:"Available now",
    start:"Start task", review:"Under review", approved:"Approved", rejected:"Rejected", daily:"Daily reward", dailyText:"Come back daily to discover new opportunities.",
    claim:"Claim", claimed:"Claimed", recent:"Recent activity", all:"View history", referralTitle:"Invite friends and earn points",
    referralText:"Share your link. Referral rewards are granted after eligibility checks.", referralLogin:"Sign in first to get your personal referral link.", referralUnavailable:"Could not load the referral code for this account.",
    copy:"Copy link", copied:"Copied", pointsUnit:"pts", demo:"Demo mode",
    demoNotice:"This is an early preview. Displayed points are demo values, not money or withdrawable balance.",
    backend:"Connection", connected:"Supabase configured", notConnected:"Supabase keys have not been added",
    walletTitle:"Your wallet", walletText:"Review points, transactions and redemption requests.",
    redeem:"Request redemption", noCash:"Redemption and withdrawals are disabled until a payment provider and rules are configured.",
    task1:"Complete your profile", task1d:"Add basic information to set up your account.",
    task2:"Explore NOVA AI", task2d:"Try the smart tools area inside the platform.",
    task3:"Invite a friend", task3d:"Share your invitation link with someone you know.",
    profile:"Profile", language:"Language", admin:"Admin", login:"Demo sign in",
    logout:"Sign out", signIn:"Sign in", email:"Email address",
    password:"Password", create:"Create account", signInHint:"Use your email to get started. Real accounts require Supabase setup.",
    authError:"Could not complete the request. Check Supabase and email settings.",
    loginSuccess:"A verification link was sent if authentication is enabled.",
    close:"Close", pointsLabel:"Points", progress:"Your progress", secure:"Transparent, safer rewards", noActivity:"No activity yet.",
    adminNote:"Admin access requires an admin role in the database.", approve:"Approve", reject:"Reject", noPending:"No pending requests.", reviewTitle:"Task review queue"
  }
};

const tasks = [
  { id:1, icon:BadgeCheck, color:"violet", points:120, titleKey:"task1", descKey:"task1d", tag:"Profile" },
  { id:2, icon:Sparkles, color:"blue", points:80, titleKey:"task2", descKey:"task2d", tag:"NOVA AI" },
  { id:3, icon:Users, color:"orange", points:150, titleKey:"task3", descKey:"task3d", tag:"Invite" }
];

function baghdadDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone:"Asia/Baghdad", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(date);
  const part = type => parts.find(item => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default function App() {
  const [lang,setLang] = useState("ar");
  const [tab,setTab] = useState("overview");
  const [modal,setModal] = useState("");
  const [user,setUser] = useState(null);
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [authBusy,setAuthBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [done,setDone] = useState([]);
  const [ledgerPoints,setLedgerPoints] = useState(null);
  const [ledgerEntries,setLedgerEntries] = useState([]);
  const [activeTasks,setActiveTasks] = useState(null);
  const [requestedTaskStatuses,setRequestedTaskStatuses] = useState({});
  const [qualifiedReferrals,setQualifiedReferrals] = useState(0);
  const [isAdmin,setIsAdmin] = useState(false);
  const [pendingReviews,setPendingReviews] = useState([]);
  const [reviewBusy,setReviewBusy] = useState("");
  const [dailyBusy,setDailyBusy] = useState(false);
  const [daily,setDaily] = useState(false);
  const [mobileOpen,setMobileOpen] = useState(false);
  const [copied,setCopied] = useState(false);
  const t = copy[lang];
  const isAr = lang === "ar";

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => setUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event,session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const nav = [
    ["overview",LayoutDashboard,t.overview],
    ["tasks",Target,t.tasks],
    ["wallet",Wallet,t.wallet],
    ["referrals",Users,t.referrals],
    ["history",Activity,t.history]
  ];

  const demoPoints = useMemo(() => done.reduce((sum,id) => sum + (tasks.find(x=>x.id===id)?.points || 0),0) + (daily ? 25 : 0),[done,daily]);
  const points = ledgerPoints ?? demoPoints;

  useEffect(() => {
    if (!supabase || !user) { setLedgerPoints(null); setLedgerEntries([]); setActiveTasks(null); setRequestedTaskStatuses({}); setQualifiedReferrals(0); setIsAdmin(false); setPendingReviews([]); setDaily(false); return; }
    let alive = true;
    (async () => {
      const [{data: ledger, error: ledgerError}, {data: claims, error: claimError}, {data: taskRows, error: taskError}, {data: completionRows, error: completionError}, {data: referralRows, error: referralError}, {data: profile, error: profileError}] = await Promise.all([
        supabase.from("point_ledger").select("amount,reason,created_at").order("created_at", {ascending:false}).limit(20),
        supabase.from("daily_claims").select("id").eq("claim_date", baghdadDateKey()).limit(1),
        supabase.from("tasks").select("id,title,description,points,task_type").eq("is_active", true).order("created_at", {ascending:true}),
        supabase.from("task_completions").select("task_id,status"),
        supabase.from("referrals").select("id,status").eq("inviter_id", user.id)
      ]);
      if (!alive) return;
      setLedgerPoints(ledgerError ? 0 : (ledger || []).reduce((sum,row)=>sum + Number(row.amount || 0),0));
      setLedgerEntries(ledgerError ? [] : (ledger || []));
      if (!claimError) setDaily(Boolean(claims?.length));
      setActiveTasks(taskError ? [] : (taskRows || []).map(row => ({...row, icon: Target, color:"violet", title:row.title, description:row.description || ""})));
      if (!completionError) setRequestedTaskStatuses(Object.fromEntries((completionRows || []).map(row => [row.task_id, row.status]))); 
      setQualifiedReferrals(referralError ? 0 : (referralRows || []).filter(row => row.status === "qualified").length);
      const admin = !profileError && profile?.role === "admin";
      setIsAdmin(admin);
      if (admin) {
        const {data: reviews, error: reviewError} = await supabase.from("task_completions")
          .select("id,user_id,task_id,created_at,tasks(title,points)")
          .eq("status", "pending").order("created_at", {ascending:true});
        if (alive) setPendingReviews(reviewError ? [] : (reviews || []));
      } else {
        setPendingReviews([]);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  async function authenticate(e) {
    e.preventDefault();
    if (!supabase) { setMessage(t.notConnected); return; }
    setAuthBusy(true); setMessage("");
    try {
      const referralCode = new URLSearchParams(window.location.search).get("ref")?.trim().slice(0,32);
      const authOptions = { emailRedirectTo: window.location.origin };
      if (referralCode) authOptions.data = { referral_code: referralCode };
      const { error } = await supabase.auth.signInWithOtp({ email, options:authOptions });
      if (error) throw error;
      setMessage(t.loginSuccess);
    } catch (err) { setMessage(err.message || t.authError); }
    finally { setAuthBusy(false); }
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  }

  const visibleTasks = user ? (activeTasks ?? []) : tasks;
  const taskStatus = id => user ? (requestedTaskStatuses[id] || "") : (done.includes(id) ? "approved" : "");

  async function reviewTask(completionId, decision) {
    if (!isAdmin || reviewBusy) return;
    setReviewBusy(completionId);
    const {error} = await supabase.rpc("admin_review_task_completion", {p_completion_id:completionId, p_decision:decision});
    setReviewBusy("");
    if (error) { setMessage(error.message || t.authError); return; }
    setPendingReviews(old => old.filter(item => item.id !== completionId));
    setMessage(isAr ? "تم حفظ قرار المراجعة وتحديث سجل النقاط عند الموافقة." : "Review saved; points were ledgered only if approved.");
  }

  async function claimDaily() {
    if (dailyBusy || daily) return;
    if (supabase && user) {
      setDailyBusy(true);
      const {data,error} = await supabase.rpc("claim_daily_reward");
      setDailyBusy(false);
      if (error) { setMessage(error.message || t.authError); return; }
      const awarded = Number(data?.[0]?.points_awarded || 25);
      setLedgerPoints(old => (old ?? 0) + awarded);
      setDaily(true);
      setMessage(isAr ? "تمت إضافة المكافأة إلى سجل النقاط." : "Daily reward added to your points ledger.");
      return;
    }
    setDaily(true);
    setMessage(t.demoNotice);
  }

  async function copyReferral() {
    if (!supabase || !user) { setMessage(t.referralLogin); return; }
    const {data,error} = await supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle();
    if (error || !data?.referral_code) { setMessage(t.referralUnavailable); return; }
    const link = window.location.origin + "/?ref=" + encodeURIComponent(data.referral_code);
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(()=>setCopied(false),1800); }
    catch { setMessage(link); }
  }

  async function completeTask(id) {
    if (user && supabase) {
      if (requestedTaskStatuses[id]) return;
      const {error} = await supabase.rpc("request_task_completion", {p_task_id:id});
      if (error) { setMessage(error.message || t.authError); return; }
      setRequestedTaskStatuses(old => ({...old, [id]:"pending"}));
      setMessage(isAr ? "تم إرسال المهمة للمراجعة. لم تُضف نقاط بعد." : "Task submitted for review. No points have been awarded yet.");
      return;
    }
    if (!done.includes(id)) setDone(old=>[...old,id]);
    setMessage(t.demoNotice);
  }

  const sidebar = (
    <aside className={"sidebar " + (mobileOpen ? "open" : "")}>
      <div className="brand"><div className="brand-mark"><Zap size={22}/></div><div><strong>NOVA<span> REWARDS</span></strong><small>{t.tagline}</small></div><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)}><X/></button></div>
      <div className="nav-label">{isAr ? "القائمة الرئيسية" : "MAIN MENU"}</div>
      <nav>{nav.map(([id,Icon,label])=><button key={id} className={"nav-item "+(tab===id?"active":"")} onClick={()=>{setTab(id);setMobileOpen(false)}}><Icon size={18}/><span>{label}</span>{tab===id&&<ChevronLeft size={16}/>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="secure-card"><ShieldCheck size={19}/><div><b>{t.secure}</b><small>{t.demo}</small></div></div><button className="nav-item" onClick={()=>setModal("settings")}><Settings size={18}/><span>{t.settings}</span></button><button className="nav-item" onClick={()=>setModal("admin")}><ShieldCheck size={18}/><span>{t.admin}</span></button></div>
      <div className="user-mini"><div className="avatar">{user?.email?.[0]?.toUpperCase() || "N"}</div><div className="user-info"><b>{user?.email || "NOVA Member"}</b><small>{user ? "Member" : t.demo}</small></div><button className="icon-btn" title={t.logout} onClick={signOut}><LogOut size={17}/></button></div>
    </aside>
  );

  return <div className={"app "+(isAr?"rtl":"ltr")} dir={isAr?"rtl":"ltr"}>
    {sidebar}
    {mobileOpen && <button className="scrim" onClick={()=>setMobileOpen(false)} aria-label="Close menu"/>}
    <main className="main">
      <header className="topbar">
        <div className="top-left"><button className="icon-btn menu-btn" onClick={()=>setMobileOpen(true)}><Menu/></button><div className="breadcrumb">{t.overview}<span>/</span><b>{nav.find(x=>x[0]===tab)?.[2] || t.overview}</b></div></div>
        <div className="top-actions"><span className={"connection "+(backendReady?"online":"offline")}><i/>{backendReady?t.connected:t.demo}</span><button className="icon-btn" onClick={()=>setLang(lang==="ar"?"en":"ar")} title={t.language}><Globe2 size={18}/><small>{lang.toUpperCase()}</small></button><button className="icon-btn notification" onClick={()=>setMessage(t.demoNotice)}><Bell size={18}/><i/></button><button className="top-avatar" onClick={()=>setModal("auth")}>{user?.email?.[0]?.toUpperCase()||"N"}</button></div>
      </header>

      <div className="content">
        <div className="welcome-row"><div><div className="eyebrow"><Sparkles size={14}/>{t.brand}</div><h1>{tab==="overview"?t.welcome:nav.find(x=>x[0]===tab)?.[2]}</h1><p>{tab==="overview"?t.subtitle:tab==="wallet"?t.walletText:tab==="referrals"?t.referralText:t.subtitle}</p></div><button className="primary-btn" onClick={()=>setModal("auth")}><Plus size={17}/>{user?(user.email?.split("@")[0]||t.profile):t.login}</button></div>

        <div className="notice"><div className="notice-icon"><CircleHelp size={18}/></div><p>{t.demoNotice}</p><span>{t.demo}</span></div>

        {tab==="overview" && <>
          <section className="stats-grid">
            <Stat icon={Coins} label={t.points} value={points.toLocaleString()} suffix={t.pointsUnit} tone="purple" trend={t.progress}/>
            <Stat icon={TrendingUp} label={t.earned} value={points.toLocaleString()} suffix={t.pointsUnit} tone="blue" trend={t.demo}/>
            <Stat icon={Target} label={t.completed} value={user ? Object.values(requestedTaskStatuses).filter(status=>status==="approved").length : done.length} suffix="" tone="orange" trend={t.progress}/>
            <Stat icon={Users} label={t.invites} value={user ? qualifiedReferrals : 0} suffix="" tone="green" trend={t.demo}/>
          </section>
          <section className="feature-grid">
            <div className="panel tasks-panel"><div className="section-head"><div><h2>{t.discover}</h2><p>{t.available}</p></div><button className="text-btn" onClick={()=>setTab("tasks")}>{t.seeAll}<ArrowUpRight size={15}/></button></div>
              <div className="task-list">{visibleTasks.map(task=><TaskRow key={task.id} task={task} t={t} completed={Boolean(taskStatus(task.id))} status={taskStatus(task.id)} onStart={()=>completeTask(task.id)}/>)}</div>
            </div>
            <div className="side-stack"><div className="daily-card"><div className="daily-top"><div className="daily-icon"><Gift size={22}/></div><span>{t.demo}</span></div><h3>{t.daily}</h3><p>{t.dailyText}</p><div className="daily-reward">+25 <small>{t.pointsUnit}</small></div><button className="daily-btn" disabled={daily || dailyBusy} onClick={claimDaily}>{daily?<><Check size={16}/>{t.claimed}:<>{t.claim}<ArrowUpRight size={16}/></>}</button></div>
              <div className="ref-card"><div className="ref-icon"><Users size={20}/></div><h3>{t.referralTitle}</h3><p>{t.referralText}</p><button className="secondary-btn" onClick={copyReferral}>{copied?<Check size={16}/>:<ArrowUpRight size={16}/>} {copied?t.copied:t.copy}</button></div></div>
          </section>
          <section className="panel activity-panel"><div className="section-head"><div><h2>{t.recent}</h2><p>{t.demo}</p></div><button className="text-btn" onClick={()=>setTab("history")}>{t.all}<ArrowUpRight size={15}/></button></div><ActivityList done={done} daily={daily} t={t} user={Boolean(user)} ledgerEntries={ledgerEntries}/></section>
        </>}

        {tab==="tasks" && <section className="panel page-panel"><div className="section-head"><div><h2>{t.discover}</h2><p>{t.available}</p></div><span className="soft-pill">{visibleTasks.length} {isAr?"مهام":"tasks"}</span></div>{visibleTasks.map(task=><TaskRow key={task.id} task={task} t={t} completed={Boolean(taskStatus(task.id))} status={taskStatus(task.id)} onStart={()=>completeTask(task.id)}/>)}</section>}
        {tab==="wallet" && <section className="panel wallet-page"><div className="wallet-hero"><div><span>{t.points}</span><h2>{points.toLocaleString()} <small>{t.pointsUnit}</small></h2><p>{t.noCash}</p></div><div className="wallet-graphic"><Wallet size={52}/></div></div><div className="section-head"><div><h2>{t.walletTitle}</h2><p>{t.walletText}</p></div></div><ActivityList done={done} daily={daily} t={t} user={Boolean(user)} ledgerEntries={ledgerEntries}/><button className="primary-btn disabled-btn" disabled><ArrowDownToLine size={17}/>{t.redeem}</button></section>}
        {tab==="referrals" && <section className="panel page-panel referral-page"><div className="ref-illustration"><Users size={48}/></div><h2>{t.referralTitle}</h2><p>{t.referralText}</p><button className="primary-btn" onClick={copyReferral}>{copied?<Check/>:<ArrowUpRight/>}{copied?t.copied:t.copy}</button><small>{t.demoNotice}</small></section>}
        {tab==="history" && <section className="panel page-panel"><div className="section-head"><div><h2>{t.recent}</h2><p>{t.demo}</p></div></div><ActivityList done={done} daily={daily} t={t} user={Boolean(user)} ledgerEntries={ledgerEntries}/></section>}
      </div>
      <footer><span>© 2026 NOVA REWARDS</span><span>{t.demo} · v1.0.0</span></footer>
    </main>

    {modal && <div className="modal-backdrop" onClick={()=>setModal("")}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h2>{modal==="auth"?t.signIn:modal==="admin"?t.admin:t.settings}</h2><button className="icon-btn" onClick={()=>setModal("")}><X/></button></div>
      {modal==="auth" && <form onSubmit={authenticate}><p>{t.signInHint}</p><label>{t.email}<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><label>{t.password}<input type="password" minLength="6" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" disabled/></label><small>{isAr?"تسجيل الدخول برابط آمن إلى البريد؛ حقل كلمة المرور للمرحلة اللاحقة.":"Password sign-in will be enabled in a later release; email link is used now."}</small><button className="primary-btn full" disabled={authBusy}>{authBusy?"…":t.signIn}</button>{message&&<div className="form-message">{message}</div>}</form>}
      {modal==="admin" && <div className="modal-body">{!isAdmin ? <p>{t.adminNote}</p> : <><h3>{t.reviewTitle}</h3>{!pendingReviews.length ? <p>{t.noPending}</p> : pendingReviews.map(item=><div className="activity-row" key={item.id}><div><b>{item.tasks?.title || item.task_id}</b><small>{item.user_id}</small></div><span>+{item.tasks?.points || 0}</span><button className="primary-btn" disabled={Boolean(reviewBusy)} onClick={()=>reviewTask(item.id,"approved")}>{reviewBusy===item.id?"…":t.approve}</button><button className="secondary-btn" disabled={Boolean(reviewBusy)} onClick={()=>reviewTask(item.id,"rejected")}>{t.reject}</button></div>)}</>}<p className="muted">{t.noCash}</p></div>}
      {modal==="settings" && <div className="modal-body"><p>{t.backend}: <b>{backendReady?t.connected:t.notConnected}</b></p><button className="secondary-btn" onClick={()=>setLang(lang==="ar"?"en":"ar")}><Globe2 size={16}/>{t.language}: {lang.toUpperCase()}</button><p className="muted">{t.demoNotice}</p></div>}
    </div></div>}
    {message && <div className="toast" role="status">{message}<button onClick={()=>setMessage("")}><X size={15}/></button></div>}
  </div>;
}

function Stat({icon:Icon,label,value,suffix,tone,trend}) {
  return <div className="stat-card"><div className={"stat-icon "+tone}><Icon size={20}/></div><span className="stat-label">{label}</span><div className="stat-value">{value}<small>{suffix}</small></div><div className="stat-foot"><span className="stat-dot"/> {trend}</div></div>;
}
function TaskRow({task,t,completed,status,onStart}) {
  const Icon=task.icon || Target;
  return <div className="task-row"><div className={"task-icon "+(task.color || "violet")}><Icon size={20}/></div><div className="task-info"><b>{task.title || t[task.titleKey]}</b><small>{task.description || t[task.descKey]}</small></div><div className="task-reward">+{task.points}<small>{t.pointsUnit}</small></div><button className={"task-action "+(completed?"done":"")} onClick={onStart} disabled={completed}>{completed?<Check size={17}/>:<ArrowUpRight size={17}/>}<span>{status==="pending"?t.review:status==="approved"?t.approved:status==="rejected"?t.rejected:t.start}</span></button></div>;
}
function ActivityList({done,daily,t,user,ledgerEntries}) {
  const entries = user
    ? (ledgerEntries || []).map(row => ({name:row.reason === "daily_reward" ? t.daily : row.reason, points:Number(row.amount || 0)}))
    : [...(daily?[{name:t.daily,points:25}]:[]),...done.map(id=>({name:t[tasks.find(x=>x.id===id)?.titleKey],points:tasks.find(x=>x.id===id)?.points||0}))];
  if(!entries.length) return <div className="empty-state"><Activity size={24}/><p>{t.noActivity}</p></div>;
  return <div className="activity-list">{entries.map((x,i)=><div className="activity-row" key={i}><div className="activity-check"><Check size={16}/></div><b>{x.name}</b><span>{x.points>0?"+":""}{x.points} {t.pointsUnit}</span></div>)}</div>;
}