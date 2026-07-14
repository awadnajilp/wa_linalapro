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

import { Handle, Position } from "@xyflow/react";
import {
  Zap,
  GitBranch,
  MessageCircle,
  HelpCircle,
  Clock,
  FileText,
  Users,
  Video,
  FileAudio,
  FileIcon,
  Globe,
  CircleStop,
  Image,
  UserPlus,
  UserCog,
  Variable,
  MapPin,
  List,
  Paperclip,
  CheckCheck,
  MessageSquare,
  Database,
  Brain,
  Copy,
  Bot,
  Calendar,
} from "lucide-react";
import { BuilderNodeData } from "./types";

function NodeShell({
  children,
  icon,
  title,
  color,
  bgColor,
  borderColor,
  selected,
}: {
  children?: React.ReactNode;
  icon: React.ReactNode;
  title: string;
  color: string;
  bgColor: string;
  borderColor: string;
  selected?: boolean;
}) {
  return (
    <div
      className={`rounded-xl bg-white shadow-md min-w-[240px] max-w-[280px] transition-all duration-200 border relative ${
        selected
          ? "border-blue-400 ring-2 ring-blue-100"
          : "border-gray-200 hover:shadow-lg"
      }`}
    >
      <div className={`flex items-center gap-2.5 px-3.5 py-2.5 ${bgColor} border-b ${borderColor} rounded-t-xl`}>
        <div className={`w-7 h-7 rounded-lg bg-white/80 flex items-center justify-center ${color} shrink-0`}>
          {icon}
        </div>
        <span className={`font-semibold text-xs ${color}`}>{title}</span>
      </div>
      {children && (
        <div className="px-3.5 py-2.5 text-xs text-gray-600 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}

export function StartNode() {
  return (
    <div className="relative flex flex-col items-center">
      <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white shadow-md border-2 border-white">
        <Zap className="w-6 h-6" />
      </div>
      <div className="mt-1.5 px-2.5 py-0.5 bg-white rounded-full shadow-sm border border-gray-200">
        <span className="text-[10px] font-semibold text-green-700 uppercase">Start</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function ConditionsNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<GitBranch className="w-4 h-4" />}
        title="Condition"
        color="text-purple-700"
        bgColor="bg-purple-50"
        borderColor="border-purple-100"
        selected={selected}
      >
        {data.conditionType === "keyword" && data.keywords && data.keywords.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {data.keywords.slice(0, 3).map((kw, i) => (
              <span key={i} className="bg-purple-50 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-medium">
                {kw}
              </span>
            ))}
            {data.keywords.length > 3 && (
              <span className="text-purple-400 text-[10px]">+{data.keywords.length - 3}</span>
            )}
          </div>
        ) : data.conditionType === "variable" && data.keywords && data.keywords.length > 0 ? (
          <div className="bg-purple-50/50 text-purple-700 text-[10px] p-1.5 rounded font-mono border border-purple-100/50 break-all leading-normal">
            {data.keywords[0]}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No conditions set</div>
        )}
        {data.matchType && data.conditionType !== "variable" && (
          <div className="text-[10px] text-purple-600 font-medium">
            Match: {data.matchType}
          </div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} id="condition-true" className="!bg-green-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" style={{ left: '35%' }} />
      <Handle type="source" position={Position.Bottom} id="condition-false" className="!bg-red-400 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" style={{ left: '65%' }} />
      <div className="flex justify-between px-4 -mt-0.5">
        <span className="text-[8px] font-semibold text-green-600 uppercase">Yes</span>
        <span className="text-[8px] font-semibold text-red-400 uppercase">No</span>
      </div>
    </div>
  );
}

export function CustomReplyNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  const hasButtons = data.buttons && data.buttons.length > 0;
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<MessageCircle className="w-4 h-4" />}
        title="Send Message"
        color="text-blue-700"
        bgColor="bg-blue-50"
        borderColor="border-blue-100"
        selected={selected}
      >
        {data.message ? (
          <p className="line-clamp-2 text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-100">
            {data.message.length > 80 ? `${data.message.slice(0, 80)}...` : data.message}
          </p>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No message set</div>
        )}

        <div className="flex flex-wrap gap-1">
          {data.imagePreview && (
            <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-medium">
              <Image className="w-2.5 h-2.5" /> Image
            </span>
          )}
          {data.videoPreview && (
            <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-medium">
              <Video className="w-2.5 h-2.5" /> Video
            </span>
          )}
          {data.audioPreview && (
            <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-medium">
              <FileAudio className="w-2.5 h-2.5" /> Audio
            </span>
          )}
          {data.documentPreview && (
            <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-medium">
              <FileIcon className="w-2.5 h-2.5" /> Doc
            </span>
          )}
        </div>

        {hasButtons && (
          <div className="flex justify-around gap-2 pt-2 border-t border-gray-100 relative">
            {data.buttons!.map((btn) => (
              <div key={btn.id} className="relative flex flex-col items-center pb-1">
                <span className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5 rounded font-medium border border-blue-100">
                  {btn.text}
                </span>
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id={btn.id}
                  className="!bg-blue-500 !w-2.5 !h-2.5 !border-2 !border-white !shadow-sm"
                  style={{ bottom: '-15px' }}
                />
              </div>
            ))}
          </div>
        )}
      </NodeShell>
      {!hasButtons && (
        <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
      )}
    </div>
  );
}

