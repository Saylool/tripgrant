export type Role = "sponsor" | "student" | "reviewer";
export type GrantStatus =
  "funded" | "submitted" | "paid" | "rejected" | "expired";
export interface GrantView {
  address: string;
  grantId: string;
  eventName: string;
  studentName: string;
  destination: string;
  purpose: string;
  sponsor: string;
  student: string;
  reviewer: string;
  mint: string;
  cap: string;
  claimed: string;
  approved: string;
  refunded: string;
  vaultBalance: string;
  claimDeadline: number;
  reviewDeadline: number;
  createdAt: number;
  submittedAt: number;
  settledAt: number;
  receiptHash: string;
  status: GrantStatus;
  receiptAvailable: boolean;
}
export interface Activity {
  signature: string;
  grant: string;
  kind: "fund" | "claim" | "settle" | "refund";
  actor: string;
  createdAt: number;
  amount: string;
  description: string;
}
export interface AppConfig {
  programId: string;
  mint: string;
  network: "localnet" | "devnet";
  endpoint: string;
  demo: boolean;
  tokenLabel: string;
  wallets: Record<Role, string>;
  ready: boolean;
  chainTime: number;
  upgradeable: boolean;
}
export interface Snapshot {
  grants: GrantView[];
  activities: Activity[];
  balances: Record<Role, string>;
  chainTime: number;
  slot: number;
}
export interface FundInput {
  eventName: string;
  studentName: string;
  destination: string;
  purpose: string;
  student: string;
  reviewer: string;
  amount: string;
  claimDeadline: number;
  reviewDeadline: number;
}
