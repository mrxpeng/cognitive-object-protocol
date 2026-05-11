// COP v0.2 alpha — Core type definitions

export type CopState = {
  lifecycle?: "draft" | "reviewing" | "approved" | "published" | "archived" | "deprecated" | "superseded";
  confidence?: number;
  risk_level?: "none" | "low" | "medium" | "high" | "critical";
  trust_level?: "untrusted" | "agent_generated" | "reasoned" | "human_reviewed"; // "verified" is reserved for future signed trust extensions.
  review_status?: "unreviewed" | "needs_human_review" | "reviewed" | "rejected" | "accepted";
  freshness?: "current" | "outdated" | "unknown";
  visibility?: Record<string, unknown>;
};

export type CopContentFormat = "text" | "markdown" | "json" | "table" | "code" | "media";

export type CopContent = {
  format: CopContentFormat;
  text?: string;
  data?: unknown;
  language?: string;
  [key: string]: unknown;
};

export type CopBlock = {
  id: string;
  type: string;
  content: CopContent;
  parent_id?: string | null;
  order?: number;
  state?: CopState;
  metadata?: Record<string, unknown>;
};

export type CopRelation = {
  id: string;
  from: string;
  to: string;
  type: string;
  strength?: number;
  metadata?: Record<string, unknown>;
};

export type CopComment = {
  id: string;
  target: { id: string; range?: [number, number] };
  author: { type?: string; role?: string; name?: string; [key: string]: unknown };
  type: string;
  content: string;
  status: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
};

export type CopOperation = {
  id: string;
  op: string;
  target?: string;
  actor: string | Record<string, unknown>;
  patch_format?: "object_merge" | "json_patch";
  patch?: Record<string, unknown> | Array<Record<string, unknown>>;
  preconditions?: { target_hash?: string; document_version?: number; base_operation?: string; [key: string]: unknown };
  reason?: string;
  status?: "proposed" | "applied" | "rejected" | "reverted";
  created_at: string;
  result?: Record<string, unknown>;
};

export type CopView = {
  id: string;
  type: string;
  include: string[];
  layout?: string;
  filters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type CopSource = {
  id: string;
  type: string;
  title: string;
  url?: string;
  reliability?: string;
  published_at?: string;
  accessed_at?: string;
  metadata?: Record<string, unknown>;
};

export type CopObject = {
  id: string;
  type: string;
  title: string;
  language: string;
  description?: string;
  owner?: string;
  created_at?: string;
  updated_at?: string;
  state?: CopState;
  metadata?: Record<string, unknown>;
};

export type CopDocument = {
  protocol: "cop";
  version: "0.1";
  object: CopObject;
  blocks: CopBlock[];
  relations: CopRelation[];
  comments?: CopComment[];
  operations?: CopOperation[];
  views?: CopView[];
  sources?: CopSource[];
  metadata?: Record<string, unknown>;
};
