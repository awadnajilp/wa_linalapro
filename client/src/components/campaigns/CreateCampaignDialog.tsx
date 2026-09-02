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

import { useState } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, FileSpreadsheet, Code, Search, ChevronLeft, ChevronRight, Loader2, Filter, Clock } from "lucide-react";
import { CreateCampaignForm } from "./CreateCampaignForm";
import { useTranslation } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: any[];
  contacts?: any[];
  groups: any[];
  broadcastLists: any[];
  onCreateCampaign: (campaignData: any) => void;
  isCreating: boolean;
  messagingLimit?: number | null;
  messagingTier?: string;
}

export function CreateCampaignDialog({
  open,
  onOpenChange,
  templates,
  contacts = [],
  groups,
  broadcastLists = [],
  onCreateCampaign,
  isCreating,
  messagingLimit,
  messagingTier,
}: CreateCampaignDialogProps) {
  const [campaignType, setCampaignType] = useState<"contacts" | "broadcast" | "groups" | "csv" | "api">(
    "contacts"
  );
  const { user } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [variableMapping, setVariableMapping] = useState<
    Record<string, string>
  >({});
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [contactsSearchQuery, setContactsSearchQuery] = useState("");
  const [contactsPage, setContactsPage] = useState(1);
  const contactsLimit = 50;
  const [onlyActive24h, setOnlyActive24h] = useState(false);
  const [isSelectingAllMatching, setIsSelectingAllMatching] = useState(false);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [scheduledTime, setScheduledTime] = useState("");
  const [autoRetry, setAutoRetry] = useState(false);
  const { t } = useTranslation();
  const [requiresHeaderImage, setRequiresHeaderImage] = useState(false);
  const [uploadedMediaId, setUploadedMediaId] = useState<string | null>(null);
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);

  const resetForm = () => {
    setSelectedTemplate(null);
    setVariableMapping({});
    setSelectedContacts([]);
    setSelectedGroup("all");
    setContactsSearchQuery("");
    setContactsPage(1);
    setOnlyActive24h(false);
    setIsSelectingAllMatching(false);
    setCsvData([]);
    setScheduledTime("");
    setAutoRetry(false);
  };

  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  // Server-side paginated contacts query
  const { data: contactsResponse, isLoading: isContactsLoading } = useQuery({
    queryKey: [
      "/api/contacts/campaign-select",
      activeChannel?.id,
      contactsPage,
      contactsSearchQuery,
      selectedGroup,
      onlyActive24h,
      campaignType,
    ],
    enabled: open && !!activeChannel?.id && (campaignType === "contacts" || campaignType === "broadcast" || campaignType === "groups"),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeChannel?.id) params.set("channelId", activeChannel.id);
      params.set("page", String(contactsPage));
      params.set("limit", String(contactsLimit));
      if (contactsSearchQuery?.trim()) params.set("search", contactsSearchQuery.trim());
      if (selectedGroup && selectedGroup !== "all") params.set("group", selectedGroup);
      if (onlyActive24h) params.set("onlyActive24h", "true");
      if (campaignType === "groups") params.set("isGroup", "true");
      else params.set("isGroup", "false");

      const res = await fetch(`/api/contacts?${params.toString()}`);
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
  });

  const displayedContacts = Array.isArray(contactsResponse)
    ? contactsResponse
    : (contactsResponse?.data || []);
  const totalContactsCount = typeof contactsResponse?.total === "number"
    ? contactsResponse.total
    : (displayedContacts.length || 0);
  const totalContactsPages = typeof contactsResponse?.totalPages === "number"
    ? contactsResponse.totalPages
    : Math.ceil(totalContactsCount / contactsLimit);


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as Record<string, string>[];
        setCsvData(data);
      },
    });
  };

  const extractTemplateVariables = (template: any) => {
    const variables: string[] = [];
    const regex = /\{\{(\d+)\}\}/g;

    if (template?.body) {
      let match;
      while ((match = regex.exec(template.body)) !== null) {
        variables.push(match[1]);
      }
    }

    return variables;
  };

  const downloadSampleCSV = () => {
    const sampleData = [
      ["name", "phone", "email", "custom_field_1", "custom_field_2"],
      ["John Doe", "+1234567890", "john@example.com", "Value 1", "Value 2"],
      ["Jane Smith", "+0987654321", "jane@example.com", "Value 3", "Value 4"],
      [
        "Example User",
        "+1122334455",
        "example@email.com",
        "Value 5",
        "Value 6",
      ],
    ];

    const csvContent = sampleData.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campaign_contacts_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = (formData: any) => {
    onCreateCampaign({
      campaignType,
      selectedTemplate,
      variableMapping,
      selectedContacts,
      selectedGroup,
      csvData,
      scheduledTime,
      autoRetry,
      ...formData,
    });
  };

  // Filter contacts based on selected group and search query
  const filteredContacts = (contacts || []).filter((contact: any) => {
    if (contact.isGroup) return false;
    const matchesGroup = selectedGroup === "all" ||
      (Array.isArray(contact.groups) && contact.groups.includes(selectedGroup));

    const matchesSearch = !contactsSearchQuery ||
      contact.name?.toLowerCase().includes(contactsSearchQuery.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(contactsSearchQuery.toLowerCase());

    return matchesGroup && matchesSearch;
  });

  const filteredGroups = (contacts || []).filter((contact: any) => {
    if (!contact.isGroup) return false;
    const matchesGroup = selectedGroup === "all" ||
      (Array.isArray(contact.groups) && contact.groups.includes(selectedGroup));

    const matchesSearch = !contactsSearchQuery ||
      contact.name?.toLowerCase().includes(contactsSearchQuery.toLowerCase()) ||
      contact.phone?.toLowerCase().includes(contactsSearchQuery.toLowerCase());

    return matchesGroup && matchesSearch;
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        if (!newOpen) resetForm();
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("campaigns.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("campaigns.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={campaignType}
          onValueChange={(v) => {
            setCampaignType(v as any);
            setSelectedContacts([]);
          }}
        >
          <TabsList className={`grid w-full ${activeChannel?.connectionMethod === "qr_code" ? "grid-cols-4" : "grid-cols-2"}`}>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("campaigns.contactsImport")}
            </TabsTrigger>
            {activeChannel?.connectionMethod === "qr_code" && (
              <TabsTrigger value="broadcast" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Broadcast Lists
              </TabsTrigger>
            )}
            {activeChannel?.connectionMethod === "qr_code" && (
              <TabsTrigger value="groups" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                WhatsApp Groups
              </TabsTrigger>
            )}
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              {t("campaigns.csvImport")}
            </TabsTrigger>
          </TabsList>

          <CreateCampaignForm
            onSubmit={handleSubmit}
            templates={templates}
            selectedTemplate={selectedTemplate}
            setSelectedTemplate={setSelectedTemplate}
            variableMapping={variableMapping}
            setVariableMapping={setVariableMapping}
            extractTemplateVariables={extractTemplateVariables}
            scheduledTime={scheduledTime}
            setScheduledTime={setScheduledTime}
            autoRetry={autoRetry}
            setAutoRetry={setAutoRetry}
            isCreating={isCreating}
            onCancel={() => onOpenChange(false)}
            channelId={activeChannel?.id}
            connectionMethod={activeChannel?.connectionMethod}
            requiresHeaderImage={requiresHeaderImage}
            setRequiresHeaderImage={setRequiresHeaderImage}
            uploadedMediaId={uploadedMediaId}
            setUploadedMediaId={setUploadedMediaId}
            messagingLimit={messagingLimit}
            messagingTier={messagingTier}
          >
            <TabsContent value="contacts" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="mb-1.5 text-xs font-semibold text-gray-700 block">
                    {t("campaigns.campaignfilterlabel")}
                  </Label>
                  <Select
                    value={selectedGroup}
                    onValueChange={(val) => {
                      setSelectedGroup(val);
                      setContactsPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder={t("campaigns.selectGroup")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("campaigns.allGroup")}
                      </SelectItem>
                      {groups.map((group: any) => (
                        <SelectItem key={group.id} value={group.name}>
                          {group.name} ({group.contact_count || 0})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-1.5 text-xs font-semibold text-gray-700 block">
                    Search All Contacts in Channel
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search across entire contact database..."
                      value={contactsSearchQuery}
                      onChange={(e) => {
                        setContactsSearchQuery(e.target.value);
                        setContactsPage(1);
                      }}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {activeChannel?.connectionMethod !== "qr_code" && (
                <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600 shrink-0" />
                    <span className="text-blue-900 font-medium">Filter by 24h Active Customer Window</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="onlyActive24hToggle" className="text-[11px] text-blue-800 cursor-pointer">
                      Only Active (24h)
                    </Label>
                    <Switch
                      id="onlyActive24hToggle"
                      checked={onlyActive24h}
                      onCheckedChange={(checked) => {
                        setOnlyActive24h(checked);
                        setContactsPage(1);
                      }}
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-1 border-b">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-bold text-gray-800">{t("campaigns.selectConatcts")}</Label>
                    {selectedContacts.length > 0 && (
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-[11px] px-2 py-0.5">
                        {selectedContacts.length.toLocaleString()} selected
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {/* Select All on Page */}
                    <button
                      type="button"
                      onClick={() => {
                        const pageIds = displayedContacts.map((c: any) => c.id);
                        const allPageSelected = pageIds.every((id: string) => selectedContacts.includes(id));
                        if (allPageSelected) {
                          setSelectedContacts(selectedContacts.filter((id) => !pageIds.includes(id)));
                        } else {
                          setSelectedContacts(Array.from(new Set([...selectedContacts, ...pageIds])));
                        }
                      }}
                      className="text-purple-600 hover:text-purple-800 font-medium underline cursor-pointer"
                    >
                      {displayedContacts.every((c: any) => selectedContacts.includes(c.id)) && displayedContacts.length > 0
                        ? "Deselect Page"
                        : `Select Page (${displayedContacts.length})`}
                    </button>

                    {selectedContacts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedContacts([])}
                        className="text-red-500 hover:text-red-700 font-medium underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                </div>

                <ScrollArea className="h-64 border rounded-md p-3 bg-white">
                  {isContactsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                      <span className="text-xs">Loading contacts...</span>
                    </div>
                  ) : displayedContacts.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12 text-xs">
                      {contactsSearchQuery ? "No contacts matching your search query." : t("campaigns.noContactsInGroup")}
                    </div>
                  ) : (
                    displayedContacts.map((contact: any) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between py-1.5 px-2 hover:bg-gray-50 rounded-md transition"
                      >
                        <div className="flex items-center space-x-2.5">
                          <Checkbox
                            id={`contact-${contact.id}`}
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedContacts([...selectedContacts, contact.id]);
                              } else {
                                setSelectedContacts(selectedContacts.filter((id) => id !== contact.id));
                              }
                            }}
                          />
                          <Label htmlFor={`contact-${contact.id}`} className="font-normal text-xs cursor-pointer">
                            {user?.username === "demouser" ? (
                              <>
                                {contact.name.slice(0, -1).replace(/./g, "*") +
                                  contact.name.slice(-1)}{" "}
                                (
                                {contact.phone.slice(0, -4).replace(/\d/g, "*") +
                                  contact.phone.slice(-4)}
                                )
                              </>
                            ) : (
                              <>
                                <span className="font-medium text-gray-900">{contact.name || "Unnamed"}</span>{" "}
                                <span className="text-gray-500">({contact.phone})</span>
                              </>
                            )}
                          </Label>
                        </div>
                        {contact.lastIncomingMessageAt && (
                          <span className="text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
                            Active 24h
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </ScrollArea>

                {/* Pagination footer */}
                <div className="flex items-center justify-between pt-2 text-xs text-gray-600">
                  <span>
                    Total: <strong>{totalContactsCount.toLocaleString()}</strong> contacts
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={contactsPage <= 1 || isContactsLoading}
                      onClick={() => setContactsPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Prev
                    </Button>
                    <span className="text-xs px-2 font-medium">
                      Page {contactsPage} of {totalContactsPages || 1}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={contactsPage >= totalContactsPages || isContactsLoading}
                      onClick={() => setContactsPage((p) => p + 1)}
                    >
                      Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {activeChannel?.connectionMethod === "qr_code" && (
              <TabsContent value="broadcast" className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label className="mb-2 block">Search Broadcast Lists</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search list name..."
                        value={contactsSearchQuery}
                        onChange={(e) => setContactsSearchQuery(e.target.value)}
                        className="pl-9 h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Select Broadcast Lists to Send To</Label>
                  </div>
                  <ScrollArea className="h-64 border rounded-md p-4">
                    {broadcastLists.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No broadcast lists available. Create one first in Lists & Groups.
                      </div>
                    ) : (
                      broadcastLists
                        .filter((list: any) =>
                          !contactsSearchQuery ||
                          list.name.toLowerCase().includes(contactsSearchQuery.toLowerCase())
                        )
                        .map((list: any) => {
                          const listContactCount = (contacts || []).filter(
                            (c: any) => !c.isGroup && Array.isArray(c.broadcastLists) && c.broadcastLists.includes(list.name)
                          ).length;
                          
                          const listContacts = (contacts || []).filter(
                            (c: any) => !c.isGroup && Array.isArray(c.broadcastLists) && c.broadcastLists.includes(list.name)
                          );
                          const listContactIds = listContacts.map((c: any) => c.id);
                          const isFullyChecked = listContactIds.length > 0 && listContactIds.every(id => selectedContacts.includes(id));
                          
                          return (
                            <div
                              key={list.id}
                              className="flex items-center space-x-2 mb-2"
                            >
                              <Checkbox
                                checked={isFullyChecked}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedContacts(Array.from(new Set([...selectedContacts, ...listContactIds])));
                                  } else {
                                    setSelectedContacts(selectedContacts.filter(id => !listContactIds.includes(id)));
                                  }
                                }}
                              />
                              <Label className="font-normal">
                                {list.name} ({listContactCount} contact{listContactCount !== 1 ? "s" : ""})
                              </Label>
                            </div>
                          );
                        })
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            )}

            {activeChannel?.connectionMethod === "qr_code" && (
              <TabsContent value="groups" className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label className="mb-2 block">
                      Filter by CRM List
                    </Label>
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("campaigns.selectGroup")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          {t("campaigns.allGroup")}
                        </SelectItem>
                        {groups.map((group: any) => (
                          <SelectItem key={group.id} value={group.name}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="mb-2 block">Search WhatsApp Groups</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search group name..."
                        value={contactsSearchQuery}
                        onChange={(e) => setContactsSearchQuery(e.target.value)}
                        className="pl-9 h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Select WhatsApp Groups to Send To</Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={
                          selectedContacts.length === filteredGroups.length &&
                          filteredGroups.length > 0
                        }
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedContacts(
                              filteredGroups.map((c: any) => c.id)
                            );
                          } else {
                            setSelectedContacts([]);
                          }
                        }}
                      />
                      <Label className="font-normal text-sm">
                        Select All ({filteredGroups.length})
                      </Label>
                    </div>
                  </div>
                  <ScrollArea className="h-64 border rounded-md p-4">
                    {filteredGroups.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        No WhatsApp Groups found. Sync them from the Lists & Groups page.
                      </div>
                    ) : (
                      filteredGroups.map((contact: any) => (
                        <div
                          key={contact.id}
                          className="flex items-center space-x-2 mb-2"
                        >
                          <Checkbox
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedContacts([
                                  ...selectedContacts,
                                  contact.id,
                                ]);
                              } else {
                                setSelectedContacts(
                                  selectedContacts.filter(
                                    (id) => id !== contact.id
                                  )
                                );
                              }
                            }}
                          />
                          <Label className="font-normal flex items-center gap-1.5 cursor-pointer">
                            <Users className="w-4 h-4 text-green-600" />
                            <span>{contact.name}</span>
                            <span className="text-gray-400 text-xs">({contact.phone})</span>
                          </Label>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            )}

            <TabsContent value="csv" className="space-y-4">
              <div>
                <Label htmlFor="csvFile">{t("campaigns.uploadCSVFile")}</Label>
                <Input
                  id="csvFile"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      downloadSampleCSV();
                    }}
                    className="text-blue-500 hover:underline"
                  >
                    {t("campaigns.downloadSampleCSV")}
                  </a>
                </p>
              </div>

              {csvData.length > 0 && (
                <div>
                  <Label>
                    {t("campaigns.csvPreview")} ({csvData.length.toLocaleString()}{" "}
                    {t("campaigns.rows")})
                  </Label>
                  <ScrollArea className="max-h-64 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(csvData[0] || {}).map((header) => (
                            <TableHead key={header}>{header}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvData.slice(0, 5).map((row, index) => (
                          <TableRow key={index}>
                            {Object.values(row).map((value: any, i) => (
                              <TableCell key={i}>{value}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  {csvData.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Showing first 5 of {csvData.length.toLocaleString()} contacts
                    </p>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="api" className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <p className="text-sm text-blue-800">
                  {t("campaigns.tabContent")}
                </p>
              </div>
            </TabsContent>
          </CreateCampaignForm>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