export function UserReplyNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  const hasButtons = data.buttons && data.buttons.length > 0;
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<HelpCircle className="w-4 h-4" />}
        title="Ask Question"
        color="text-amber-700"
        bgColor="bg-amber-50"
        borderColor="border-amber-100"
        selected={selected}
      >
        {data.question ? (
          <p className="line-clamp-2 text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-100">
            {data.question.length > 80 ? `${data.question.slice(0, 80)}...` : data.question}
          </p>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No question set</div>
        )}
        {data.saveAs && (
          <div className="text-[10px] text-amber-600 font-medium font-mono">
            ${data.saveAs}
          </div>
        )}
        {hasButtons && (
          <div className="flex justify-around gap-2 pt-2 border-t border-gray-100 relative">
            {data.buttons!.map((btn) => (
              <div key={btn.id} className="relative flex flex-col items-center pb-1">
                <span className="bg-amber-50 text-amber-700 text-[10px] px-2 py-0.5 rounded font-medium border border-amber-200">
                  {btn.text}
                </span>
                <Handle
                  type="source"
                  position={Position.Bottom}
                  id={btn.id}
                  className="!bg-amber-500 !w-2.5 !h-2.5 !border-2 !border-white !shadow-sm"
                  style={{ bottom: '-15px' }}
                />
              </div>
            ))}
          </div>
        )}
      </NodeShell>
      {!hasButtons && (
        <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
      )}
    </div>
  );
}

