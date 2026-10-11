import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useConnection, useWallet, WalletButton } from "./wallet";
import { Transaction } from "@solana/web3.js";
import bs58 from "bs58";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Check,
  CheckCircle2,
  CircleHelp,
  ClipboardCheck,
  Copy,
  ExternalLink,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Menu,
  Plane,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  TrainFront,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import type {
  AppConfig,
  FundInput,
  GrantView,
  Role,
  Snapshot,
} from "../../shared/types";
import {
  decimalAmount,
  formatAmount,
  parseAmount,
  shortAddress,
} from "../../shared/amounts";
import { api, post } from "./api";
import {
  DateLabel,
  Empty,
  GrantRow,
  Modal,
  Money,
  RouteArt,
  Status,
  Stepper,
} from "./components";

type View = "overview" | "grants" | "review" | "activity";
type ActionResult = {
  confirmed: boolean;
  signature?: string;
  grant: string;
  pendingId?: string;
  transaction?: string;
  blockhash?: string;
  lastValidBlockHeight?: number;
};
type RunAction = (
  path: string,
  body: unknown,
  label: string,
) => Promise<ActionResult>;
const roleNames = {
  sponsor: "Sponsor",
  student: "Student",
  reviewer: "Reviewer",
};
const characters = {
  sponsor: { name: "Student Builders Fund", initials: "BF" },
  student: { name: "Ada Y.", initials: "AY" },
  reviewer: { name: "Mert K.", initials: "MK" },
};
const zero: Snapshot = {
  grants: [],
  activities: [],
  balances: { sponsor: "0", student: "0", reviewer: "0" },
  chainTime: 0,
  slot: 0,
};

