import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Code2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Send,
  CloudUpload,
  RefreshCw,
  LayoutList,
  Trash2,
  ArrowUp,
  ArrowDown,
  List,
  Type,
  Mail,
  Phone,
  Calendar,
  AlignLeft,
  CheckSquare,
  Radio,
  Sliders,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface FlowEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  flow?: any | null;
  channelId?: string;
  channels?: any[];
}

export interface FormFieldItem {
  id: string;
  type: "TextInput" | "TextArea" | "Dropdown" | "RadioButtonsGroup" | "CheckboxGroup" | "DatePicker";
  name: string;
  label: string;
  required: boolean;
  inputType?: "text" | "email" | "phone" | "number";
  helperText?: string;
  options?: Array<{ id: string; title: string }>;
}

const CATEGORIES_LIST = [
  { id: "LEAD_GENERATION", label: "Lead Generation" },
  { id: "SURVEY", label: "Survey & Feedback" },
  { id: "APPOINTMENT_BOOKING", label: "Appointment Booking" },
  { id: "CUSTOMER_SUPPORT", label: "Customer Support" },
  { id: "OTHER", label: "Other / Custom" },
];

export function FlowEditorDialog({
  isOpen,
  onClose,
  flow,
  channelId: initialChannelId,
  channels = [],
}: FlowEditorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [channelId, setChannelId] = useState(initialChannelId || "");
  const [categories, setCategories] = useState<string[]>(["OTHER"]);
  const [headerText, setHeaderText] = useState("");
  const [bodyText, setBodyText] = useState("Please complete the interactive form below:");
  const [footerText, setFooterText] = useState("Powered by WhatsApp Flows");
  const [ctaButtonText, setCtaButtonText] = useState("Start Form");
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [autoSaveContactFields, setAutoSaveContactFields] = useState(true);
  const [syncToMeta, setSyncToMeta] = useState(false);
  const [flowJsonStr, setFlowJsonStr] = useState("{}");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("fields");
  const [fields, setFields] = useState<FormFieldItem[]>([]);
  const [formScreenTitle, setFormScreenTitle] = useState("Interactive Form");

  // Helper to compile fields to standard Meta JSON
  const compileFieldsToJson = (items: FormFieldItem[], title: string) => {
    const children: any[] = [];
    
    // Add heading
    children.push({
      type: "TextHeading",
      text: title || "Interactive Form",
    });

    const payloadObj: Record<string, string> = {};

    items.forEach((f) => {
      payloadObj[f.name] = `\${form.${f.name}}`;

      if (f.type === "TextInput") {
        children.push({
          type: "TextInput",
          name: f.name,
          label: f.label,
          required: f.required,
          ...(f.inputType && f.inputType !== "text" ? { input_type: f.inputType } : {}),
          ...(f.helperText ? { helper_text: f.helperText } : {}),
        });
      } else if (f.type === "TextArea") {
        children.push({
          type: "TextArea",
          name: f.name,
          label: f.label,
          required: f.required,
          ...(f.helperText ? { helper_text: f.helperText } : {}),
        });
      } else if (f.type === "Dropdown") {
        children.push({
          type: "Dropdown",
          name: f.name,
          label: f.label,
          required: f.required,
          options: (f.options && f.options.length > 0)
            ? f.options
            : [
                { id: "opt_1", title: "Option 1" },
                { id: "opt_2", title: "Option 2" },
              ],
        });
      } else if (f.type === "RadioButtonsGroup") {
        children.push({
          type: "RadioButtonsGroup",
          name: f.name,
          label: f.label,
          required: f.required,
          options: (f.options && f.options.length > 0)
            ? f.options
            : [
                { id: "opt_1", title: "Option 1" },
                { id: "opt_2", title: "Option 2" },
              ],
        });
      } else if (f.type === "CheckboxGroup") {
        children.push({
          type: "CheckboxGroup",
          name: f.name,
          label: f.label,
          required: f.required,
          options: (f.options && f.options.length > 0)
            ? f.options
            : [
                { id: "opt_1", title: "Option 1" },
                { id: "opt_2", title: "Option 2" },
              ],
        });
      } else if (f.type === "DatePicker") {
        children.push({
          type: "DatePicker",
          name: f.name,
          label: f.label,
          required: f.required,
        });
      }
    });

    // Add submit footer
    children.push({
      type: "Footer",
      label: "Submit Form",
      on_click_action: {
        name: "complete",
        payload: payloadObj,
      },
    });

    return {
      version: "6.0",
      screens: [
        {
          id: "SCREEN_FORM",
          title: title || "Interactive Form",
          terminal: true,
          data: {},
          layout: {
            type: "SingleColumnLayout",
            children,
          },
        },
      ],
    };
  };

  // Helper to extract fields from JSON
  const extractFieldsFromJson = (jsonObj: any): FormFieldItem[] => {
    if (!jsonObj?.screens?.[0]?.layout?.children) return [];
    const children = jsonObj.screens[0].layout.children;
    const extracted: FormFieldItem[] = [];

    children.forEach((c: any, idx: number) => {
      if (c.type === "TextInput") {
        extracted.push({
          id: `f_${idx}_${Date.now()}`,
          type: "TextInput",
          name: c.name || `field_${idx}`,
          label: c.label || "Text Field",
          required: !!c.required,
          inputType: c.input_type || "text",
          helperText: c.helper_text || "",
        });
      } else if (c.type === "TextArea") {
        extracted.push({
          id: `f_${idx}_${Date.now()}`,
          type: "TextArea",
          name: c.name || `field_${idx}`,
          label: c.label || "Notes / Text Area",
          required: !!c.required,
          helperText: c.helper_text || "",
        });
      } else if (c.type === "Dropdown" || c.type === "RadioButtonsGroup" || c.type === "CheckboxGroup") {
        extracted.push({
          id: `f_${idx}_${Date.now()}`,
          type: c.type,
          name: c.name || `field_${idx}`,
          label: c.label || "Select Option",
          required: !!c.required,
          options: c.options || [],
        });
      } else if (c.type === "DatePicker") {
        extracted.push({
          id: `f_${idx}_${Date.now()}`,
          type: "DatePicker",
          name: c.name || `field_${idx}`,
          label: c.label || "Select Date",
          required: !!c.required,
        });
      }
    });

    return extracted;
  };

  useEffect(() => {
    if (flow) {
      setName(flow.name || "");
      setChannelId(flow.channelId || initialChannelId || "");
      setCategories(flow.categories || ["OTHER"]);
      setHeaderText(flow.headerText || "");
      setBodyText(flow.bodyText || "Please complete the interactive form below:");
      setFooterText(flow.footerText || "Powered by WhatsApp Flows");
      setCtaButtonText(flow.ctaButtonText || "Start Form");
      setTriggerKeywords(flow.triggerKeywords || []);
      setAutoSaveContactFields(flow.autoSaveContactFields !== false);
      setSyncToMeta(!!flow.flowId);

      const parsedObj = typeof flow.flowJson === "object" ? flow.flowJson : JSON.parse(flow.flowJson || "{}");
      setFlowJsonStr(JSON.stringify(parsedObj, null, 2));
      const extracted = extractFieldsFromJson(parsedObj);
      setFields(extracted.length > 0 ? extracted : defaultFormFields);
      setFormScreenTitle(parsedObj?.screens?.[0]?.title || "Interactive Form");
      setJsonError(null);
    } else {
      setName("");
      setChannelId(initialChannelId || (channels[0]?.id || ""));
      setCategories(["OTHER"]);
      setHeaderText("");
      setBodyText("Please complete the interactive form below:");
      setFooterText("Powered by WhatsApp Flows");
      setCtaButtonText("Start Form");
      setTriggerKeywords([]);
      setAutoSaveContactFields(true);
      setSyncToMeta(false);
      setFields(defaultFormFields);
      setFormScreenTitle("Interactive Form");
      const compiled = compileFieldsToJson(defaultFormFields, "Interactive Form");
      setFlowJsonStr(JSON.stringify(compiled, null, 2));
      setJsonError(null);
    }
  }, [flow, isOpen, initialChannelId, channels]);

  const updateFieldsAndJson = (newFields: FormFieldItem[], newTitle?: string) => {
    setFields(newFields);
    const title = newTitle !== undefined ? newTitle : formScreenTitle;
    const compiled = compileFieldsToJson(newFields, title);
    setFlowJsonStr(JSON.stringify(compiled, null, 2));
  };

  const handleAddField = (type: FormFieldItem["type"], inputType?: FormFieldItem["inputType"]) => {
    const fieldCount = fields.length + 1;
    let label = "New Field";
    let fieldName = `field_${fieldCount}`;

    if (type === "TextInput") {
      if (inputType === "email") {
        label = "Email Address";
        fieldName = `email_${fieldCount}`;
      } else if (inputType === "phone") {
        label = "Phone Number";
        fieldName = `phone_${fieldCount}`;
      } else if (inputType === "number") {
        label = "Amount / Number";
        fieldName = `number_${fieldCount}`;
      } else {
        label = "Full Name";
        fieldName = `text_${fieldCount}`;
      }
    } else if (type === "TextArea") {
      label = "Comments / Notes";
      fieldName = `notes_${fieldCount}`;
    } else if (type === "Dropdown") {
      label = "Select an Option";
      fieldName = `dropdown_${fieldCount}`;
    } else if (type === "DatePicker") {
      label = "Preferred Date";
      fieldName = `date_${fieldCount}`;
    } else if (type === "RadioButtonsGroup") {
      label = "Choose One Option";
      fieldName = `choice_${fieldCount}`;
    } else if (type === "CheckboxGroup") {
      label = "Select All That Apply";
      fieldName = `options_${fieldCount}`;
    }

    const newField: FormFieldItem = {
      id: `f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      name: fieldName,
      label,
      required: true,
      inputType: inputType || "text",
      options: (type === "Dropdown" || type === "RadioButtonsGroup" || type === "CheckboxGroup")
        ? [
            { id: "opt_1", title: "Option 1" },
            { id: "opt_2", title: "Option 2" },
          ]
        : undefined,
    };

    updateFieldsAndJson([...fields, newField]);
  };

  const handleRemoveField = (id: string) => {
    updateFieldsAndJson(fields.filter((f) => f.id !== id));
  };

  const handleMoveField = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= fields.length) return;
    const newItems = [...fields];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIdx, 0, moved);
    updateFieldsAndJson(newItems);
  };

  const handleUpdateFieldProp = (id: string, updates: Partial<FormFieldItem>) => {
    const newFields = fields.map((f) => (f.id === id ? { ...f, ...updates } : f));
    updateFieldsAndJson(newFields);
  };

  const handleAddOption = (fieldId: string) => {
    const newFields = fields.map((f) => {
      if (f.id === fieldId) {
        const opts = f.options || [];
        const optNum = opts.length + 1;
        return {
          ...f,
          options: [...opts, { id: `opt_${optNum}`, title: `Option ${optNum}` }],
        };
      }
      return f;
    });
    updateFieldsAndJson(newFields);
  };

  const handleUpdateOption = (fieldId: string, optIndex: number, newTitle: string) => {
    const newFields = fields.map((f) => {
      if (f.id === fieldId) {
        const opts = [...(f.options || [])];
        if (opts[optIndex]) {
          opts[optIndex] = {
            ...opts[optIndex],
            title: newTitle,
            id: newTitle.toLowerCase().replace(/[^a-z0-9]/g, "_").substring(0, 20) || opts[optIndex].id,
          };
        }
        return { ...f, options: opts };
      }
      return f;
    });
    updateFieldsAndJson(newFields);
  };

  const handleRemoveOption = (fieldId: string, optIndex: number) => {
    const newFields = fields.map((f) => {
      if (f.id === fieldId) {
        const opts = (f.options || []).filter((_, idx) => idx !== optIndex);
        return { ...f, options: opts };
      }
      return f;
    });
    updateFieldsAndJson(newFields);
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setFlowJsonStr(val);
    try {
      const parsed = JSON.parse(val);
      setJsonError(null);
      const extracted = extractFieldsFromJson(parsed);
      if (extracted.length > 0) {
        setFields(extracted);
      }
      if (parsed?.screens?.[0]?.title) {
        setFormScreenTitle(parsed.screens[0].title);
      }
    } catch (err: any) {
      setJsonError(`Invalid JSON: ${err.message}`);
    }
  };

  const handleAddKeyword = () => {
    if (!keywordInput.trim()) return;
    const clean = keywordInput.trim().toLowerCase();
    if (!triggerKeywords.includes(clean)) {
      setTriggerKeywords([...triggerKeywords, clean]);
    }
    setKeywordInput("");
  };

  const handleRemoveKeyword = (kw: string) => {
    setTriggerKeywords(triggerKeywords.filter((k) => k !== kw));
  };

  const toggleCategory = (catId: string) => {
    if (categories.includes(catId)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== catId));
      }
    } else {
      setCategories([...categories, catId]);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      let parsedJson = {};
      try {
        parsedJson = JSON.parse(flowJsonStr);
      } catch (e: any) {
        throw new Error("Please fix JSON errors before saving.");
      }

      const payload = {
        name,
        channelId: channelId || null,
        categories,
        headerText,
        bodyText,
        footerText,
        ctaButtonText,
        triggerKeywords,
        autoSaveContactFields,
        syncToMeta,
        flowJson: parsedJson,
      };

      const url = flow ? `/api/whatsapp-flows/${flow.id}` : "/api/whatsapp-flows";
      const method = flow ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to save WhatsApp Flow");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-flows"] });
      toast({
        title: flow ? "Flow Updated" : "Flow Created",
        description: flow
          ? "WhatsApp Flow has been updated successfully."
          : "New WhatsApp Flow created successfully.",
      });
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-5 h-5 text-purple-600" />
            {flow ? `Edit Flow: ${flow.name}` : "Create Meta WhatsApp Flow"}
          </DialogTitle>
          <DialogDescription>
            Design native interactive forms, questionnaires, survey questions, and automated triggers.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="fields" className="flex items-center gap-1.5">
              <LayoutList className="w-4 h-4 text-purple-600" />
              Form Fields ({fields.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-blue-600" />
              Card & Settings
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-1.5">
              <Send className="w-4 h-4 text-emerald-600" />
              Live Preview
            </TabsTrigger>
            <TabsTrigger value="flow_json" className="flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-slate-600" />
              Raw JSON
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: VISUAL FORM FIELDS BUILDER */}
          <TabsContent value="fields" className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/70 p-3.5 rounded-xl border border-purple-100">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Interactive Form Screen
                </h4>
                <div className="flex items-center gap-2">
                  <Input
                    value={formScreenTitle}
                    onChange={(e) => {
                      setFormScreenTitle(e.target.value);
                      updateFieldsAndJson(fields, e.target.value);
                    }}
                    placeholder="Form Screen Title (e.g. Lead Qualification)"
                    className="h-8 text-xs bg-white border-purple-200 w-64"
                  />
                </div>
              </div>

              {/* Add Field Dropdown */}
              <Select onValueChange={(val) => {
                if (val === "text") handleAddField("TextInput", "text");
                else if (val === "email") handleAddField("TextInput", "email");
                else if (val === "phone") handleAddField("TextInput", "phone");
                else if (val === "number") handleAddField("TextInput", "number");
                else if (val === "textarea") handleAddField("TextArea");
                else if (val === "dropdown") handleAddField("Dropdown");
                else if (val === "radio") handleAddField("RadioButtonsGroup");
                else if (val === "checkbox") handleAddField("CheckboxGroup");
                else if (val === "date") handleAddField("DatePicker");
              }}>
                <SelectTrigger className="w-[180px] h-8 bg-purple-600 text-white font-medium text-xs hover:bg-purple-700">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Form Field
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text" className="text-xs">
                    <span className="flex items-center gap-2"><Type className="w-3.5 h-3.5" /> Text Input (Name, Company)</span>
                  </SelectItem>
                  <SelectItem value="email" className="text-xs">
                    <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> Email Address</span>
                  </SelectItem>
                  <SelectItem value="phone" className="text-xs">
                    <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> Phone Number</span>
                  </SelectItem>
                  <SelectItem value="number" className="text-xs">
                    <span className="flex items-center gap-2"><Sliders className="w-3.5 h-3.5" /> Number / Budget / Quantity</span>
                  </SelectItem>
                  <SelectItem value="textarea" className="text-xs">
                    <span className="flex items-center gap-2"><AlignLeft className="w-3.5 h-3.5" /> Long Text Area / Notes</span>
                  </SelectItem>
                  <SelectItem value="dropdown" className="text-xs">
                    <span className="flex items-center gap-2"><List className="w-3.5 h-3.5" /> Dropdown Menu</span>
                  </SelectItem>
                  <SelectItem value="radio" className="text-xs">
                    <span className="flex items-center gap-2"><Radio className="w-3.5 h-3.5" /> Radio Buttons (Single Choice)</span>
                  </SelectItem>
                  <SelectItem value="checkbox" className="text-xs">
                    <span className="flex items-center gap-2"><CheckSquare className="w-3.5 h-3.5" /> Checkbox Group (Multi Choice)</span>
                  </SelectItem>
                  <SelectItem value="date" className="text-xs">
                    <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Date Picker</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* List of Form Fields */}
            {fields.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl space-y-3">
                <LayoutList className="w-8 h-8 text-gray-400 mx-auto" />
                <p className="text-sm font-medium text-gray-700">No fields in this form yet</p>
                <p className="text-xs text-gray-400">Click the "+ Add Form Field" button above to insert inputs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((f, idx) => (
                  <div
                    key={f.id}
                    className="p-4 bg-white border border-gray-200 rounded-xl shadow-2xs space-y-3 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-800 font-bold text-[11px] w-5 h-5 rounded-full flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono uppercase bg-slate-50">
                          {f.type} {f.inputType ? `(${f.inputType})` : ""}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveField(idx, "up")}
                          disabled={idx === 0}
                        >
                          <ArrowUp className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleMoveField(idx, "down")}
                          disabled={idx === fields.length - 1}
                        >
                          <ArrowDown className="w-3.5 h-3.5 text-gray-500" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveField(f.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1 md:col-span-2">
                        <Label className="text-xs font-semibold">Question / Label</Label>
                        <Input
                          value={f.label}
                          onChange={(e) => handleUpdateFieldProp(f.id, { label: e.target.value })}
                          placeholder="e.g. Your Full Name"
                          className="text-xs h-8"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">CRM Field Key</Label>
                        <Input
                          value={f.name}
                          onChange={(e) =>
                            handleUpdateFieldProp(f.id, {
                              name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
                            })
                          }
                          placeholder="e.g. full_name"
                          className="text-xs font-mono h-8"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`req_${f.id}`}
                          checked={f.required}
                          onCheckedChange={(checked) => handleUpdateFieldProp(f.id, { required: checked })}
                        />
                        <Label htmlFor={`req_${f.id}`} className="text-xs text-gray-700 cursor-pointer">
                          Required field (User cannot skip)
                        </Label>
                      </div>
                    </div>

                    {/* Options Editor for Dropdown / Radio / Checkboxes */}
                    {(f.type === "Dropdown" || f.type === "RadioButtonsGroup" || f.type === "CheckboxGroup") && (
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-700">Selectable Choices / Options:</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-[11px] px-2"
                            onClick={() => handleAddOption(f.id)}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Add Option
                          </Button>
                        </div>

                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                          {(f.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <Input
                                value={opt.title}
                                onChange={(e) => handleUpdateOption(f.id, optIdx, e.target.value)}
                                placeholder={`Option ${optIdx + 1}`}
                                className="h-7 text-xs bg-white"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-gray-400 hover:text-red-500"
                                onClick={() => handleRemoveOption(f.id, optIdx)}
                                disabled={(f.options || []).length <= 1}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 2: GENERAL SETTINGS */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="flow-name" className="font-semibold">
                  Flow Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="flow-name"
                  placeholder="e.g. Lead Qualification 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="channel-select" className="font-semibold">
                  Assigned WhatsApp Channel
                </Label>
                <Select value={channelId} onValueChange={setChannelId}>
                  <SelectTrigger id="channel-select">
                    <SelectValue placeholder="Select Channel" />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((ch: any) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        {ch.name || ch.phoneNumber || ch.id} ({ch.connectionMethod || "Channel"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-2">
              <Label className="font-semibold">Categories</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES_LIST.map((cat) => {
                  const isSelected = categories.includes(cat.id);
                  return (
                    <Badge
                      key={cat.id}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer py-1 px-3 text-xs"
                      onClick={() => toggleCategory(cat.id)}
                    >
                      {cat.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Interactive Message Content */}
            <div className="border rounded-lg p-4 bg-gray-50/50 space-y-3">
              <h4 className="font-medium text-sm text-gray-900">
                Interactive Invitation Card (WhatsApp Message)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="header-text" className="text-xs">
                    Header Text (Optional)
                  </Label>
                  <Input
                    id="header-text"
                    placeholder="e.g. 💼 Business Inquiry"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cta-btn" className="text-xs">
                    CTA Button Text
                  </Label>
                  <Input
                    id="cta-btn"
                    placeholder="e.g. Start Form"
                    value={ctaButtonText}
                    onChange={(e) => setCtaButtonText(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="body-text" className="text-xs">
                  Body Message Text <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="body-text"
                  rows={2}
                  placeholder="Please complete the interactive form below:"
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="footer-text" className="text-xs">
                  Footer Text (Optional)
                </Label>
                <Input
                  id="footer-text"
                  placeholder="e.g. Takes less than a minute"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                />
              </div>
            </div>

            {/* Trigger Keywords */}
            <div className="space-y-2">
              <Label className="font-semibold">Autoresponder Trigger Keywords</Label>
              <p className="text-xs text-muted-foreground">
                When a contact messages any of these keywords, this Flow will be launched automatically.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Type keyword and press Enter or Add..."
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddKeyword}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              {triggerKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {triggerKeywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="secondary"
                      className="flex items-center gap-1 bg-purple-50 text-purple-700 border-purple-200"
                    >
                      {kw}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-red-500"
                        onClick={() => handleRemoveKeyword(kw)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Automation & CRM Toggles */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Auto-Save Submitted Data to Contact Variables</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically sync form responses into contact custom attributes and CRM contact cards.
                  </p>
                </div>
                <Switch
                  checked={autoSaveContactFields}
                  onCheckedChange={setAutoSaveContactFields}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <CloudUpload className="w-4 h-4 text-blue-600" />
                    Sync with Meta Cloud API Graph
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Directly validate and upload this Flow JSON asset to Meta WhatsApp Business API.
                  </p>
                </div>
                <Switch checked={syncToMeta} onCheckedChange={setSyncToMeta} />
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: LIVE PREVIEW */}
          <TabsContent value="preview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-100 rounded-xl">
              {/* WhatsApp Message Card Preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider text-center">
                  1. Message Card
                </h4>
                <div className="bg-[#EFEAE2] p-4 rounded-xl shadow-sm space-y-2 max-w-sm mx-auto">
                  <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 space-y-2 text-sm text-gray-800">
                    {headerText && (
                      <div className="font-bold text-gray-900 text-sm border-b pb-1">
                        {headerText}
                      </div>
                    )}
                    <div className="whitespace-pre-wrap leading-relaxed text-xs">
                      {bodyText || "Please complete the interactive form below:"}
                    </div>
                    {footerText && (
                      <div className="text-[10px] text-gray-500 pt-1">
                        {footerText}
                      </div>
                    )}

                    <div className="pt-2 border-t mt-2">
                      <Button
                        type="button"
                        className="w-full bg-[#00a884] hover:bg-[#008f6f] text-white flex items-center justify-center gap-2 font-medium text-xs h-8"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {ctaButtonText || "Start Form"}
                      </Button>
                    </div>
                  </div>
                  <div className="text-[10px] text-right text-gray-500">
                    12:00 PM ✓✓
                  </div>
                </div>
              </div>

              {/* Native WhatsApp Form Screen Preview */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider text-center">
                  2. Native Form Screen ({fields.length} Inputs)
                </h4>
                <div className="bg-white border rounded-xl shadow-sm max-w-sm mx-auto p-4 space-y-3">
                  <div className="border-b pb-2">
                    <h3 className="font-bold text-sm text-gray-900">{formScreenTitle}</h3>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {fields.map((f, i) => (
                      <div key={i} className="space-y-1 text-xs">
                        <Label className="font-semibold text-gray-700 flex items-center gap-1">
                          {f.label} {f.required && <span className="text-red-500">*</span>}
                        </Label>
                        {f.type === "TextInput" && (
                          <Input disabled placeholder={`Enter ${f.label.toLowerCase()}...`} className="h-8 text-xs bg-gray-50" />
                        )}
                        {f.type === "TextArea" && (
                          <Textarea disabled placeholder={`Enter ${f.label.toLowerCase()}...`} rows={2} className="text-xs bg-gray-50 resize-none" />
                        )}
                        {f.type === "Dropdown" && (
                          <div className="h-8 border rounded-md px-3 flex items-center justify-between text-gray-400 bg-gray-50">
                            <span>Select an option</span>
                            <List className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        )}
                        {f.type === "DatePicker" && (
                          <div className="h-8 border rounded-md px-3 flex items-center justify-between text-gray-400 bg-gray-50">
                            <span>YYYY-MM-DD</span>
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        )}
                        {(f.type === "RadioButtonsGroup" || f.type === "CheckboxGroup") && (
                          <div className="space-y-1 pl-1">
                            {(f.options || []).map((opt, oi) => (
                              <div key={oi} className="flex items-center gap-2 text-gray-600">
                                <div className="w-3 h-3 rounded border border-gray-300 bg-gray-100" />
                                <span>{opt.title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <Button className="w-full bg-[#00a884] text-white text-xs h-8 mt-2" disabled>
                    Submit Form
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: RAW JSON SPECIFICATION */}
          <TabsContent value="flow_json" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">Meta Flow JSON Specification</h4>
                <p className="text-xs text-muted-foreground">
                  Changes in the visual builder automatically update this specification.
                </p>
              </div>

              {jsonError ? (
                <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {jsonError}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 flex items-center gap-1 text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Valid JSON
                </Badge>
              )}
            </div>

            <Textarea
              className="font-mono text-xs bg-slate-950 text-emerald-400 p-4 rounded-lg min-h-[380px] focus-visible:ring-purple-500"
              value={flowJsonStr}
              onChange={handleJsonChange}
            />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {saveMutation.isPending && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            {flow ? "Update Flow" : "Save & Create Flow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const defaultFormFields: FormFieldItem[] = [
  {
    id: "f_1",
    type: "TextInput",
    name: "full_name",
    label: "Full Name",
    required: true,
    inputType: "text",
  },
  {
    id: "f_2",
    type: "TextInput",
    name: "email",
    label: "Email Address",
    required: true,
    inputType: "email",
  },
  {
    id: "f_3",
    type: "TextArea",
    name: "notes",
    label: "Additional Notes / Comments",
    required: false,
  },
];