export function TimeGapNode({ data }: { data: BuilderNodeData }) {
  const seconds = data.delay ?? 0;
  const display = seconds >= 3600
    ? `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
    : seconds >= 60
    ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    : `${seconds}s`;
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-slate-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Clock className="w-4 h-4" />}
        title="Wait / Delay"
        color="text-slate-700"
        bgColor="bg-slate-50"
        borderColor="border-slate-200"
      >
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
          <span className="text-lg font-bold text-slate-700">{display}</span>
          <span className="text-[10px] text-gray-400 font-medium uppercase">pause</span>
        </div>
      </NodeShell>
    </div>
  );
}

export function SchedulerNode({ data }: { data: BuilderNodeData }) {
  const type = data.scheduleType || "duration";
  const days = Number(data.scheduleDays || 0);
  const minutes = Number(data.scheduleMinutes || 0);
  const dateStr = data.scheduleDate || "";
  const recurring = !!data.scheduleRecurring;
  const interval = data.scheduleInterval || "daily";

  let display = "";
  if (type === "date") {
    display = dateStr ? new Date(dateStr).toLocaleString() : "Date not set";
  } else {
    display = `${days}d ${minutes}m`;
  }

  if (recurring) {
    const repeatTimes = data.scheduleRepeatTimes !== undefined ? Number(data.scheduleRepeatTimes) : 1;
    display += ` (Every ${interval}, x${repeatTimes})`;
  }

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Calendar className="w-4 h-4" />}
        title="Scheduler"
        color="text-rose-700"
        bgColor="bg-rose-50"
        borderColor="border-rose-200"
      >
        <div className="flex flex-col gap-1 bg-white rounded-lg p-2 border border-gray-100 min-w-[120px]">
          <span className="text-xs font-semibold text-rose-700">{display}</span>
          <span className="text-[9px] text-gray-400 font-medium uppercase">
            {type === "date" ? "Specific Date" : "Relative Period"}
          </span>
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendTemplateNode({ data }: { data: BuilderNodeData }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<FileText className="w-4 h-4" />}
        title="Send Template"
        color="text-teal-700"
        bgColor="bg-teal-50"
        borderColor="border-teal-100"
      >
        {data.templateId ? (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
            <FileText className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-[11px] text-gray-600 font-medium">Template selected</span>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No template selected</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function AssignUserNode({ data }: { data: BuilderNodeData }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Users className="w-4 h-4" />}
        title="Assign Agent"
        color="text-indigo-700"
        bgColor="bg-indigo-50"
        borderColor="border-indigo-100"
      >
        {data.assigneeId ? (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[11px] text-gray-600 font-medium">Agent assigned</span>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No agent selected</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function WebhookNode({ data }: { data: BuilderNodeData }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Globe className="w-4 h-4" />}
        title="Webhook"
        color="text-orange-700"
        bgColor="bg-orange-50"
        borderColor="border-orange-100"
      >
        {data.webhookUrl ? (
          <div className="space-y-1.5">
            <span className="inline-block bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
              {data.webhookMethod || "POST"}
            </span>
            <div className="text-[11px] text-gray-500 truncate bg-gray-50 rounded px-2 py-1 font-mono border border-gray-100">{data.webhookUrl}</div>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No webhook configured</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function MySQLNode({ data }: { data: BuilderNodeData }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Database className="w-4 h-4" />}
        title="MySQL Query"
        color="text-teal-700"
        bgColor="bg-teal-50"
        borderColor="border-teal-100"
      >
        {data.mysqlQuery ? (
          <div className="space-y-1">
            <div className="text-[11px] text-gray-500 truncate bg-gray-50 rounded px-2 py-1 font-mono border border-gray-100">
              {data.mysqlHost 
                ? `${data.mysqlUsername || "root"}@${data.mysqlHost}:${data.mysqlPort || "3306"}`
                : "Default Hosted DB"
              }
            </div>
            <pre className="text-[10px] text-gray-600 bg-gray-50 rounded p-1 max-h-[60px] overflow-hidden truncate font-mono border border-gray-100">
              {data.mysqlQuery}
            </pre>
            {data.mysqlOutputVariable && (
              <div className="text-[10px] text-teal-700 font-medium">
                Output: <code className="font-mono bg-teal-100/50 px-1 py-0.2 rounded">{data.mysqlOutputVariable}</code>
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No query configured</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-teal-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function EndNode({ data }: { data: BuilderNodeData }) {
  return (
    <div className="relative flex flex-col items-center">
      <Handle type="target" position={Position.Top} className="!bg-red-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-white shadow-md border-2 border-white">
        <CircleStop className="w-6 h-6" />
      </div>
      <div className="mt-1.5 px-2.5 py-0.5 bg-white rounded-full shadow-sm border border-gray-200">
        <span className="text-[10px] font-semibold text-red-700 uppercase">{data.endMessage || "End"}</span>
      </div>
    </div>
  );
}

export function AddToGroupNode({ data }: { data: BuilderNodeData }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<UserPlus className="w-4 h-4" />}
        title="Add to Group"
        color="text-emerald-700"
        bgColor="bg-emerald-50"
        borderColor="border-emerald-100"
      >
        {data.groupName ? (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] text-gray-600 font-medium truncate">{data.groupName}</span>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No group selected</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function UpdateContactNode({ data }: { data: BuilderNodeData }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<UserCog className="w-4 h-4" />}
        title="Update Contact"
        color="text-cyan-700"
        bgColor="bg-cyan-50"
        borderColor="border-cyan-100"
      >
        {data.contactField ? (
          <div className="space-y-1">
            <span className="inline-block bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded text-[10px] font-bold capitalize">
              {data.contactField}
            </span>
            {data.contactFieldValue && (
              <div className="text-[11px] text-gray-500 truncate bg-gray-50 rounded px-2 py-1 border border-gray-100">
                {data.contactFieldValue}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No field configured</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SetVariableNode({ data }: { data: BuilderNodeData }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Variable className="w-4 h-4" />}
        title="Set Variable"
        color="text-violet-700"
        bgColor="bg-violet-50"
        borderColor="border-violet-100"
      >
        {data.variableName ? (
          <div className="space-y-1">
            <div className="text-[10px] text-violet-600 font-medium font-mono">
              ${data.variableName}
            </div>
            {data.variableValue && (
              <div className="text-[11px] text-gray-500 truncate bg-gray-50 rounded px-2 py-1 border border-gray-100">
                = {data.variableValue}
              </div>
            )}
            {data.variableSource && data.variableSource !== "static" && (
              <span className="inline-block bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                {data.variableSource === "from_message" ? "From Message" : "From Webhook"}
              </span>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No variable set</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-violet-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendLocationNode({ data }: { data: BuilderNodeData }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<MapPin className="w-4 h-4" />}
        title="Send Location"
        color="text-rose-700"
        bgColor="bg-rose-50"
        borderColor="border-rose-100"
      >
        {data.locationName || (data.latitude && data.longitude) ? (
          <div className="space-y-1">
            {data.locationName && (
              <div className="text-[11px] text-gray-700 font-medium">{data.locationName}</div>
            )}
            {data.latitude && data.longitude && (
              <div className="text-[10px] text-gray-400 font-mono bg-gray-50 rounded px-2 py-1 border border-gray-100">
                {data.latitude}, {data.longitude}
              </div>
            )}
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No location set</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-rose-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendListMessageNode({ data }: { data: BuilderNodeData }) {
  const totalRows = (data.listSections || []).reduce((sum, s) => sum + (s.rows?.length || 0), 0);
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<List className="w-4 h-4" />}
        title="List Message"
        color="text-sky-700"
        bgColor="bg-sky-50"
        borderColor="border-sky-100"
      >
        {data.message ? (
          <p className="line-clamp-2 text-[11px] text-gray-600 bg-gray-50 rounded-lg p-2 border border-gray-100">
            {data.message.length > 60 ? `${data.message.slice(0, 60)}...` : data.message}
          </p>
        ) : (
          <div className="text-gray-400 italic text-[11px]">No body text</div>
        )}
        <div className="flex items-center gap-2">
          <span className="inline-block bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
            {data.listSections?.length || 0} sections
          </span>
          <span className="text-[10px] text-gray-400">{totalRows} items</span>
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-sky-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendMediaNode({ data }: { data: BuilderNodeData }) {
  const mediaLabel = data.mediaType ? data.mediaType.charAt(0).toUpperCase() + data.mediaType.slice(1) : "Media";
  const sourceUrl = data.mediaUrl || (data.mediaId && data.mediaId.startsWith("http") ? data.mediaId : null);

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Paperclip className="w-4 h-4" />}
        title="Send Media"
        color="text-pink-700"
        bgColor="bg-pink-50"
        borderColor="border-pink-100"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-block bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
              {mediaLabel}
            </span>
          </div>

          {sourceUrl ? (
            <div className="rounded border border-pink-100 overflow-hidden bg-gray-50 flex items-center justify-center max-h-[80px] w-full">
              {data.mediaType === "image" && (
                <img src={sourceUrl} alt="Preview" className="h-[80px] w-full object-cover" />
              )}
              {data.mediaType === "video" && (
                <video src={sourceUrl} className="h-[80px] w-full object-cover" muted />
              )}
              {data.mediaType === "audio" && (
                <div className="p-2 w-full text-center text-[10px] text-pink-600 font-medium">🎵 Audio Note</div>
              )}
              {data.mediaType === "document" && (
                <div className="p-2 w-full flex items-center gap-1.5 text-[10px] text-pink-600 font-medium truncate">
                  <FileIcon className="w-3.5 h-3.5" /> {data.mediaFileName || "Document"}
                </div>
              )}
            </div>
          ) : data.mediaId ? (
            <div className="text-[10px] text-pink-700 font-medium truncate bg-pink-50/50 border border-pink-100 rounded px-1.5 py-0.5">
              Media ID: {data.mediaId}
            </div>
          ) : (
            <div className="text-gray-400 italic text-[10px]">No media configured</div>
          )}

          {data.mediaCaption && (
            <p className="text-[9px] text-gray-400 truncate max-w-[180px]">{data.mediaCaption}</p>
          )}
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-pink-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function SendContactMessageNode({ data }: { data: BuilderNodeData }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Users className="w-4 h-4" />}
        title={data.label || "Send to Contacts"}
        color="text-indigo-600"
        bgColor="bg-indigo-50/50"
        borderColor="border-indigo-100"
      >
        <div className="space-y-1">
          <p className="text-[10px] text-gray-400 uppercase font-medium">Recipient Contacts</p>
          <p className="text-gray-700 font-medium truncate">
            {data.targetContactIds && data.targetContactIds.length > 0
              ? `${data.targetContactIds.length} contact(s) selected`
              : "No contacts selected"}
          </p>
        </div>
        {data.message && (
          <div className="mt-1.5 border-t border-gray-100 pt-1.5">
            <p className="text-[10px] text-gray-400 uppercase font-medium">Message</p>
            <p className="text-gray-600 line-clamp-2 italic">"{data.message}"</p>
          </div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function MarkAsReadNode() {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-lime-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<CheckCheck className="w-4 h-4" />}
        title="Mark as Read"
        color="text-lime-700"
        bgColor="bg-lime-50"
        borderColor="border-lime-100"
      >
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
          <CheckCheck className="w-3.5 h-3.5 text-lime-600" />
          <span className="text-[11px] text-gray-600 font-medium">Send read receipts</span>
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-lime-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function WaitReplyNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<MessageSquare className="w-4 h-4" />}
        title="Wait for Reply"
        color="text-amber-700"
        bgColor="bg-amber-50"
        borderColor="border-amber-100"
        selected={selected}
      >
        {data.saveAs ? (
          <div className="flex items-center gap-1.5 bg-amber-100/50 rounded px-2 py-1 border border-amber-200/50 text-[11px] text-amber-800">
            <span>Save reply to:</span>
            <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded shadow-sm">
              {data.saveAs}
            </code>
          </div>
        ) : (
          <div className="text-gray-400 italic text-[11px]">Just pause & wait for reply</div>
        )}
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function AIAnswerNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Brain className="w-4 h-4" />}
        title="AI Answer"
        color="text-purple-700"
        bgColor="bg-purple-50"
        borderColor="border-purple-100"
        selected={selected}
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="font-semibold text-gray-700">Model:</span>
            <span>{data.aiModel || "gpt-4o"}</span>
          </div>
          <div className="text-[10px] text-gray-500 truncate">
            <span className="font-semibold text-gray-700">Output:</span>{" "}
            <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">
              {data.aiOutputVariable || "ai_response"}
            </code>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${data.aiConfigUseSettings ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
              {data.aiConfigUseSettings ? "Global Settings" : "Manual API Key"}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${data.aiUseTrainingData ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
              {data.aiUseTrainingData ? "+ Knowledge" : "Prompt Only"}
            </span>
          </div>
        </div>
      </NodeShell>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-bottom-1.5" />
    </div>
  );
}

export function AIAgentNode({ data, selected }: { data: BuilderNodeData; selected?: boolean }) {
  const tools = Array.isArray(data.aiTools) ? data.aiTools : [];
  const hasTools = tools.length > 0;

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-fuchsia-500 !w-3 !h-3 !border-2 !border-white !shadow-sm !-top-1.5" />
      <NodeShell
        icon={<Bot className="w-4 h-4" />}
        title="AI Agent (Takeover)"
        color="text-fuchsia-700"
        bgColor="bg-fuchsia-50"
        borderColor="border-fuchsia-100"
        selected={selected}
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="font-semibold text-gray-700">Model:</span>
            <span>{data.aiModel || "gpt-4o"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="font-semibold text-gray-700">Limits:</span>
            <span>{data.timeLimitHours !== undefined ? data.timeLimitHours : 1}h / {data.questionLimit !== undefined ? data.questionLimit : 50} Qs</span>
          </div>
          <div className="text-[10px] text-gray-500 line-clamp-2">
            <span className="font-semibold text-gray-700">Prompt:</span>{" "}
            {data.aiSystemPrompt || "Conversational Takeover"}
          </div>
          
          {hasTools && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <div className="text-[9px] font-semibold text-fuchsia-700 uppercase tracking-wider">
                Function Tools / Routing:
              </div>
              <div className="flex flex-col gap-2 relative">
                {tools.map((tool: any, idx: number) => (
                  <div key={tool.id || idx} className="flex items-center justify-between bg-fuchsia-50/50 border border-fuchsia-100 rounded px-1.5 py-1 relative">
                    <span className="text-[9px] font-mono font-semibold text-fuchsia-700 truncate max-w-[120px]">
                      {tool.name}
                    </span>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={tool.name}
                      className="!bg-fuchsia-500 !w-2.5 !h-2.5 !border-2 !border-white !shadow-sm"
                      style={{ right: '-11px' }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </NodeShell>
      <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-3.5 flex flex-col items-center">
        <span className="text-[8px] bg-slate-100 text-slate-600 px-1 rounded border border-slate-200 leading-none">
          Default exit
        </span>
        <Handle type="source" position={Position.Bottom} id="default" className="!bg-fuchsia-500 !w-2.5 !h-2.5 !border-2 !border-white !shadow-sm mt-0.5" />
      </div>
    </div>
  );
}

const withNodeActions = (WrappedComponent: any) => {
  return function NodeActionsWrapper(props: any) {
    const { id, data } = props;
    return (
      <div className="relative group">
        <WrappedComponent {...props} />
        {id !== "start" && data?.onDuplicate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              data.onDuplicate(id);
            }}
            className="absolute top-2.5 right-2.5 w-6 h-6 rounded bg-white/90 hover:bg-white flex items-center justify-center text-gray-400 hover:text-blue-600 shadow-sm border border-gray-200 transition-all opacity-80 hover:opacity-100 z-50 cursor-pointer"
            title="Duplicate Node"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  };
};

export const nodeTypes = {
  start: StartNode,
  conditions: withNodeActions(ConditionsNode),
  custom_reply: withNodeActions(CustomReplyNode),
  user_reply: withNodeActions(UserReplyNode),
  time_gap: withNodeActions(TimeGapNode),
  send_template: withNodeActions(SendTemplateNode),
  assign_user: withNodeActions(AssignUserNode),
  webhook: withNodeActions(WebhookNode),
  mysql: withNodeActions(MySQLNode),
  end: withNodeActions(EndNode),
  add_to_group: withNodeActions(AddToGroupNode),
  update_contact: withNodeActions(UpdateContactNode),
  set_variable: withNodeActions(SetVariableNode),
  send_location: withNodeActions(SendLocationNode),
  send_list_message: withNodeActions(SendListMessageNode),
  send_media: withNodeActions(SendMediaNode),
  mark_as_read: withNodeActions(MarkAsReadNode),
  wait_reply: withNodeActions(WaitReplyNode),
  ai_answer: withNodeActions(AIAnswerNode),
  ai_agent: withNodeActions(AIAgentNode),
  send_contact_message: withNodeActions(SendContactMessageNode),
  scheduler: withNodeActions(SchedulerNode),
};