export default function App({ config }: { config: AppConfig }) {
  const [role, setRole] = useState<Role>("sponsor");
  const [view, setView] = useState<View>("overview");
  const [data, setData] = useState<Snapshot>(zero);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{
    text: string;
    signature?: string;
  } | null>(null);
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [fundOpen, setFundOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const [txOpen, setTxOpen] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [lastSync, setLastSync] = useState(0);
  const [, setTick] = useState(0);
  const generation = useRef(0);
  const { connection } = useConnection();
  const wallet = useWallet();
  const accessible = config.demo || !!token;

  useEffect(() => {
    setToken("");
    setData(zero);
  }, [wallet.publicKey?.toBase58()]);
  const refresh = useCallback(async () => {
    if (!accessible) {
      setLoading(false);
      return;
    }
    const id = ++generation.current;
    setRefreshing(true);
    try {
      const snapshot = await api<Snapshot>("/snapshot", role, token);
      if (generation.current === id) {
        setData(snapshot);
        setLastSync(Date.now());
        setError("");
      }
    } catch (e) {
      if (generation.current === id) setError((e as Error).message);
    } finally {
      if (generation.current === id) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [accessible, role, token]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (!busy) void refresh();
    }, 15000);
    return () => {
      clearInterval(timer);
      ++generation.current;
    };
  }, [refresh, busy]);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 15000);
    return () => clearTimeout(timer);
  }, [notice]);
  const now = data.chainTime
    ? data.chainTime + Math.floor((Date.now() - lastSync) / 1000)
    : config.chainTime;
  const notify = (text: string) => setNotice({ text });

  async function signIn() {
    if (!wallet.publicKey || !wallet.signMessage) {
      setError("Connect a wallet that supports message signing.");
      return;
    }
    setBusy("Signing in…");
    setError("");
    try {
      const challenge = await api<{ nonce: string; message: string }>(
        "/auth/challenge",
        role,
        "",
        post({ address: wallet.publicKey.toBase58() }),
      );
      const signature = await wallet.signMessage(
        new TextEncoder().encode(challenge.message),
      );
      const session = await api<{ token: string }>(
        "/auth/verify",
        role,
        "",
        post({ nonce: challenge.nonce, signature: bs58.encode(signature) }),
      );
      setToken(session.token);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const runAction: RunAction = async (path, body, label) => {
    setBusy("Confirming on Solana…");
    setError("");
    setNotice(null);
    try {
      let result = await api<ActionResult>(path, role, token, post(body));
      if (!result.confirmed) {
        if (!wallet.publicKey || !result.transaction)
          throw new Error(
            "Connect your wallet before sending this transaction.",
          );
        setBusy("Approve in your wallet…");
        const bytes = Uint8Array.from(atob(result.transaction), (c) =>
          c.charCodeAt(0),
        );
        const signature = await wallet.sendTransaction(
          Transaction.from(bytes),
          connection,
        );
        setBusy("Confirming on Solana…");
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash: result.blockhash!,
            lastValidBlockHeight: result.lastValidBlockHeight!,
          },
          "confirmed",
        );
        if (confirmation.value.err)
          throw new Error(
            "Solana rejected the transaction. Refresh the grant state before retrying.",
          );
        result = await api<ActionResult>(
          "/transactions/confirm",
          role,
          token,
          post({ pendingId: result.pendingId, signature }),
        );
      }
      await refresh();
      setNotice({ text: label, signature: result.signature });
      return result;
    } catch (e) {
      setError((e as Error).message);
      await refresh();
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy("");
    }
  };
  function switchRole(next: Role) {
    setRole(next);
    setView("overview");
    setSelected(null);
    setFundOpen(false);
    setError("");
    setFilter("all");
    setSearch("");
  }
  function navigate(next: View) {
    setView(next);
    setFilter("all");
    setSearch("");
    setMobileNav(false);
    window.scrollTo(0, 0);
  }
  const openGrant = data.grants.find((g) => g.address === selected);
  const open = data.grants.filter((g) =>
    ["funded", "submitted"].includes(g.status),
  );
  const reserved = open.reduce((n, g) => n + BigInt(g.cap), 0n);
  const paid = data.grants.reduce((n, g) => n + BigInt(g.approved), 0n);
  const returned = data.grants.reduce((n, g) => n + BigInt(g.refunded), 0n);
  const pendingReview = data.grants.filter(
    (g) => g.status === "submitted" && now < g.reviewDeadline,
  );
  const actionable = (g: GrantView) =>
    (["funded", "submitted"].includes(g.status) && now >= g.reviewDeadline) ||
    (role === "student" && g.status === "funded" && now < g.claimDeadline) ||
    (role === "reviewer" && g.status === "submitted" && now < g.reviewDeadline);
  const rows = data.grants.filter(
    (g) =>
      (!search ||
        `${g.eventName} ${g.studentName} ${g.destination}`
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (filter === "all" ||
        (filter === "action" && actionable(g)) ||
        (filter === "complete" &&
          ["paid", "rejected", "expired"].includes(g.status))),
  );
  const heading =
    view === "activity"
      ? "Every step, accounted for."
      : view === "review"
        ? "A little review. A big opportunity."
        : view === "grants"
          ? role === "student"
            ? "Your travel grants."
            : "Every trip has a story."
          : {
              sponsor: "Fund the next big idea.",
              student: "Your ideas deserve a ticket.",
              reviewer: "Help good ideas get there.",
            }[role];
  const subtitle =
    view === "activity"
      ? "Confirmed transactions from your grants, in one place."
      : view === "review"
        ? "Check the original receipt, then release the approved amount."
        : {
            sponsor:
              "Reserve a travel budget. Support a student. Keep every dollar clear.",
            student:
              "Your travel support is reserved. Submit your expenses when you’re ready.",
            reviewer:
              "Turn reviewed expenses into student support, with the unused budget returned.",
          }[role];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label="TripGrant home"
        >
          <span className="brand-icon">
            <Plane size={23} />
          </span>
          <span>
            tripgrant<span className="brand-dot">.</span>
          </span>
        </button>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          <button
            className={view === "overview" ? "nav-link active" : "nav-link"}
            onClick={() => navigate("overview")}
          >
            <LayoutDashboard size={19} />
            Overview
          </button>
          <button
            className={view === "grants" ? "nav-link active" : "nav-link"}
            onClick={() => navigate("grants")}
          >
            <TrainFront size={19} />
            {role === "student" ? "My grants" : "Travel grants"}
            <span className="nav-count">{data.grants.length}</span>
          </button>
          {role === "reviewer" && (
            <button
              className={view === "review" ? "nav-link active" : "nav-link"}
              onClick={() => navigate("review")}
            >
              <ClipboardCheck size={19} />
              Review queue
              {pendingReview.length > 0 && (
                <span className="nav-count">{pendingReview.length}</span>
              )}
            </button>
          )}
          <button
            className={view === "activity" ? "nav-link active" : "nav-link"}
            onClick={() => navigate("activity")}
          >
            <ArrowDownLeft size={19} />
            Activity
          </button>
        </nav>
        <div className="sidebar-note">
          <span className="note-icon">
            <HeartHandshake size={22} />
          </span>
          <h3>A seat at the table.</h3>
          <p>Make travel a bridge to opportunity.</p>
          <button onClick={() => setGuide(true)}>
            How it works <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button className="help-link" onClick={() => setGuide(true)}>
            <CircleHelp size={17} />
            Quick guide
          </button>
          <div className="user-profile">
            <span className="avatar">
              {config.demo ? characters[role].initials : "ME"}
            </span>
            <div>
              <strong>
                {config.demo ? characters[role].name : "Your wallet"}
              </strong>
              <span>{roleNames[role]} workspace</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobileNav(true)}
            >
              <Menu size={21} />
            </button>
            <span>WORKSPACE</span>
            <span className="breadcrumb-slash">/</span>
            <strong>
              {view === "review" ? "REVIEW QUEUE" : view.toUpperCase()}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="network-pill">
              <span />
              {config.demo ? "Demo · test funds" : "Solana devnet"}
            </span>
            <button
              className="icon-button refresh-button"
              aria-label="Refresh from Solana"
              title="Refresh from Solana"
              disabled={refreshing || !!busy}
              onClick={() => void refresh()}
            >
              <RefreshCw size={17} className={refreshing ? "spin" : ""} />
            </button>
            {!config.demo && <WalletButton />}
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                STUDENT TRAVEL, WITH A CLEAR DESTINATION
              </div>
              <h1>{heading}</h1>
              <p>{subtitle}</p>
            </div>
            {role === "sponsor" && accessible && (
              <button
                className="btn primary"
                onClick={() => setFundOpen(true)}
                disabled={!!busy || !config.ready}
              >
                <Plus size={18} />
                Create a grant
              </button>
            )}
          </div>
          <div className="role-bar">
            <div>
              <span className="role-prefix">View as</span>
              <div className="role-switch" aria-label="Workspace role">
                {(["sponsor", "student", "reviewer"] as Role[]).map((r) => (
                  <button
                    key={r}
                    className={role === r ? "selected" : ""}
                    aria-pressed={role === r}
                    disabled={!!busy}
                    onClick={() => switchRole(r)}
                  >
                    {roleNames[r]}
                  </button>
                ))}
              </div>
            </div>
            <span className="role-hint">
              {config.demo
                ? "Three demo wallets. One real Solana flow."
                : "Your wallet signs every action."}
            </span>
          </div>
          {!config.ready && (
            <div className="alert error">
              <Timer size={18} />
              <div>
                <strong>The Solana workspace is not ready.</strong>
                <p>
                  Start the local validator, deploy the program and run the demo
                  setup. Refresh this page once setup finishes.
                </p>
              </div>
            </div>
          )}
          {error && (
            <div className="alert error" role="alert">
              <CircleHelp size={18} />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {!accessible ? (
            <div className="connect-panel">
              <span className="empty-icon">
                <Wallet size={30} />
              </span>
              <h2>Your grants belong to your wallet.</h2>
              <p>
                Connect a Solana wallet, then sign in to access your workspace
                and private receipts.
              </p>
              <WalletButton />
              {wallet.connected && (
                <button
                  className="btn primary"
                  onClick={signIn}
                  disabled={!!busy}
                >
                  {busy || "Sign in with your wallet"}
                </button>
              )}
            </div>
          ) : loading ? (
            <div className="loading-panel">
              <LoaderCircle className="spin" size={28} />
              <p>Reading your grants from Solana…</p>
            </div>
          ) : (
            <>
              {view === "overview" && (
                <>
                  <section className="hero-card">
                    <div className="hero-copy">
                      <span className="hero-kicker">
                        <Sparkles size={15} />
                        LESS PAPERWORK. MORE POSSIBILITY.
                      </span>
                      <h2>
                        {role === "student" ? (
                          <>
                            Get there.
                            <br />
                            <span>We’ll keep the budget clear.</span>
                          </>
                        ) : (
                          <>
                            Good ideas
                            <br />
                            shouldn’t stay home.
                          </>
                        )}
                      </h2>
                      <p>
                        {role === "student"
                          ? "Upload your travel receipt, request reimbursement and follow the decision in your grant."
                          : "A reserved budget gives students a clear path to travel. One approval pays the student and returns what’s left."}
                      </p>
                      <button
                        className="btn hero-button"
                        onClick={() =>
                          role === "sponsor"
                            ? setFundOpen(true)
                            : navigate(role === "student" ? "grants" : "review")
                        }
                      >
                        {role === "sponsor"
                          ? "Support a student"
                          : role === "student"
                            ? "See my grants"
                            : "Open review queue"}
                        <ArrowUpRight size={17} />
                      </button>
                    </div>
                    <RouteArt />
                  </section>
                  <section className="stats-grid" aria-label="Grant totals">
                    <Stat
                      label="Reserved budget"
                      value={
                        <Money units={reserved} token={config.tokenLabel} />
                      }
                      foot={`${open.length} open ${open.length === 1 ? "grant" : "grants"}`}
                      icon={<LockKeyhole size={19} />}
                    />
                    <Stat
                      label="Paid to students"
                      value={<Money units={paid} token={config.tokenLabel} />}
                      foot={`${data.grants.filter((g) => g.status === "paid").length} completed ${data.grants.filter((g) => g.status === "paid").length === 1 ? "trip" : "trips"}`}
                      icon={<Banknote size={19} />}
                    />
                    <Stat
                      label="Returned to sponsors"
                      value={
                        <Money units={returned} token={config.tokenLabel} />
                      }
                      foot="Unused budget, returned"
                      icon={<ArrowDownLeft size={19} />}
                    />
                    <Stat
                      label="Awaiting review"
                      value={
                        <span className="stat-number">
                          {pendingReview.length.toString().padStart(2, "0")}
                        </span>
                      }
                      foot={
                        pendingReview.length
                          ? "Ready for a human decision"
                          : "You’re all caught up"
                      }
                      icon={<ClipboardCheck size={19} />}
                    />
                  </section>
                </>
              )}
              {(view === "overview" || view === "grants") && (
                <section className="panel grants-panel">
                  <div className="section-heading">
                    <div>
                      <h2>
                        {view === "overview"
                          ? "Travel grants"
                          : role === "student"
                            ? "Your grants"
                            : "All travel grants"}
                        <span className="count-pill">{data.grants.length}</span>
                      </h2>
                      <p>
                        A clear view from reserved budget to completed trip.
                      </p>
                    </div>
                    {view === "overview" && (
                      <button
                        className="text-link section-link"
                        onClick={() => navigate("grants")}
                      >
                        View all grants <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                  <div className="table-toolbar">
                    <div className="table-tabs">
                      {[
                        ["all", "All grants"],
                        ["action", "Needs action"],
                        ["complete", "Completed"],
                      ].map(([key, label]) => (
                        <button
                          className={filter === key ? "active" : ""}
                          key={key}
                          onClick={() => setFilter(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <label className="search-field">
                      <Search size={16} />
                      <input
                        placeholder="Search grants…"
                        aria-label="Search grants"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  </div>
                  {rows.length ? (
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>EVENT & DESTINATION</th>
                            <th>STUDENT</th>
                            <th>RESERVED</th>
                            <th>STATUS</th>
                            <th>
                              <span className="sr-only">Details</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((g) => (
                            <GrantRow
                              key={g.address}
                              grant={g}
                              token={config.tokenLabel}
                              now={now}
                              open={() => setSelected(g.address)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <Empty
                      title={
                        data.grants.length
                          ? "No grants match this view."
                          : "Every journey starts with a grant."
                      }
                      text={
                        data.grants.length
                          ? "Try another search or filter."
                          : role === "sponsor"
                            ? "Reserve a travel budget for your first student."
                            : "A sponsor can reserve a travel grant for your wallet."
                      }
                      action={
                        !data.grants.length &&
                        role === "sponsor" && (
                          <button
                            className="btn primary"
                            onClick={() => setFundOpen(true)}
                          >
                            <Plus size={16} />
                            Create a grant
                          </button>
                        )
                      }
                    />
                  )}
                </section>
              )}
              {view === "review" && (
                <section className="review-grid">
                  {pendingReview.length ? (
                    pendingReview.map((g) => (
                      <article className="panel review-card" key={g.address}>
                        <div className="review-card-top">
                          <span className="event-icon">
                            <TrainFront size={22} />
                          </span>
                          <Status status={g.status} />
                        </div>
                        <h2>{g.eventName}</h2>
                        <p>
                          <MapPin size={14} />
                          {g.destination}
                        </p>
                        <div className="review-amount">
                          <span>Requested reimbursement</span>
                          <Money units={g.claimed} token={config.tokenLabel} />
                        </div>
                        <div className="review-meta">
                          <span className="avatar mini">AY</span>
                          <strong>{g.studentName}</strong>
                          <DateLabel timestamp={g.reviewDeadline} />
                        </div>
                        <button
                          className="btn primary full"
                          onClick={() => setSelected(g.address)}
                        >
                          <FileText size={17} />
                          Review receipt
                          <ArrowRight size={17} />
                        </button>
                      </article>
                    ))
                  ) : (
                    <div className="panel full">
                      <Empty
                        title="The review queue is clear."
                        text="Submitted claims will appear here. Expired grants can be refunded from Travel grants."
                      />
                    </div>
                  )}
                </section>
              )}
              {view === "activity" && (
                <section className="panel activity-panel">
                  <div className="section-heading">
                    <div>
                      <h2>Confirmed activity</h2>
                      <p>
                        Each entry links to an actual transaction on this
                        network.
                      </p>
                    </div>
                    <span className="verified-pill">
                      <ShieldCheck size={15} />
                      Read from Solana
                    </span>
                  </div>
                  {data.activities.length ? (
                    <div className="activity-list">
                      {data.activities.map((a) => (
                        <div className="activity-item" key={a.signature}>
                          <span className={`activity-icon ${a.kind}`}>
                            {a.kind === "fund" ? (
                              <LockKeyhole size={18} />
                            ) : a.kind === "claim" ? (
                              <FileText size={18} />
                            ) : (
                              <CheckCircle2 size={18} />
                            )}
                          </span>
                          <div className="activity-text">
                            <strong>{a.description}</strong>
                            <span>
                              {data.grants.find((g) => g.address === a.grant)
                                ?.eventName || "Travel grant"}{" "}
                              ·{" "}
                              {new Date(a.createdAt * 1000).toLocaleString(
                                "en-GB",
                                {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                          <Money
                            units={a.amount}
                            token={config.tokenLabel}
                            small
                          />
                          <button
                            className="icon-button"
                            onClick={() => setTxOpen(a.signature)}
                            aria-label={`View transaction ${shortAddress(a.signature)}`}
                          >
                            <ExternalLink size={17} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      title="Your first step will appear here."
                      text="Create a grant or submit an expense to record a confirmed transaction."
                    />
                  )}
                </section>
              )}
              {view === "overview" && (
                <div className="bottom-grid">
                  <section className="how-card">
                    <div className="how-title">
                      <span className="small-icon">
                        <ShieldCheck size={18} />
                      </span>
                      <h3>One budget. A clear journey.</h3>
                    </div>
                    <div className="mini-steps">
                      <div>
                        <b>01</b>
                        <strong>Reserve</strong>
                        <span>Sponsor funds the budget.</span>
                      </div>
                      <ArrowRight size={17} />
                      <div>
                        <b>02</b>
                        <strong>Review</strong>
                        <span>Student submits evidence.</span>
                      </div>
                      <ArrowRight size={17} />
                      <div>
                        <b>03</b>
                        <strong>Pay & return</strong>
                        <span>One confirmed transaction.</span>
                      </div>
                    </div>
                  </section>
                  <section className="balance-card">
                    <div>
                      <span>YOUR {role.toUpperCase()} WALLET</span>
                      <Wallet size={18} />
                    </div>
                    <Money
                      units={data.balances[role]}
                      token={config.tokenLabel}
                    />
                    <button
                      className="text-link"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          config.demo
                            ? config.wallets[role]
                            : wallet.publicKey!.toBase58(),
                        );
                        notify("Wallet address copied.");
                      }}
                    >
                      {shortAddress(
                        config.demo
                          ? config.wallets[role]
                          : wallet.publicKey?.toBase58() || "",
                      )}
                      <Copy size={13} />
                    </button>
                  </section>
                </div>
              )}
              <footer className="page-footer">
                <span>
                  <span className="live-dot" />
                  Last synced from Solana · slot{" "}
                  {data.slot.toLocaleString("en-US")}
                </span>
                <span>
                  {config.demo
                    ? "Synthetic events & receipts · no real funds"
                    : "Devnet USDC · no mainnet funds"}
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      {busy && (
        <div className="busy-banner" role="status">
          <LoaderCircle size={17} className="spin" />
          {busy}
        </div>
      )}
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          <div>
            <strong>{notice.text}</strong>
            {notice.signature && (
              <button onClick={() => setTxOpen(notice.signature!)}>
                View confirmed transaction <ArrowUpRight size={13} />
              </button>
            )}
          </div>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {fundOpen && !txOpen && (
        <FundDialog
          config={config}
          now={now}
          busy={!!busy}
          run={runAction}
          close={() => {
            if (!busy) setFundOpen(false);
          }}
        />
      )}
      {openGrant && !txOpen && (
        <GrantDialog
          key={openGrant.address}
          grant={openGrant}
          role={role}
          config={config}
          token={token}
          now={now}
          busy={!!busy}
          run={runAction}
          close={() => {
            if (!busy) setSelected(null);
          }}
          openTx={setTxOpen}
        />
      )}
      {guide && !txOpen && (
        <Modal
          title="A clear path from budget to travel."
          subtitle="TripGrant in three steps"
          close={() => setGuide(false)}
        >
          <div className="guide-steps">
            <div>
              <span>1</span>
              <section>
                <h3>A sponsor reserves the budget.</h3>
                <p>
                  The funds enter a grant vault. The student, reviewer, token
                  and deadlines are fixed for that grant.
                </p>
              </section>
            </div>
            <div>
              <span>2</span>
              <section>
                <h3>The student submits a receipt.</h3>
                <p>
                  The original receipt stays private to the grant participants.
                  Its SHA-256 commitment and requested amount are recorded on
                  Solana.
                </p>
              </section>
            </div>
            <div>
              <span>3</span>
              <section>
                <h3>A human reviews. The program settles.</h3>
                <p>
                  The approved amount goes to the student, and the entire
                  remaining balance goes back to the sponsor in one transaction.
                  A zero approval returns everything.
                </p>
              </section>
            </div>
          </div>
          <div className="info-box">
            <Timer size={19} />
            <p>
              After the review deadline, anyone can trigger a refund to the
              fixed sponsor. Time passing alone does not send a transaction.
            </p>
          </div>
          <div className="guide-note">
            <strong>
              {config.demo ? "About this demo" : "About this prototype"}
            </strong>
            <p>
              {config.demo
                ? "Three disposable wallets use a custom six-decimal TEST token on a real local Solana validator. Events, names and receipts are synthetic. A demo wallet is not a personal wallet."
                : "This version supports Circle devnet USDC. Connect three different wallets to complete the sponsor, student and reviewer workflow."}{" "}
              Receipt authenticity and student eligibility require human checks.
              The program is upgradeable and has not undergone an independent
              audit.
            </p>
          </div>
          <button className="btn primary full" onClick={() => setGuide(false)}>
            Got it <Check size={16} />
          </button>
        </Modal>
      )}
      {txOpen && (
        <TransactionDialog
          signature={txOpen}
          role={role}
          token={token}
          config={config}
          close={() => setTxOpen(null)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  foot,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  foot: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="stat-card">
      <div>
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      {value}
      <p>{foot}</p>
    </article>
  );
}

function FundDialog({
  config,
  now,
  busy,
  run,
  close,
}: {
  config: AppConfig;
  now: number;
  busy: boolean;
  run: RunAction;
  close: () => void;
}) {
  const dateValue = (seconds: number) => {
    const d = new Date(seconds * 1000);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  const [form, setForm] = useState({
    eventName: "",
    studentName: config.demo ? "Ada Y." : "",
    destination: "",
    purpose: "",
    student: config.demo ? config.wallets.student : "",
    reviewer: config.demo ? config.wallets.reviewer : "",
    amount: "100",
    claimDeadline: dateValue((now || Date.now() / 1000) + 7 * 86400),
    reviewDeadline: dateValue((now || Date.now() / 1000) + 10 * 86400),
  });
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const update = (name: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [name]: value }));
    setConfirm(false);
  };
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      parseAmount(form.amount);
      const claimDeadline = Math.floor(
        new Date(form.claimDeadline).getTime() / 1000,
      );
      const reviewDeadline = Math.floor(
        new Date(form.reviewDeadline).getTime() / 1000,
      );
      if (claimDeadline <= now || reviewDeadline <= claimDeadline)
        throw new Error("Review must finish after the future claim deadline.");
      if (!confirm) {
        setConfirm(true);
        return;
      }
      const input: FundInput = { ...form, claimDeadline, reviewDeadline };
      await run("/grants", input, "Travel budget reserved.");
      close();
    } catch (err) {
      setError((err as Error).message);
    }
  }
  return (
    <Modal
      title="Give a good idea a way to get there."
      subtitle="Create and fund a travel grant"
      close={close}
      wide
    >
      <form onSubmit={submit} className="fund-form">
        <div className="form-grid">
          <Field label="Event name">
            <input
              required
              minLength={3}
              maxLength={100}
              placeholder="e.g. Student Builders Summit"
              value={form.eventName}
              onChange={(e) => update("eventName", e.target.value)}
            />
          </Field>
          <Field label="Destination">
            <input
              required
              minLength={2}
              maxLength={100}
              placeholder="e.g. Ankara → Istanbul"
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
            />
          </Field>
          <Field label="Student name">
            <input
              required
              minLength={2}
              maxLength={80}
              value={form.studentName}
              onChange={(e) => update("studentName", e.target.value)}
              placeholder="Student’s display name"
            />
          </Field>
          <Field label={`Reserved budget (${config.tokenLabel})`}>
            <input
              required
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => update("amount", e.target.value)}
            />
          </Field>
          <div className="span-two">
            <Field label="Purpose">
              <input
                required
                minLength={5}
                maxLength={300}
                placeholder="e.g. Intercity transport to present a student project"
                value={form.purpose}
                onChange={(e) => update("purpose", e.target.value)}
              />
            </Field>
          </div>
          <div className="span-two">
            <Field label="Student wallet">
              <input
                required
                className="mono-input"
                value={form.student}
                onChange={(e) => update("student", e.target.value)}
                placeholder="Solana public address"
              />
            </Field>
          </div>
          <div className="span-two">
            <Field label="Reviewer wallet">
              <input
                required
                className="mono-input"
                value={form.reviewer}
                onChange={(e) => update("reviewer", e.target.value)}
                placeholder="A different Solana public address"
              />
            </Field>
          </div>
          <Field label="Claim deadline">
            <input
              required
              type="datetime-local"
              value={form.claimDeadline}
              onChange={(e) => update("claimDeadline", e.target.value)}
            />
          </Field>
          <Field label="Review & refund deadline">
            <input
              required
              type="datetime-local"
              value={form.reviewDeadline}
              onChange={(e) => update("reviewDeadline", e.target.value)}
            />
          </Field>
        </div>
        <div className="info-box">
          <LockKeyhole size={18} />
          <p>
            The budget enters the grant vault immediately. Wallets and deadlines
            cannot be edited after funding. The student receives money only
            after review.
          </p>
        </div>
        {confirm && (
          <div className="confirmation-strip">
            <CheckCircle2 size={20} />
            <span>
              Reserve{" "}
              <strong>
                {form.amount} {config.tokenLabel}
              </strong>{" "}
              for <strong>{form.studentName}</strong> at {form.eventName}.
            </span>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={close}
            disabled={busy}
          >
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <LockKeyhole size={17} />
            )}
            {confirm ? "Confirm & fund grant" : "Review grant"}
            <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function GrantDialog({
  grant: g,
  role,
  config,
  token,
  now,
  busy,
  run,
  close,
  openTx,
}: {
  grant: GrantView;
  role: Role;
  config: AppConfig;
  token: string;
  now: number;
  busy: boolean;
  run: RunAction;
  close: () => void;
  openTx: (signature: string) => void;
}) {
  const [amount, setAmount] = useState(
    g.status === "funded"
      ? BigInt(g.cap) >= 72_000_000n
        ? "72"
        : decimalAmount(g.cap)
      : decimalAmount(g.claimed),
  );
  const [receipt, setReceipt] = useState<{
    id: string;
    name: string;
    hash: string;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [confirmAmount, setConfirmAmount] = useState<bigint | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const overdue =
    ["funded", "submitted"].includes(g.status) && now >= g.reviewDeadline;
  const canClaim =
    role === "student" && g.status === "funded" && now < g.claimDeadline;
  const canReview =
    role === "reviewer" && g.status === "submitted" && now < g.reviewDeadline;
  async function uploadReceipt(chosen?: File) {
    setUploading(true);
    setError("");
    try {
      const options = chosen
        ? {
            method: "POST",
            body: (() => {
              const form = new FormData();
              form.append("receipt", chosen);
              return form;
            })(),
          }
        : post();
      setReceipt(
        await api(
          `/grants/${g.address}/${chosen ? "receipts" : "sample-receipt"}`,
          role,
          token,
          options,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function evidence() {
    setUploading(true);
    setError("");
    try {
      const headers: Record<string, string> = { "x-demo-role": role };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`/api/grants/${g.address}/receipt`, {
        headers,
      });
      if (!response.ok) {
        const value = await response.json();
        throw new Error(value.error);
      }
      const blob = await response.blob();
      const digest = await crypto.subtle.digest(
        "SHA-256",
        await blob.arrayBuffer(),
      );
      const actual = Array.from(new Uint8Array(digest), (x) =>
        x.toString(16).padStart(2, "0"),
      ).join("");
      if (actual !== g.receiptHash)
        throw new Error("The receipt does not match its on-chain commitment.");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        "tripgrant-receipt" +
        (blob.type === "application/pdf"
          ? ".pdf"
          : blob.type === "image/png"
            ? ".png"
            : ".jpg");
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function submitClaim(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const units = parseAmount(amount);
      if (units > BigInt(g.cap))
        throw new Error("Your claim cannot exceed the reserved budget.");
      if (!receipt) throw new Error("Upload a receipt first.");
      const result = await run(
        `/grants/${g.address}/claim`,
        { amount, receiptId: receipt.id },
        "Expense submitted for review.",
      );
      setLastTx(result.signature!);
      setReceipt(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function reviewApproval(reject = false) {
    setError("");
    try {
      if (!reviewed)
        throw new Error(
          "Review the original evidence and confirm the eligibility check first.",
        );
      const units = reject ? 0n : parseAmount(amount);
      if (units > BigInt(g.claimed) || units > BigInt(g.cap))
        throw new Error(
          "Approval cannot exceed the claim or the reserved budget.",
        );
      setConfirmAmount(units);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function settle() {
    if (confirmAmount === null) return;
    try {
      const result = await run(
        `/grants/${g.address}/settle`,
        { amount: decimalAmount(confirmAmount) },
        confirmAmount === 0n
          ? "Claim rejected. Full budget returned."
          : "Student paid. Unused budget returned.",
      );
      setLastTx(result.signature!);
      setConfirmAmount(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function refund() {
    try {
      const result = await run(
        `/grants/${g.address}/refund`,
        {},
        "Expired grant refunded to the sponsor.",
      );
      setLastTx(result.signature!);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal
      title={g.eventName}
      subtitle={`${g.studentName} · ${g.destination}`}
      close={close}
      wide
    >
      <div className="grant-detail">
        <div className="detail-summary">
          <span className="event-icon">
            <TrainFront size={25} />
          </span>
          <div>
            <p>{g.purpose}</p>
            <Status status={g.status} deadlinePassed={overdue} />
          </div>
          <div className="detail-cap">
            <span>RESERVED BUDGET</span>
            <Money units={g.cap} token={config.tokenLabel} />
          </div>
        </div>
        <Stepper grant={g} />
        <div className="detail-totals">
          <div>
            <span>Requested</span>
            <Money units={g.claimed} token={config.tokenLabel} small />
          </div>
          <div>
            <span>Paid to student</span>
            <Money units={g.approved} token={config.tokenLabel} small />
          </div>
          <div>
            <span>Returned to sponsor</span>
            <Money units={g.refunded} token={config.tokenLabel} small />
          </div>
        </div>
        <div className="deadline-row">
          <div>
            <span>CLAIM BY</span>
            <DateLabel timestamp={g.claimDeadline} />
          </div>
          <div>
            <span>REVIEW BY</span>
            <DateLabel timestamp={g.reviewDeadline} />
          </div>
          <div>
            <span>IN VAULT NOW</span>
            <strong>
              {formatAmount(g.vaultBalance)} {config.tokenLabel}
            </strong>
          </div>
        </div>
        {canClaim && (
          <form className="claim-form" onSubmit={submitClaim}>
            <h3>Your expense, ready for review.</h3>
            <p>
              Submit one travel expense and its original receipt. The reviewer
              determines the eligible amount.
            </p>
            <div className="upload-box">
              <Upload size={25} />
              <div>
                <strong>
                  {receipt ? receipt.name : "Add your travel receipt"}
                </strong>
                <span>
                  {receipt
                    ? "SHA-256 commitment prepared · stored privately"
                    : "PDF, PNG or JPEG · up to 5 MB"}
                </span>
              </div>
              <input
                ref={file}
                className="sr-only"
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={(e) => {
                  if (e.target.files?.[0])
                    void uploadReceipt(e.target.files[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="btn secondary"
                disabled={uploading || busy}
                onClick={() => file.current?.click()}
              >
                {uploading ? "Uploading…" : receipt ? "Replace" : "Choose file"}
              </button>
            </div>
            {config.demo && (
              <button
                type="button"
                className="sample-link"
                disabled={uploading || busy}
                onClick={() => void uploadReceipt()}
              >
                <FileText size={14} />
                Use a synthetic demo receipt
              </button>
            )}
            <Field label={`Requested amount (${config.tokenLabel})`}>
              <input
                required
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <div className="modal-actions">
              <span className="private-hint">
                <LockKeyhole size={13} />
                Original receipt stays private.
              </span>
              <button
                className="btn primary"
                type="submit"
                disabled={!receipt || busy || uploading}
              >
                Submit expense <ArrowRight size={17} />
              </button>
            </div>
          </form>
        )}
        {g.status === "submitted" && (
          <section className="receipt-section">
            <div className="section-heading">
              <div>
                <h3>Committed evidence</h3>
                <p>The receipt must match its on-chain fingerprint.</p>
              </div>
              <span className="verified-pill">
                <ShieldCheck size={14} />
                Hash recorded
              </span>
            </div>
            <div className="receipt-file">
              <span className="receipt-icon">
                <FileText size={23} />
              </span>
              <div>
                <strong>Travel expense receipt</strong>
                <span>{shortAddress(g.receiptHash, 8)} · SHA-256</span>
              </div>
              <button
                className="btn secondary"
                onClick={() => void evidence()}
                disabled={!g.receiptAvailable || uploading || busy}
              >
                <ExternalLink size={14} />
                {uploading ? "Checking…" : "Download receipt"}
              </button>
            </div>
            {!g.receiptAvailable && (
              <p className="form-error">
                The original receipt is unavailable on this instance. Contact
                the student before deciding.
              </p>
            )}
            {canReview && (
              <>
                <label className="review-check">
                  <input
                    type="checkbox"
                    checked={reviewed}
                    onChange={(e) => setReviewed(e.target.checked)}
                    disabled={busy}
                  />
                  <span>
                    I reviewed the original receipt and verified the student’s
                    eligibility.
                  </span>
                </label>
                <Field
                  label={`Eligible amount to approve (${config.tokenLabel})`}
                >
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setConfirmAmount(null);
                    }}
                    disabled={busy}
                  />
                </Field>
                {confirmAmount !== null ? (
                  <div className="settlement-preview">
                    <h3>
                      {confirmAmount === 0n
                        ? "Confirm rejection and full refund"
                        : "Confirm this settlement"}
                    </h3>
                    <div>
                      <span>Student receives</span>
                      <Money
                        units={confirmAmount}
                        token={config.tokenLabel}
                        small
                      />
                    </div>
                    <div>
                      <span>Sponsor receives</span>
                      <Money
                        units={BigInt(g.vaultBalance) - confirmAmount}
                        token={config.tokenLabel}
                        small
                      />
                    </div>
                    <p>
                      Both transfers occur in one transaction. The grant closes
                      for further claims.
                    </p>
                    <div className="modal-actions">
                      <button
                        className="btn secondary"
                        disabled={busy}
                        onClick={() => setConfirmAmount(null)}
                      >
                        Back
                      </button>
                      <button
                        className="btn primary"
                        disabled={busy}
                        onClick={() => void settle()}
                      >
                        <Check size={17} />
                        {busy
                          ? "Confirming…"
                          : confirmAmount === 0n
                            ? "Reject & return budget"
                            : "Approve & settle"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="modal-actions">
                    <button
                      className="btn danger-ghost"
                      disabled={busy || !g.receiptAvailable || !reviewed}
                      onClick={() => reviewApproval(true)}
                    >
                      Reject & refund
                    </button>
                    <button
                      className="btn primary"
                      disabled={busy || !g.receiptAvailable || !reviewed}
                      onClick={() => reviewApproval()}
                    >
                      <Check size={17} />
                      Review settlement
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}
        {g.status === "funded" && !canClaim && !overdue && (
          <div className="info-box">
            <Timer size={18} />
            <p>
              {now >= g.claimDeadline
                ? "The claim deadline has passed. The remaining budget becomes refundable after the review deadline."
                : role === "sponsor"
                  ? "This budget is reserved. The student can now submit a receipt from their workspace."
                  : "Waiting for the student to submit an expense. Review becomes available once the claim is on Solana."}
            </p>
          </div>
        )}
        {overdue && (
          <div className="refund-panel">
            <div>
              <Timer size={20} />
              <h3>The review window has ended.</h3>
            </div>
            <p>
              Return the entire remaining vault balance to the fixed sponsor.
              This action cannot redirect funds.
            </p>
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => void refund()}
            >
              <ArrowDownLeft size={17} />
              Return unused budget
            </button>
          </div>
        )}
        {["paid", "rejected", "expired"].includes(g.status) && (
          <div className="completed-panel">
            <CheckCircle2 size={28} />
            <div>
              <h3>
                {g.status === "paid"
                  ? "This trip’s budget is settled."
                  : "The remaining budget has been returned."}
              </h3>
              <p>
                {g.status === "paid"
                  ? `${formatAmount(g.approved)} ${config.tokenLabel} paid to the student · ${formatAmount(g.refunded)} ${config.tokenLabel} returned to the sponsor.`
                  : `${formatAmount(g.refunded)} ${config.tokenLabel} returned to the sponsor. No student payment was made.`}{" "}
                This grant cannot be settled again.
              </p>
            </div>
          </div>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {lastTx && (
          <button className="text-link" onClick={() => openTx(lastTx)}>
            View confirmed transaction <ArrowUpRight size={15} />
          </button>
        )}
        <div className="detail-wallets">
          <div>
            <span>SPONSOR</span>
            <code title={g.sponsor}>{shortAddress(g.sponsor, 6)}</code>
          </div>
          <div>
            <span>STUDENT</span>
            <code title={g.student}>{shortAddress(g.student, 6)}</code>
          </div>
          <div>
            <span>REVIEWER</span>
            <code title={g.reviewer}>{shortAddress(g.reviewer, 6)}</code>
          </div>
        </div>
        <div className="detail-footnote">
          <ShieldCheck size={13} />
          <span>
            Grant {shortAddress(g.address, 6)} · Values read from Solana. A
            receipt hash proves a match, not authenticity.
          </span>
        </div>
      </div>
    </Modal>
  );
}

function TransactionDialog({
  signature,
  role,
  token,
  config,
  close,
}: {
  signature: string;
  role: Role;
  token: string;
  config: AppConfig;
  close: () => void;
}) {
  const [tx, setTx] = useState<{
    slot: number;
    feeLamports: number;
    error: unknown;
    logs: string[];
    blockTime: number;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api<any>(`/transactions/${signature}`, role, token)
      .then((data) => {
        if (active) setTx(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [signature, role, token]);
  return (
    <Modal
      title="A transaction you can verify."
      subtitle={`Confirmed on Solana ${config.network}`}
      close={close}
    >
      <div className="transaction-detail">
        {error ? (
          <p className="form-error">{error}</p>
        ) : !tx ? (
          <LoaderCircle className="spin" />
        ) : (
          <>
            <div className="tx-state">
              <CheckCircle2 size={21} />
              <strong>
                {tx.error ? "Transaction failed" : "Confirmed · successful"}
              </strong>
            </div>
            <Field label="Transaction signature">
              <code className="signature-value">{signature}</code>
            </Field>
            <div className="tx-meta">
              <div>
                <span>Slot</span>
                <strong>{tx.slot.toLocaleString("en-US")}</strong>
              </div>
              <div>
                <span>Network fee</span>
                <strong>{tx.feeLamports / 1_000_000_000} SOL</strong>
              </div>
            </div>
            <details>
              <summary>Program execution logs</summary>
              <pre>{tx.logs?.join("\n")}</pre>
            </details>
            {config.network === "devnet" && (
              <a
                className="btn secondary full"
                href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
              >
                Open Solana Explorer <ExternalLink size={15} />
              </a>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
