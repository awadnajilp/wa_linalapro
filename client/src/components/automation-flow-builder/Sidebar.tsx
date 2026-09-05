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

import {
  MessageCircle,
  HelpCircle,
  GitBranch,
  Clock,
  FileText,
  Users,
  Globe,
  CircleStop,
  UserPlus,
  UserCog,
  UserX,
  Variable,
  MapPin,
  List,
  Paperclip,
  CheckCheck,
  Info,
  MessageSquare,
  Database,
  Brain,
  Bot,
  Sparkles,
  Calendar,
  Shuffle,
  CreditCard,
  ShieldCheck,
  Zap,
  BadgeDollarSign
} from "lucide-react";
import { NodeKind } from "./types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  onAddNode: (kind: NodeKind) => void;
  isQrChannel?: boolean;
  onDragStart?: (event: React.DragEvent, kind: NodeKind) => void;
}

const nodeCategories = [
  {
    label: "Messages",
    items: [
      {
        kind: "custom_reply" as NodeKind,
        name: "Send Message",
        icon: MessageCircle,
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        tip: "Send a text message, image, video, or button reply to the customer. Use this for greetings, confirmations, or any direct communication.",
      },
      {
        kind: "send_contact_message" as NodeKind,
        name: "Send to Contacts",
        icon: Users,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        tip: "Send a custom text message to one or more selected contacts from your list. Variables from the flow are interpolated dynamically.",
      },
      {
        kind: "user_reply" as NodeKind,
        name: "Ask Question",
        icon: HelpCircle,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        tip: "Ask the customer a question and wait for their reply. The response is saved in a variable you can use in later steps (e.g., collect name, order ID).",
      },
      {
        kind: "send_template" as NodeKind,
        name: "Template",
        icon: FileText,
        color: "text-teal-600",
        bg: "bg-teal-50",
        border: "border-teal-200",
        tip: "Send a pre-approved WhatsApp template message. Required when the 24-hour messaging window has expired. Select from your approved templates.",
      },
      {
        kind: "send_list_message" as NodeKind,
        name: "List Msg",
        icon: List,
        color: "text-sky-600",
        bg: "bg-sky-50",
        border: "border-sky-200",
        tip: "Send an interactive list with clickable options organized in sections. Great for menus, product catalogs, or multi-choice selections (up to 10 items).",
      },
      {
        kind: "send_media" as NodeKind,
        name: "Media",
        icon: Paperclip,
        color: "text-pink-600",
        bg: "bg-pink-50",
        border: "border-pink-200",
        tip: "Send an image, video, audio, or document file via URL. Add an optional caption. Use for product photos, brochures, invoices, or audio messages.",
      },
      {
        kind: "send_location" as NodeKind,
        name: "Location",
        icon: MapPin,
        color: "text-rose-600",
        bg: "bg-rose-50",
        border: "border-rose-200",
        tip: "Send a GPS location pin with an optional name and address. Perfect for sharing store locations, delivery points, or meeting spots.",
      },
      {
        kind: "whatsapp_flow" as NodeKind,
        name: "WhatsApp Flow",
        icon: Sparkles,
        color: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-200",
        tip: "Send an interactive native Meta WhatsApp Flow form (lead generation, feedback, booking, surveys) and capture submitted responses.",
      },
    ],
  },
  {
    label: "Logic & Flow",
    items: [
      {
        kind: "conditions" as NodeKind,
        name: "Condition",
        icon: GitBranch,
        color: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-200",
        tip: "Branch the flow based on keywords or rules. Check if the customer's message contains, equals, or starts with specific words to route them down different paths.",
      },
      {
        kind: "time_gap" as NodeKind,
        name: "Delay",
        icon: Clock,
        color: "text-slate-600",
        bg: "bg-slate-100",
        border: "border-slate-200",
        tip: "Pause the flow for a set duration before continuing to the next step. Use for spacing out messages or waiting before follow-ups (seconds to hours).",
      },
      {
        kind: "scheduler" as NodeKind,
        name: "Scheduler",
        icon: Calendar,
        color: "text-rose-600",
        bg: "bg-rose-50",
        border: "border-rose-200",
        tip: "Schedule the flow to run from this point onwards after a set date and time, or after a relative period (e.g. days/minutes). Can optionally be configured as recurring.",
      },
      {
        kind: "set_variable" as NodeKind,
        name: "Variable",
        icon: Variable,
        color: "text-violet-600",
        bg: "bg-violet-50",
        border: "border-violet-200",
        tip: "Store a value for use in later steps. Set from a static value, the customer's last message, or a webhook response. Use {{varName}} in text fields to insert it.",
      },
      {
        kind: "wait_reply" as NodeKind,
        name: "Wait Reply",
        icon: MessageSquare,
        color: "text-amber-500",
        bg: "bg-amber-50",
        border: "border-amber-200",
        tip: "Pause the flow until the customer sends a new message. You can optionally save their reply into a custom variable.",
      },
      {
        kind: "wait_read" as NodeKind,
        name: "Wait for Read",
        icon: CheckCheck,
        color: "text-blue-500",
        bg: "bg-blue-50",
        border: "border-blue-200",
        tip: "Pause the flow until the customer reads the previous message sent.",
      },
      {
        kind: "ai_answer" as NodeKind,
        name: "AI Answer",
        icon: Sparkles,
        color: "text-purple-600",
        bg: "bg-purple-50",
        border: "border-purple-200",
        tip: "Connect to AI (GPT/Gemini) to generate a one-off response and save it in a variable.",
      },
      {
        kind: "ai_agent" as NodeKind,
        name: "AI Agent",
        icon: Bot,
        color: "text-fuchsia-600",
        bg: "bg-fuchsia-50",
        border: "border-fuchsia-200",
        tip: "Activate continuous 2-way AI conversation with custom tools (function calling) and flow routing.",
      },
    ],
  },
  {
    label: "Actions",
    items: [
      {
        kind: "assign_user" as NodeKind,
        name: "Assign",
        icon: Users,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        tip: "Route the conversation to a specific team member or agent. Use after qualifying a lead or when human intervention is needed.",
      },
      {
        kind: "route_crm_round_robin" as NodeKind,
        name: "CRM Round Robin",
        icon: Shuffle,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        tip: "Route lead to CRM pipeline & assign to next online team member via round-robin distribution.",
      },
      {
        kind: "create_crm_deal" as NodeKind,
        name: "Create CRM Deal",
        icon: BadgeDollarSign,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        tip: "Create a deal/lead in CRM pipeline, set deal value & title, and assign to a team member or round-robin.",
      },
      {
        kind: "webhook" as NodeKind,
        name: "Webhook",
        icon: Globe,
        color: "text-orange-600",
        bg: "bg-orange-50",
        border: "border-orange-200",
        tip: "Call an external API or webhook URL. Send data from the conversation and use the response in subsequent steps. Great for CRM updates, order lookups, or integrations.",
      },
      {
        kind: "mysql" as NodeKind,
        name: "MySQL Query",
        icon: Database,
        color: "text-teal-600",
        bg: "bg-teal-50",
        border: "border-teal-200",
        tip: "Execute queries on an external MySQL database to save, update, or retrieve data. Dynamic variables can be safely interpolated into your queries.",
      },
      {
        kind: "mark_as_read" as NodeKind,
        name: "Read",
        icon: CheckCheck,
        color: "text-lime-600",
        bg: "bg-lime-50",
        border: "border-lime-200",
        tip: "Mark the customer's message as read (blue ticks) and reset the unread counter. Use to acknowledge receipt before processing.",
      },
      {
        kind: "end" as NodeKind,
        name: "End",
        icon: CircleStop,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        tip: "Stop the automation flow here. No further nodes will execute after this point. Use to cleanly terminate a conversation path.",
      },
    ],
  },
  {
    label: "Contacts",
    items: [
      {
        kind: "add_to_group" as NodeKind,
        name: "Add to CRM List",
        icon: UserPlus,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        tip: "Add the contact to a specific CRM list for segmentation. Use to tag leads, customers, or interests for targeted campaigns later.",
      },
      {
        kind: "update_contact" as NodeKind,
        name: "Update",
        icon: UserCog,
        color: "text-cyan-600",
        bg: "bg-cyan-50",
        border: "border-cyan-200",
        tip: "Update contact details like name, email, notes, or tags. Supports {{variables}} so you can save collected info (e.g., set name from a question response).",
      },
      {
        kind: "delete_contact" as NodeKind,
        name: "Delete",
        icon: UserX,
        color: "text-rose-600",
        bg: "bg-rose-50",
        border: "border-rose-200",
        tip: "Remove the contact from the CRM contacts directory. Recommended for Unsubscribe, Stop, or Opt-out flows.",
      },
    ],
  },
  {
    label: "Payments",
    items: [
      {
        kind: "razorpay_generate" as NodeKind,
        name: "RZP Generate",
        icon: CreditCard,
        color: "text-blue-600",
        bg: "bg-blue-50/50",
        border: "border-blue-200",
        tip: "Generate a Razorpay payment link with custom amount, currency, and customer details, then save the payment URL and reference ID to variables.",
      },
      {
        kind: "razorpay_verify" as NodeKind,
        name: "RZP Verify",
        icon: ShieldCheck,
        color: "text-emerald-600",
        bg: "bg-emerald-50/50",
        border: "border-emerald-200",
        tip: "Verify a Razorpay payment status using its reference ID or payment link ID, and branch the flow based on whether it is paid.",
      },
      {
        kind: "instamojo_payment" as NodeKind,
        name: "Instamojo Pay",
        icon: CreditCard,
        color: "text-purple-600",
        bg: "bg-purple-50/50",
        border: "border-purple-200",
        tip: "Create an Instamojo payment link with customizable credentials, send it via WhatsApp, and branch execution down Paid and Unpaid handles.",
      },
      {
        kind: "tap_payment" as NodeKind,
        name: "Tap Payments",
        icon: CreditCard,
        color: "text-rose-600",
        bg: "bg-rose-50/50",
        border: "border-rose-200",
        tip: "Create a Tap Payments checkout link (GCC/KSA) with customizable credentials, send it via WhatsApp, and branch execution down Paid and Unpaid handles.",
      },
      {
        kind: "noon_payment" as NodeKind,
        name: "Noon Pay",
        icon: CreditCard,
        color: "text-yellow-600",
        bg: "bg-yellow-50/50",
        border: "border-yellow-200",
        tip: "Create a Noon Payments checkout link (GCC/KSA/Egypt) with customizable credentials, send it via WhatsApp, and branch execution down Paid and Unpaid handles.",
      },
    ],
  },
  {
    label: "Integrations",
    items: [
      {
        kind: "zapier" as NodeKind,
        name: "Zapier",
        icon: Zap,
        color: "text-orange-600",
        bg: "bg-orange-50/50",
        border: "border-orange-200",
        tip: "Trigger a Zapier automation by sending variables or custom payloads to a Zapier Webhook URL.",
      },
    ],
  },
];

