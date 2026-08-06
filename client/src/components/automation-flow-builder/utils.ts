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

import { Node, Edge } from "@xyflow/react";
import { BuilderNodeData, NodeKind } from "./types";

export const uid = () =>
  `node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const defaultsByKind: Record<NodeKind, Partial<BuilderNodeData>> = {
  start: { kind: "start", label: "Start" },
  conditions: {
    kind: "conditions",
    label: "Conditions",
    conditionType: "keyword",
    keywords: [],
    matchType: "any",
  },
  custom_reply: {
    kind: "custom_reply",
    label: "Message",
    message: "",
    buttons: [],
  },
  send_contact_message: {
    kind: "send_contact_message",
    label: "Send to Contacts",
    message: "",
    targetContactIds: [],
    sendContactChannelId: "",
  },
  user_reply: {
    kind: "user_reply",
    label: "Question",
    question: "",
    saveAs: "",
    buttons: [
      { id: "answer1", text: "Answer 1", action: "next" },
      { id: "default", text: "Default", action: "next" },
    ],
  },
  time_gap: { kind: "time_gap", label: "Delay", delay: 60 },
  scheduler: {
    kind: "scheduler",
    label: "Scheduler",
    scheduleType: "duration",
    scheduleDays: 0,
    scheduleMinutes: 10,
    scheduleRecurring: false,
    scheduleInterval: "daily",
    scheduleRepeatTimes: 1,
    scheduleDate: ""
  },
  send_template: { kind: "send_template", label: "Template", templateId: "" },
  assign_user: { kind: "assign_user", label: "Assign User", assigneeId: "" },
  webhook: {
    kind: "webhook",
    label: "Webhook",
    webhookUrl: "",
    webhookMethod: "POST",
    webhookHeaders: {},
    webhookBody: "",
  },
  mysql: {
    kind: "mysql",
    label: "MySQL Query",
    mysqlHost: "",
    mysqlPort: "3306",
    mysqlUsername: "",
    mysqlPassword: "",
    mysqlDatabase: "",
    mysqlQuery: "",
    mysqlOutputVariable: "",
  },
  end: { kind: "end", label: "End", endMessage: "" },
  add_to_group: {
    kind: "add_to_group",
    label: "Add to Group",
    groupId: "",
    groupName: "",
  },
  update_contact: {
    kind: "update_contact",
    label: "Update Contact",
    contactField: "name",
    contactFieldValue: "",
  },
  delete_contact: {
    kind: "delete_contact",
    label: "Delete Contact",
  },
  set_variable: {
    kind: "set_variable",
    label: "Set Variable",
    variableName: "",
    variableValue: "",
    variableSource: "static",
  },
  send_location: {
    kind: "send_location",
    label: "Send Location",
    latitude: "",
    longitude: "",
    locationName: "",
    locationAddress: "",
  },
  send_list_message: {
    kind: "send_list_message",
    label: "List Message",
    message: "",
    listButtonText: "View Options",
    listSections: [
      {
        title: "Options",
        rows: [{ id: uid(), title: "Option 1", description: "" }],
      },
    ],
  },
  send_media: {
    kind: "send_media",
    label: "Send Media",
    mediaType: "image",
    mediaUrl: "",
    mediaCaption: "",
  },
  mark_as_read: {
    kind: "mark_as_read",
    label: "Mark as Read",
  },
  wait_read: {
    kind: "wait_read",
    label: "Wait for Read",
    timeoutMinutes: 0,
    timeoutOnlyAfterDelivered: false,
  },
  wait_reply: {
    kind: "wait_reply",
    label: "Wait Reply",
    saveAs: "",
  },
  ai_answer: {
    kind: "ai_answer",
    label: "AI Answer",
    aiConfigUseSettings: true,
    aiModel: "gpt-4o",
    aiSystemPrompt: "You are a helpful AI assistant. Answer the user's questions based on the context provided.",
    aiUseTrainingData: true,
    aiOutputVariable: "ai_response",
  },
  ai_agent: {
    kind: "ai_agent",
    label: "AI Agent",
    aiConfigUseSettings: true,
    aiModel: "gpt-4o",
    aiSystemPrompt: "You are a conversational AI Agent taking over this chat. Answer user questions and call custom functions/tools when needed.",
    aiUseTrainingData: true,
    aiTools: [],
  },
  razorpay_generate: {
    kind: "razorpay_generate",
    label: "RZP Generate",
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayMode: "generate_only",
    razorpayAmount: "",
    razorpayCurrency: "INR",
    razorpayCustomerName: "{{contact_name}}",
    razorpayCustomerEmail: "{{contact_email}}",
    razorpayCustomerPhone: "{{contact_phone}}",
    razorpayDescription: "Payment link",
    razorpayReceipt: "",
    razorpayMessage: "Hello {{contact_name}}, please pay by clicking this link: {{payment_url}}",
    razorpayVarUrl: "payment_url",
    razorpayVarRefId: "payment_ref_id",
    razorpayVarStatus: "payment_status",
    razorpayVarPaymentId: "payment_id",
  },
  razorpay_verify: {
    kind: "razorpay_verify",
    label: "RZP Verify",
    razorpayKeyId: "",
    razorpayKeySecret: "",
    razorpayRefId: "{{payment_ref_id}}",
    razorpayVarStatus: "payment_status",
    razorpayVarPaymentId: "payment_id",
  },
  instamojo_payment: {
    kind: "instamojo_payment",
    label: "Instamojo Pay",
    instamojoApiKey: "",
    instamojoAuthToken: "",
    instamojoSandbox: false,
    instamojoAmount: "",
    instamojoPurpose: "Payment Request",
    instamojoCustomerName: "{{contact_name}}",
    instamojoCustomerEmail: "{{contact_email}}",
    instamojoCustomerPhone: "{{contact_phone}}",
    instamojoMessage: "Hello {{contact_name}}, please complete your payment of {{amount}} here: {{payment_url}}",
    instamojoVarUrl: "payment_url",
    instamojoVarRefId: "payment_ref_id",
    instamojoVarStatus: "payment_status",
    instamojoVarPaymentId: "payment_id",
  },
  zapier: {
    kind: "zapier",
    label: "Zapier",
    zapierWebhookUrl: "",
    zapierPayloadMode: "all_variables",
    zapierCustomPayload: "",
  },
  tap_payment: {
    kind: "tap_payment",
    label: "Tap Payment",
    tapSecretKey: "",
    tapAmount: "",
    tapCurrency: "SAR",
    tapDescription: "Payment Request",
    tapCustomerName: "{{contact_name}}",
    tapCustomerEmail: "{{contact_email}}",
    tapCustomerPhone: "{{contact_phone}}",
    tapMessage: "Hello {{contact_name}}, please complete your payment of {{amount}} {{currency}} here: {{payment_url}}",
    tapVarUrl: "payment_url",
    tapVarRefId: "payment_ref_id",
    tapVarStatus: "payment_status",
    tapVarPaymentId: "payment_id",
  },
  noon_payment: {
    kind: "noon_payment",
    label: "Noon Pay",
    noonBusinessId: "",
    noonAppId: "",
    noonAppKey: "",
    noonSandbox: false,
    noonCategory: "pay_by_link",
    noonAmount: "",
    noonCurrency: "SAR",
    noonDescription: "Payment Request",
    noonMessage: "Hello {{contact_name}}, please complete your payment of {{amount}} {{currency}} here: {{payment_url}}",
    noonVarUrl: "payment_url",
    noonVarRefId: "payment_ref_id",
    noonVarStatus: "payment_status",
    noonVarPaymentId: "payment_id",
  },
};

export function transformAutomationToFlow(automation: any): {
  nodes: Node<BuilderNodeData>[];
  edges: Edge[];
} {
  if (!automation || !automation.automation_nodes) {
    return {
      nodes: [
        {
          id: "start",
          type: "start",
          position: { x: 200, y: 40 },
          data: { ...(defaultsByKind.start as BuilderNodeData) },
        },
      ],
      edges: [],
    };
  }

  const nodes: Node<BuilderNodeData>[] = [
    {
      id: "start",
      type: "start",
      position: { x: 200, y: 40 },
      data: { ...(defaultsByKind.start as BuilderNodeData) },
    },
  ];

  const sortedNodes = [...automation.automation_nodes].sort(
    (a: any, b: any) => a.position - b.position
  );

  sortedNodes.forEach((autoNode: any, index: number) => {
    const nodeData: BuilderNodeData = {
      kind: autoNode.type as NodeKind,
      label: defaultsByKind[autoNode.type as NodeKind]?.label || autoNode.type,
      ...autoNode.data,
    };

    const reactFlowNode: Node<BuilderNodeData> = {
      id: autoNode.nodeId,
      type: autoNode.type,
      position:
        autoNode.position &&
        autoNode.position.x !== undefined &&
        autoNode.position.y !== undefined
          ? { x: autoNode.position.x, y: autoNode.position.y }
          : { x: 200, y: 140 + index * 140 },
      data: nodeData,
    };

    nodes.push(reactFlowNode);
  });

  const edges: Edge[] = [];
  const edgeSet = new Set<string>();

  if (automation.automation_edges && automation.automation_edges.length > 0) {
    automation.automation_edges.forEach((edge: any) => {
      const source = edge.source || edge.sourceNodeId;
      const target = edge.target || edge.targetNodeId;

      if (!source || !target) return;

      const edgeKey = `${source}-${target}`;

      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: edge.id || `edge-${source}-${target}`,
          source: source,
          target: target,
          sourceHandle: edge.sourceHandle || undefined,
          type: "custom",
          animated: true,
        });
      }
    });
  } else {
    let previousNodeId = "start";
    sortedNodes.forEach((autoNode: any) => {
      const edgeKey = `${previousNodeId}-${autoNode.nodeId}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({
          id: `edge-${previousNodeId}-${autoNode.nodeId}`,
          source: previousNodeId,
          target: autoNode.nodeId,
          type: "custom",
          animated: true,
        });
      }
      previousNodeId = autoNode.nodeId;
    });
  }

  return { nodes, edges };
}

