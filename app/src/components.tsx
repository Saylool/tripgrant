import { useEffect, useRef, type ReactNode } from "react";
import {
  X,
  Check,
  ArrowUpRight,
  Plane,
  TrainFront,
  MapPin,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import type { GrantStatus, GrantView } from "../../shared/types";
import { formatAmount } from "../../shared/amounts";

export function Modal({
  title,
  subtitle,
  children,
  close,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
        ) || [],
      ).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    function key(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
      >
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={close}
          >
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
const labels: Record<GrantStatus, string> = {
  funded: "Ready to claim",
  submitted: "In review",
  paid: "Paid",
  rejected: "Not approved",
  expired: "Refunded",
};
export function Status({
  status,
  deadlinePassed = false,
}: {
  status: GrantStatus;
  deadlinePassed?: boolean;
}) {
  return (
    <span className={`status ${deadlinePassed ? "overdue" : status}`}>
      <span />
      {deadlinePassed ? "Refund available" : labels[status]}
    </span>
  );
}
export function Money({
  units,
  token,
  small = false,
}: {
  units: string | bigint;
  token: string;
  small?: boolean;
}) {
  return (
    <span className={`money ${small ? "small" : ""}`}>
      {formatAmount(units)}
      <span>{token}</span>
    </span>
  );
}
export function RouteArt() {
  return (
    <div className="route-art" aria-hidden="true">
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <div className="route-path" />
      <div className="route-node start">
        <TrainFront size={20} />
      </div>
      <div className="route-node finish">
        <MapPin size={21} />
      </div>
      <div className="flight-icon">
        <Plane size={27} />
      </div>
      <div className="travel-ticket">
        <span className="ticket-label">YOUR NEXT OPPORTUNITY</span>
        <div>
          <strong>IDEA</strong>
          <span>
            ······ <Plane size={15} /> ······
          </span>
          <strong>THERE</strong>
        </div>
        <footer>
          <span>TRAVEL SUPPORT</span>
          <span>
            RESERVED <Check size={11} />
          </span>
        </footer>
      </div>
    </div>
  );
}
export function Stepper({ grant }: { grant: GrantView }) {
  const state = grant.status;
  const stage = state === "funded" ? 1 : state === "submitted" ? 2 : 3;
  const closed = ["paid", "rejected", "expired"].includes(state);
  return (
    <div className="stepper">
      {["Budget reserved", "Expense submitted", "Paid & returned"].map(
        (name, i) => (
          <div className={`step ${i < stage ? "done" : ""}`} key={name}>
            <span>{i < stage ? <Check size={13} /> : i + 1}</span>
            <label>
              {i === 2 && closed && state !== "paid" ? "Budget returned" : name}
            </label>
          </div>
        ),
      )}
    </div>
  );
}
export function Empty({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Plane size={28} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function GrantRow({
  grant,
  token,
  now,
  open,
}: {
  grant: GrantView;
  token: string;
  now: number;
  open: () => void;
}) {
  const overdue =
    ["funded", "submitted"].includes(grant.status) &&
    now >= grant.reviewDeadline;
  return (
    <tr>
      <td>
        <div className="event-cell">
          <div
            className={`event-icon ${grant.status === "paid" ? "is-paid" : ""}`}
          >
            {grant.status === "paid" ? (
              <CheckCircle2 size={19} />
            ) : (
              <TrainFront size={19} />
            )}
          </div>
          <div>
            <button className="text-link row-title" onClick={open}>
              {grant.eventName}
            </button>
            <span>{grant.destination}</span>
          </div>
        </div>
      </td>
      <td>
        <div className="student-cell">
          <span className="avatar mini">
            {grant.studentName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </span>
          {grant.studentName}
        </div>
      </td>
      <td>
        <Money units={grant.cap} token={token} small />
      </td>
      <td>
        <Status status={grant.status} deadlinePassed={overdue} />
      </td>
      <td>
        <button
          className="icon-button row-arrow"
          aria-label={`View ${grant.eventName}`}
          onClick={open}
        >
          <ArrowUpRight size={19} />
        </button>
      </td>
    </tr>
  );
}
export function DateLabel({ timestamp }: { timestamp: number }) {
  return (
    <span className="date-label">
      <Clock3 size={14} />
      {new Date(timestamp * 1000).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}
    </span>
  );
}
