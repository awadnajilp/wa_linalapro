/**
 * ============================================================
 * © 2025 Diploy — a brand of Bisht Technologies Private Limited
 * Original Author: BTPL Engineering Team
 * Website: https://diploy.in
 * Contact: cs@diploy.in
 *
 * Distributed under the Envato / CodeCanyon License Agreement.
 * Licensed to the purchaser for use as defined by the
 * Envato Market (CodeCanyon) Regular or Extended License.
 *
 * You are NOT permitted to redistribute, resell, sublicense,
 * or share this source code, in whole or in part.
 * Respect the author's rights and Envato licensing terms.
 * ============================================================
 */

export type NodeKind =
  | "start"
  | "conditions"
  | "custom_reply"
  | "user_reply"
  | "time_gap"
  | "send_template"
  | "assign_user"
  | "webhook"
  | "mysql"
  | "end"
  | "add_to_group"
  | "update_contact"
  | "delete_contact"
  | "set_variable"
  | "send_location"
  | "send_list_message"
  | "send_media"
  | "mark_as_read"
  | "wait_reply"
  | "ai_answer"
  | "ai_agent"
  | "send_contact_message"
  | "scheduler"
  | "route_crm_round_robin"
  | "razorpay_generate"
  | "razorpay_verify"
  | "instamojo_payment"
  | "zapier"
  | "tap_payment"
  | "noon_payment";

export interface ListSection {
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
}

export interface BuilderNodeData {
  kind: NodeKind;
  label?: string;
  message?: string;
  targetContactIds?: string[];
  sendContactChannelId?: string;
  imageFile?: File | null;
  imagePreview?: string;
  videoFile?: File | null;
  videoPreview?: string;
  audioFile?: File | null;
  audioPreview?: string;
  documentFile?: File | null;
  documentPreview?: string;
  question?: string;
  saveAs?: string;
  delay?: number;
  templateId?: string;
  assigneeId?: string;
  conditionType?: "keyword" | "contains" | "equals" | "starts_with" | "variable";
  keywords?: string[];
  matchType?: "any" | "all";
  buttons?: Array<{
    id: string;
    text: string;
    action: "next" | "custom";
    value?: string;
  }>;
  webhookUrl?: string;
  webhookMethod?: "GET" | "POST" | "PUT" | "DELETE";
  webhookHeaders?: Record<string, string>;
  webhookBody?: string;
  endMessage?: string;
  groupId?: string;
  groupName?: string;
  contactField?: string;
  contactFieldValue?: string;
  variableName?: string;
  variableValue?: string;
  variableSource?: "static" | "from_message" | "from_webhook";
  latitude?: string;
  longitude?: string;
  locationName?: string;
  locationAddress?: string;
  listButtonText?: string;
  listSections?: ListSection[];
  mediaType?: "image" | "video" | "audio" | "document";
  mediaUrl?: string;
  mediaId?: string;
  mediaSourceType?: "url" | "upload";
  mediaFileName?: string;
  mediaCaption?: string;
  aiConfigUseSettings?: boolean;
  aiApiKey?: string;
  aiSystemPrompt?: string;
  aiUseTrainingData?: boolean;
  aiOutputVariable?: string;
  aiModel?: string;
  aiIntroEnabled?: boolean;
  aiIntroMessage?: string;
  aiIntroType?: "text" | "voice";
  timeLimitHours?: number;
  questionLimit?: number;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  razorpayAmount?: string;
  razorpayCurrency?: string;
  razorpayCustomerName?: string;
  razorpayCustomerEmail?: string;
  razorpayCustomerPhone?: string;
  razorpayDescription?: string;
  razorpayReceipt?: string;
  razorpayVarUrl?: string;
  razorpayVarRefId?: string;
  razorpayRefId?: string;
  razorpayVarStatus?: string;
  razorpayVarPaymentId?: string;
  razorpayMode?: "generate_only" | "send_and_wait";
  razorpayMessage?: string;
  instamojoApiKey?: string;
  instamojoAuthToken?: string;
  instamojoSandbox?: boolean;
  instamojoAmount?: string;
  instamojoPurpose?: string;
  instamojoCustomerName?: string;
  instamojoCustomerEmail?: string;
  instamojoCustomerPhone?: string;
  instamojoMessage?: string;
  instamojoVarUrl?: string;
  instamojoVarRefId?: string;
  instamojoVarStatus?: string;
  instamojoVarPaymentId?: string;
  zapierWebhookUrl?: string;
  zapierPayloadMode?: "all_variables" | "custom";
  zapierCustomPayload?: string;
  tapSecretKey?: string;
  tapAmount?: string;
  tapCurrency?: string;
  tapDescription?: string;
  tapCustomerName?: string;
  tapCustomerEmail?: string;
  tapCustomerPhone?: string;
  tapMessage?: string;
  tapVarUrl?: string;
  tapVarRefId?: string;
  tapVarStatus?: string;
  tapVarPaymentId?: string;
  noonBusinessId?: string;
  noonAppId?: string;
  noonAppKey?: string;
  noonSandbox?: boolean;
  noonCategory?: string;
  noonAmount?: string;
  noonCurrency?: string;
  noonDescription?: string;
  noonMessage?: string;
  noonVarUrl?: string;
  noonVarRefId?: string;
  noonVarStatus?: string;
  noonVarPaymentId?: string;
  [key: string]: unknown;
}

export interface AutomationFlowBuilderProps {
  automation?: any;
  channelId?: string;
  onClose: () => void;
  onDraftSaved?: () => void;
}

export interface Template {
  id: string;
  name: string;
  status: string;
  whatsappTemplateId?: string;
  variables?: string[];
}

export interface Member {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

export interface CustomEdgeProps {
  id: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  style?: React.CSSProperties;
  markerEnd?: string;
  setEdges: React.Dispatch<React.SetStateAction<any[]>>;
}
