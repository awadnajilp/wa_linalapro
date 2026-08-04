/**
 * ============================================================
 * © 2026 LINALA — WhatsApp CRM & Marketing Platform
 * ============================================================
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Trash2,
  Play,
  Pause,
  Plus,
  FileText,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";
import { type Contact } from "./types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TemplatePickerDialog } from "@/components/shared/TemplatePickerDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

function DateTimePicker({
  value,
  onChange,
}: {
  value: Date | undefined;
  onChange: (d: Date) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [time, setTime] = useState<string>(value ? format(value, "HH:mm") : "10:00");

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    const [hours, minutes] = time.split(":").map(Number);
    const updated = new Date(date);
    updated.setHours(hours);
    updated.setMinutes(minutes);
    updated.setSeconds(0);
    onChange(updated);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeVal = e.target.value;
    setTime(timeVal);
    if (selectedDate) {
      const [hours, minutes] = timeVal.split(":").map(Number);
      const updated = new Date(selectedDate);
      updated.setHours(hours);
      updated.setMinutes(minutes);
      updated.setSeconds(0);
      onChange(updated);
    }
  };

  useEffect(() => {
    setSelectedDate(value);
    if (value) {
      setTime(format(value, "HH:mm"));
    }
  }, [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative cursor-pointer w-full">
          <Input
            type="text"
            readOnly
            placeholder="DD/MM/YYYY HH:mm"
            value={selectedDate ? format(selectedDate, "dd/MM/yyyy") + " " + time : ""}
            className="bg-white border-gray-200 focus:border-blue-500 text-xs h-10 pr-10 cursor-pointer w-full text-left"
          />
          <Calendar className="absolute right-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-[100]" align="start">
        <CalendarComponent
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
        <div className="p-3 border-t border-gray-100 flex items-center justify-between gap-4">
          <span className="text-xs font-semibold text-gray-600">Time:</span>
          <Input
            type="time"
            value={time}
            onChange={handleTimeChange}
            className="w-28 text-xs h-8"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ContactCampaignsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  activeChannel: any;
}

export function ContactCampaignsDialog({
  open,
  onOpenChange,
  contact,
  activeChannel,
}: ContactCampaignsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [messageType, setMessageType] = useState<"custom" | "template">("custom");
  const [customMessage, setCustomMessage] = useState("");
  const [frequency, setFrequency] = useState("yearly");
  const [scheduledDateVal, setScheduledDateVal] = useState<Date | undefined>(undefined);
  
  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateVariables, setTemplateVariables] = useState<any[]>([]);
  const [headerMediaId, setHeaderMediaId] = useState<string | undefined>(undefined);

  // Fetch campaigns for this contact
  const { data: campaigns = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/contacts", contact?.id, "campaigns"],
    queryFn: async () => {
      if (!contact?.id) return [];
      const res = await fetch(`/api/contacts/${contact.id}/campaigns`);
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
    enabled: !!contact?.id && open,
  });

  // Fetch custom contact variables
  const { data: customVariables = [] } = useQuery<string[]>({
    queryKey: ["/api/contacts/custom-variables"],
    queryFn: async () => {
      const response = await fetch("/api/contacts/custom-variables");
      if (!response.ok) return [];
      return response.json();
    },
    enabled: open,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/contacts/${contact?.id}/campaigns`, data);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Campaign scheduled",
        description: "The recurring campaign has been created successfully.",
      });
      // Invalidate contacts queries to refresh columns in table
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/contacts"] });
      refetch();
      resetForm();
    },
    onError: (err: any) => {
      toast({
        title: "Failed to schedule campaign",
        description: err.message || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PUT", `/api/contacts/campaigns/${id}`, { status });
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "The campaign status has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/contacts"] });
      refetch();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/contacts/campaigns/${id}`);
      return res;
    },
    onSuccess: () => {
      toast({
        title: "Campaign deleted",
        description: "The recurring campaign was deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/contacts"] });
      refetch();
    },
  });

  const resetForm = () => {
    setIsCreating(false);
    setName("");
    setMessageType("custom");
    setCustomMessage("");
    setFrequency("yearly");
    setScheduledDateVal(undefined);
    setSelectedTemplate(null);
    setTemplateVariables([]);
    setHeaderMediaId(undefined);
  };

  const handleSelectTemplate = (
    template: any,
    variables: { type?: string; value?: string }[],
    mediaId?: string
  ) => {
    setSelectedTemplate(template);
    // Format variableMapping as a dictionary object
    const variableDict: Record<string, any> = {};
    variables.forEach((v, index) => {
      variableDict[(index + 1).toString()] = {
        type: v.type || "custom",
        value: v.value || "",
      };
    });
    setTemplateVariables(variables);
    setHeaderMediaId(mediaId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!scheduledDateVal) {
      toast({ title: "Start date is required", variant: "destructive" });
      return;
    }

    const payload: any = {
      name,
      frequency,
      scheduledDate: scheduledDateVal.toISOString(),
    };

    if (messageType === "custom") {
      if (!customMessage.trim()) {
        toast({ title: "Message body is required", variant: "destructive" });
        return;
      }
      payload.customMessage = customMessage;
    } else {
      if (!selectedTemplate) {
        toast({ title: "Please select a template", variant: "destructive" });
        return;
      }
      // Reformat variableMapping to match the schema record
      const variableMapping: Record<string, any> = {};
      templateVariables.forEach((v, index) => {
        variableMapping[(index + 1).toString()] = {
          type: v.type || "custom",
          value: v.value || "",
        };
      });

      payload.templateId = selectedTemplate.id;
      payload.templateName = selectedTemplate.name;
      payload.templateLanguage = selectedTemplate.language || "en_US";
      payload.variableMapping = variableMapping;
      if (headerMediaId) {
        payload.mediaUrl = headerMediaId;
        payload.variableMapping.uploadedMediaId = headerMediaId;
      }
    }

    createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => { onOpenChange(open); if (!open) resetForm(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-6 rounded-xl border border-gray-100 shadow-2xl bg-white/95 backdrop-blur-md">
        <DialogHeader className="border-b border-gray-100 pb-4">
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 bg-clip-text text-transparent flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
            Recurring Campaigns for {contact?.name}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Set up automatic renewal alerts or repeated messages (every day, month, 6 months, or year) targeting this customer directly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
          {isCreating ? (
            <form onSubmit={handleSubmit} className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-200/50">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-semibold text-gray-800">Schedule Recurring Message</h4>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="h-8 px-2 text-gray-500 hover:text-gray-700">
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Campaign Name</label>
                  <Input
                    placeholder="e.g. Insurance Renewal Alert"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white border-gray-200 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Frequency</label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="bg-white border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyday">Every Day</SelectItem>
                        <SelectItem value="monthly">Every Month</SelectItem>
                        <SelectItem value="6months">Every 6 Months</SelectItem>
                        <SelectItem value="yearly">Every Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">First Scheduled Date</label>
                    <DateTimePicker
                      value={scheduledDateVal}
                      onChange={(d) => setScheduledDateVal(d)}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Message Type</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={messageType === "custom" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setMessageType("custom")}
                    >
                      Custom Text Message
                    </Button>
                    <Button
                      type="button"
                      variant={messageType === "template" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setMessageType("template")}
                    >
                      WhatsApp Template
                    </Button>
                  </div>
                </div>

                {messageType === "custom" ? (
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">Message Content</label>
                    <Textarea
                      placeholder="Write the message text to be sent..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      rows={3}
                      className="bg-white border-gray-200 focus:border-blue-500 resize-none"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col p-4 bg-white border border-gray-200 rounded-lg space-y-4">
                    {selectedTemplate ? (
                      <div className="w-full space-y-4">
                        <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">
                            <FileText className="w-4 h-4" />
                            Template: {selectedTemplate.name}
                          </div>
                          <TemplatePickerDialog
                            channelId={activeChannel?.id}
                            onSelectTemplate={handleSelectTemplate}
                            submitLabel="Change Template"
                            trigger={
                              <Button type="button" variant="outline" size="sm" className="h-8">
                                Change Template
                              </Button>
                            }
                          />
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-left text-[11px] text-blue-800 space-y-1">
                          <span className="font-semibold block">💡 Variable Setup Instructions:</span>
                          <ul className="list-disc pl-4 space-y-0.5">
                            <li>Select <strong>Full Name</strong> or <strong>First Name</strong> to automatically resolve contact names.</li>
                            <li>Select <strong>Phone</strong> to insert the contact's phone number.</li>
                            <li>Select <strong>Custom Text Input</strong> to enter fixed text, or write dynamic contact parameters like <code>{"{{name}}"}</code>, <code>{"{{phone}}"}</code>, or <code>{"{{variable_name}}"}</code>.</li>
                          </ul>
                        </div>

                        {templateVariables.length > 0 ? (
                          <div className="space-y-3 text-left w-full">
                            <span className="text-xs font-semibold text-gray-600 block">Configure Template Variables ({templateVariables.length})</span>
                            {templateVariables.map((v: any, index: number) => (
                              <div key={index} className="space-y-1">
                                <label className="text-xs font-semibold text-gray-700 block">
                                  Variable {"{{" + (index + 1) + "}}"}
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  <Select
                                    value={v.type || ""}
                                    onValueChange={(val) => {
                                      const updated = [...templateVariables];
                                      updated[index] = { type: val, value: "" };
                                      setTemplateVariables(updated);
                                    }}
                                  >
                                    <SelectTrigger className="bg-white border-gray-200 text-xs h-9">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="fullName">Full Name</SelectItem>
                                      <SelectItem value="firstName">First Name</SelectItem>
                                      <SelectItem value="phone">Phone Number</SelectItem>
                                      <SelectItem value="custom">Custom Text Input</SelectItem>
                                      {customVariables.length > 0 &&
                                        customVariables.map((cVar: string) => (
                                          <SelectItem key={cVar} value={cVar}>
                                            {cVar}
                                          </SelectItem>
                                        ))
                                      }
                                    </SelectContent>
                                  </Select>

                                  {v.type === "custom" && (
                                    <Input
                                      placeholder="Value or {{placeholders}}"
                                      value={v.value || ""}
                                      onChange={(e) => {
                                        const updated = [...templateVariables];
                                        updated[index] = { ...updated[index], value: e.target.value };
                                        setTemplateVariables(updated);
                                      }}
                                      className="bg-white border-gray-200 text-xs h-9"
                                    />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500 text-center">No variables required for this template.</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center space-y-3 w-full py-2">
                        <p className="text-xs text-gray-500">Select a pre-approved template and configure variables</p>
                        <div className="flex gap-2 justify-center">
                          <TemplatePickerDialog
                            channelId={activeChannel?.id}
                            onSelectTemplate={handleSelectTemplate}
                            submitLabel="Select Template"
                            trigger={
                              <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={!activeChannel}>
                                <Plus className="w-3.5 h-3.5" /> Choose Template
                              </Button>
                            }
                          />
                          <a href="/templates" target="_blank" rel="noopener noreferrer">
                            <Button type="button" variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 font-semibold gap-1 text-xs">
                              <Plus className="w-3 h-3" /> Create New Template
                            </Button>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                  {createMutation.isPending ? "Scheduling..." : "Create Campaign"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold text-gray-800">Active Schedules</h4>
              <Button onClick={() => setIsCreating(true)} disabled={!activeChannel} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-9">
                <Plus className="w-4 h-4" /> Add Campaign
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-2">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
              <p className="text-xs text-gray-500">Loading schedules...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
              <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">No active recurring campaigns</p>
              <p className="text-xs text-gray-400 mt-1">Schedule automatic renewal alerts or recurring messages for this customer.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((cc: any) => (
                <div key={cc.id} className="p-4 bg-white border border-gray-150 rounded-xl hover:shadow-sm transition-shadow flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{cc.name}</span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
                          cc.status === "active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {cc.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Frequency: <span className="font-semibold text-gray-700 capitalize">{cc.frequency}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        Next run:{" "}
                        <span className="font-semibold text-gray-700">
                          {new Date(cc.nextSendAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    </div>

                    <div className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100 max-w-md mt-2">
                      {cc.templateName ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                            <FileText className="w-3.5 h-3.5" />
                            Template: {cc.templateName}
                          </div>
                          {cc.variableMapping && typeof cc.variableMapping === "object" && Object.keys(cc.variableMapping).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 border-t border-gray-250 pt-1.5">
                              {Object.entries(cc.variableMapping).map(([key, val]: [string, any]) => {
                                if (key === "uploadedMediaId" || key === "headerType") return null;
                                let displayVal = "";
                                if (val.type === "fullName") displayVal = "Full Name";
                                else if (val.type === "firstName") displayVal = "First Name";
                                else if (val.type === "phone") displayVal = "Phone";
                                else if (val.type === "custom") displayVal = `"${val.value}"`;
                                else displayVal = val.type;
                                return (
                                  <Badge key={key} variant="outline" className="text-[9px] px-1 bg-white text-gray-500 border-gray-150 py-0.5 leading-none">
                                    {"{{" + key + "}}"}: {displayVal}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-600 italic line-clamp-2">"{cc.customMessage}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        toggleMutation.mutate({
                          id: cc.id,
                          status: cc.status === "active" ? "paused" : "active",
                        })
                      }
                      title={cc.status === "active" ? "Pause Campaign" : "Resume Campaign"}
                    >
                      {cc.status === "active" ? <Pause className="w-4 h-4 text-amber-600" /> : <Play className="w-4 h-4 text-green-600" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this scheduled campaign?")) {
                          deleteMutation.mutate(cc.id);
                        }
                      }}
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