export function Sidebar({ onAddNode, isQrChannel, onDragStart }: SidebarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="col-span-2 bg-white flex flex-col border-r border-gray-200 overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-200">
          <div className="font-semibold text-xs text-gray-900">Flow Nodes</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Click or Drag to add · hover <Info className="w-2.5 h-2.5 inline" /> for help</div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2.5">
          {nodeCategories.map((category) => (
            <div key={category.label}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 px-0.5">
                {category.label}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {category.items.filter(item => !(isQrChannel && ["send_template", "send_list_message"].includes(item.kind))).map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.kind} className="relative">
                      <button
                        onClick={() => onAddNode(item.kind)}
                        draggable
                        onDragStart={(e) => onDragStart?.(e, item.kind)}
                        className={`w-full flex flex-col items-center gap-1.5 px-2 py-3 rounded-lg border ${item.border} ${item.bg} hover:shadow-sm transition-all duration-150 cursor-pointer active:scale-95`}
                      >
                        <Icon className={`w-5 h-5 ${item.color}`} />
                        <span className="text-[10px] font-medium text-gray-600 leading-tight text-center w-full">
                          {item.name}
                        </span>
                      </button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-white/80 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[220px] text-xs leading-relaxed p-3">
                          <p className="font-semibold mb-1">{item.name}</p>
                          <p className="text-gray-500">{item.tip}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