export function validateNodeConfig(node: any): string | null {
  const data = node.data || {};
  const kind = node.type || data.kind;
  const label = data.label || kind;

  switch (kind) {
    case "conditions":
      if (data.conditionType === "keyword" && (!data.keywords || data.keywords.length === 0)) {
        return `Node "${label}" (Conditions) requires at least one keyword.`;
      }
      break;
    case "custom_reply":
      if (!data.message?.trim() && !data.imageFile && !data.videoFile && !data.audioFile && !data.documentFile) {
        return `Node "${label}" (Message) requires a message text or an uploaded file.`;
      }
      break;
    case "user_reply":
      if (!data.question?.trim()) {
        return `Node "${label}" (Question) requires a question text.`;
      }
      if (!data.saveAs?.trim()) {
        return `Node "${label}" (Question) requires a variable name to save the answer in.`;
      }
      break;
    case "time_gap":
      if (data.delay === undefined || data.delay === null || Number(data.delay) <= 0) {
        return `Node "${label}" (Delay) requires a positive delay duration in seconds.`;
      }
      break;
    case "scheduler":
      if (data.scheduleType === "date" && !data.scheduleDate) {
        return `Node "${label}" (Scheduler) requires a target date and time.`;
      }
      if (data.scheduleType === "duration") {
        const days = Number(data.scheduleDays || 0);
        const mins = Number(data.scheduleMinutes || 0);
        if (days <= 0 && mins <= 0) {
          return `Node "${label}" (Scheduler) requires a duration greater than 0 minutes.`;
        }
      }
      break;
    case "send_template":
      if (!data.templateId) {
        return `Node "${label}" (Template) requires a template selection.`;
      }
      break;
    case "webhook":
      if (!data.webhookUrl?.trim()) {
        return `Node "${label}" (Webhook) requires a target URL.`;
      }
      break;
    case "send_media":
      if (!data.mediaUrl?.trim() && !data.mediaId) {
        return `Node "${label}" (Send Media) requires a media URL or file upload.`;
      }
      break;
    default:
      break;
  }
  return null;
}
