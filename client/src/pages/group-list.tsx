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

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash, Edit, Plus, Users, Inbox, AlertCircle, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { StateDisplay } from "@/components/StateDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";

// Loading Skeleton Component
const GroupSkeleton = () => (
  <Card className="animate-pulse">
    <CardContent className="p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
        <div className="flex gap-2 self-end sm:self-center">
          <div className="h-9 w-20 bg-gray-200 rounded" />
          <div className="h-9 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Empty State Component
const EmptyState = ({ onCreateClick }: { onCreateClick: () => void }) => (
  <Card className="border-dashed border-2 border-gray-300">
    <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="rounded-full bg-gray-100 p-6 mb-4">
        <Users className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900">
        No groups yet
      </h3>
      <p className="text-gray-500 mb-6 max-w-sm">
        Get started by creating your first group to organize your contacts and
        campaigns effectively.
      </p>
      <Button
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={onCreateClick}
      >
        <Plus className="mr-2" size={16} /> Create Your First Group
      </Button>
    </CardContent>
  </Card>
);

const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 sm:px-6 bg-gray-50/50">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-gray-500">
            Showing Page <span className="font-medium text-gray-700">{currentPage}</span> of{" "}
            <span className="font-medium text-gray-700">{totalPages}</span>
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function GroupsUI() {
  const { toast } = useToast();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [editId, setEditId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { t } = useTranslation();
  const { data: activeChannel } = useQuery({
    queryKey: ["/api/channels/active"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/channels/active");
      if (!response.ok) return null;
      return await response.json();
    },
  });

  const [contactCounts, setContactCounts] = useState<Record<string, number>>({});
  const [syncing, setSyncing] = useState(false);
  const [importingJid, setImportingJid] = useState<string | null>(null);

  // Pagination states
  const [crmPage, setCrmPage] = useState(1);
  const [broadcastPage, setBroadcastPage] = useState(1);
  const [waPage, setWaPage] = useState(1);
  const itemsPerPage = 10;

  // Bulk WhatsApp Groups selection
  const [selectedWaGroupIds, setSelectedWaGroupIds] = useState<string[]>([]);

  const handleBulkAddWaGroupsToList = async (listName: string) => {
    if (!activeChannel?.id || selectedWaGroupIds.length === 0) return;
    try {
      const res = await apiRequest("POST", "/api/groups/add-contacts", {
        contactIds: selectedWaGroupIds,
        groupName: listName,
        channelId: activeChannel.id,
      });
      if (res.ok) {
        toast({
          title: "Lists updated",
          description: `Successfully added ${selectedWaGroupIds.length} groups to CRM List "${listName}".`,
        });
        setSelectedWaGroupIds([]);
        refetchWaGroups();
      } else {
        const errorData = await res.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to add to list.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to add to list.",
        variant: "destructive",
      });
    }
  };

  const { data: whatsappGroups, refetch: refetchWaGroups, isLoading: loadingWaGroups } = useQuery({
    queryKey: [`/api/contacts-all?isGroup=true`, activeChannel?.id],
    queryFn: async () => {
      if (!activeChannel?.id) return [];
      const res = await apiRequest("GET", `/api/contacts-all?isGroup=true&channelId=${activeChannel.id}`);
      if (!res.ok) return [];
      const result = await res.json();
      return Array.isArray(result) ? result : (result.data || []);
    },
    enabled: !!activeChannel?.id,
  });

  useEffect(() => {
    setSelectedWaGroupIds([]);
  }, [whatsappGroups]);

  const handleSyncGroups = async () => {
    if (!activeChannel?.id) return;
    setSyncing(true);
    try {
      const res = await apiRequest("POST", `/api/whatsapp/channels/${activeChannel.id}/sync-groups`);
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Groups synced",
          description: data.message || "WhatsApp groups synced successfully.",
        });
        refetchWaGroups();
      } else {
        toast({
          title: "Failed to sync groups",
          description: data.message || "Could not sync groups.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to connect to the server.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleImportWhatsAppGroup = async (jid: string) => {
    if (!activeChannel?.id) return;
    setImportingJid(jid);
    try {
      const res = await apiRequest("POST", `/api/whatsapp/channels/${activeChannel.id}/import-group`, { jid });
      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Group Imported",
          description: data.message || "WhatsApp group successfully imported.",
        });
        fetchGroups();
        fetchContactCounts();
      } else {
        toast({
          title: "Import Failed",
          description: data.message || "Failed to import group.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to connect to the server.",
        variant: "destructive",
      });
    } finally {
      setImportingJid(null);
    }
  };

  const handleToggleGroupLabel = async (whatsappGroup: any, labelName: string) => {
    const currentLabels = whatsappGroup.groups || [];
    const isAssigned = currentLabels.includes(labelName);
    const updatedGroups = isAssigned
      ? currentLabels.filter((g: string) => g !== labelName)
      : [...currentLabels, labelName];

    try {
      const res = await apiRequest("PUT", `/api/contacts/${whatsappGroup.id}`, {
        groups: updatedGroups,
      });
      if (res.ok) {
        toast({
          title: "Labels updated",
          description: `WhatsApp group labels updated successfully.`,
        });
        refetchWaGroups();
      } else {
        const errorData = await res.json();
        toast({
          title: "Error",
          description: errorData.error || "Failed to update labels.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update labels.",
        variant: "destructive",
      });
    }
  };

  const [broadcastLists, setBroadcastLists] = useState<any[]>([]);
  const [listName, setListName] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [openListDialog, setOpenListDialog] = useState(false);
  const [listEditMode, setListEditMode] = useState(false);
  const [listEditId, setListEditId] = useState<string | null>(null);
  const [isListSubmitting, setIsListSubmitting] = useState(false);
  const [listContactCounts, setListContactCounts] = useState<Record<string, number>>({});

  const fetchBroadcastLists = async () => {
    if (!activeChannel?.id) return;
    try {
      setLoading(true);
      const res = await apiRequest("GET", `/api/broadcast-lists?channelId=${activeChannel?.id}`);
      const data = await res.json();
      setBroadcastLists(data.broadcastLists || []);
    } catch (err) {
      toast({ title: "Error", description: "Failed to fetch broadcast lists", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchListContactCounts = async () => {
    if (!activeChannel?.id) return;
    try {
      const res = await apiRequest("GET", `/api/broadcast-lists/contact-counts?channelId=${activeChannel?.id}`);
      const data = await res.json();
      if (data.success) {
        setListContactCounts(data.counts || {});
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroups = async () => {
    if (!activeChannel?.id) return;

    try {
      setLoading(true);
      const res = await apiRequest(
        "GET",
        `/api/groups?channelId=${activeChannel?.id}`
      );
      const data = await res.json();
      setGroups(data.groups || []);
      setLoading(false);
    } catch (err) {
      console.log(err);
      toast({
        title: "Error",
        description: "Failed to fetch groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchContactCounts = async () => {
    if (!activeChannel?.id) return;
    try {
      const res = await apiRequest(
        "GET",
        `/api/groups/contact-counts?channelId=${activeChannel?.id}`
      );
      const data = await res.json();
      if (data.success) {
        setContactCounts(data.counts || {});
      }
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (activeChannel?.id) {
      fetchGroups();
      fetchContactCounts();
      fetchBroadcastLists();
      fetchListContactCounts();
    }
  }, [activeChannel?.id]);

  const totalCrmPages = Math.ceil(groups.length / itemsPerPage);
  const paginatedCrmLists = groups.slice(
    (crmPage - 1) * itemsPerPage,
    crmPage * itemsPerPage
  );

  const totalBroadcastPages = Math.ceil(broadcastLists.length / itemsPerPage);
  const paginatedBroadcastLists = broadcastLists.slice(
    (broadcastPage - 1) * itemsPerPage,
    broadcastPage * itemsPerPage
  );

  const waGroupsList = whatsappGroups || [];
  const totalWaPages = Math.ceil(waGroupsList.length / itemsPerPage);
  const paginatedWaGroups = waGroupsList.slice(
    (waPage - 1) * itemsPerPage,
    waPage * itemsPerPage
  );

  // Create or update group
  const saveGroup = async () => {
    if (!groupName.trim()) {
      return toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
    }

    const payload = {
      name: groupName,
      description: groupDescription,
      channelId: activeChannel?.id,
    };

    setIsSubmitting(true);

    try {
      let res;
      if (editMode) {
        res = await fetch(`/api/groups/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!data.success) {
        return toast({
          title: "Error",
          description: data.error || "Something went wrong",
          variant: "destructive",
        });
      }

      toast({
        title: editMode ? "Group updated!" : "Group created!",
        description: data.message || "Operation completed successfully.",
      });

      setOpenDialog(false);
      setGroupName("");
      setGroupDescription("");
      setEditMode(false);
      setEditId(null);

      fetchGroups();
      fetchContactCounts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete group
  const deleteGroup = async (id: string) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Group deleted!",
          description: data.message || "Group deleted successfully",
        });
        fetchGroups();
        fetchContactCounts();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete group",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroupContacts = async (id: string, groupName: string) => {
    if (!confirm(`Are you sure you want to delete all contacts inside the group "${groupName}"? This will delete the contacts from the CRM.`)) return;

    try {
      const res = await fetch(`/api/groups/${id}/contacts`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Contacts deleted!",
          description: data.message || "Contacts deleted successfully",
        });
        fetchContactCounts();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete contacts",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const saveBroadcastList = async () => {
    if (!listName.trim()) {
      return toast({
        title: "Error",
        description: "Broadcast list name is required",
        variant: "destructive",
      });
    }

    const payload = {
      name: listName,
      description: listDescription,
      channelId: activeChannel?.id,
    };

    setIsListSubmitting(true);

    try {
      let res;
      if (listEditMode) {
        res = await fetch(`/api/broadcast-lists/${listEditId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/broadcast-lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!data.success) {
        return toast({
          title: "Error",
          description: data.error || "Something went wrong",
          variant: "destructive",
        });
      }

      toast({
        title: listEditMode ? "Broadcast list updated!" : "Broadcast list created!",
        description: listEditMode ? "Broadcast list updated successfully" : "Broadcast list created successfully",
      });

      setOpenListDialog(false);
      setListName("");
      setListDescription("");
      setListEditMode(false);
      setListEditId(null);

      fetchBroadcastLists();
      fetchListContactCounts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsListSubmitting(false);
    }
  };

  const deleteBroadcastList = async (id: string) => {
    if (!confirm("Are you sure you want to delete this broadcast list?")) return;

    try {
      const res = await fetch(`/api/broadcast-lists/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Broadcast list deleted!",
          description: data.message || "Broadcast list deleted successfully",
        });
        fetchBroadcastLists();
        fetchListContactCounts();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete broadcast list",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBroadcastListContacts = async (id: string, listName: string) => {
    if (!confirm(`Are you sure you want to delete all contacts inside the broadcast list "${listName}"? This will delete the contacts from the CRM.`)) return;

    try {
      const res = await fetch(`/api/broadcast-lists/${id}/contacts`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: "Contacts deleted!",
          description: data.message || "Contacts deleted successfully",
        });
        fetchListContactCounts();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete contacts",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      });
    }
  };

  // Open create dialog
  const openCreateDialog = () => {
    setEditMode(false);
    setEditId(null);
    setGroupName("");
    setGroupDescription("");
    setOpenDialog(true);
  };

  // Open edit modal
  const openEdit = (group: any) => {
    setEditMode(true);
    setEditId(group.id);
    setGroupName(group.name);
    setGroupDescription(group.description || "");
    setOpenDialog(true);
  };

  // if (activeChannel.id) {
  //   return <StateDisplay />;
  // }
  // if (!activeChannel || !activeChannel.id) {
  //   return (
  //     <StateDisplay
  //       variant="error"
  //       icon={AlertCircle}
  //       title="Failed to Load Channels"
  //       description={"Something went wrong while fetching Channels."}
  //       buttonText="Try Again"
  //       onButtonClick={() => window.location.reload()}
  //     />
  //   );
  // }

  return (
    <div className="flex-1 dots-bg min-h-screen">
      <Header
        title={t("groups.title")}
        subtitle={t("groups.subtitle")}
      />
      <div className="p-6 space-y-6">
        {activeChannel?.connectionMethod === "qr_code" ? (
          <Tabs defaultValue="internal" className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 mb-4 gap-4">
              <TabsList>
                <TabsTrigger value="internal">CRM Lists</TabsTrigger>
                <TabsTrigger value="broadcast" className="flex items-center gap-2">
                  <Inbox size={14} /> Broadcast Lists
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                  <Users size={14} /> WhatsApp Groups
                </TabsTrigger>
              </TabsList>

              <div>
                <TabsContent value="internal" className="mt-0">
                  <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="mr-2" size={16} /> Create CRM List
                  </Button>
                </TabsContent>
                <TabsContent value="broadcast" className="mt-0">
                  <Button
                    onClick={() => {
                      setListEditMode(false);
                      setListEditId(null);
                      setListName("");
                      setListDescription("");
                      setOpenListDialog(true);
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="mr-2" size={16} /> Create Broadcast List
                  </Button>
                </TabsContent>
                <TabsContent value="whatsapp" className="mt-0">
                  <Button onClick={handleSyncGroups} disabled={syncing} className="bg-green-600 hover:bg-green-700 text-white">
                    {syncing ? "Syncing..." : "Sync WhatsApp Groups"}
                  </Button>
                </TabsContent>
              </div>
            </div>

            <TabsContent value="internal" className="space-y-4">
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <GroupSkeleton key={i} />
                  ))}
                </>
              ) : groups.length === 0 ? (
                <EmptyState onCreateClick={openCreateDialog} />
              ) : (
                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700">Name</TableHead>
                        <TableHead className="font-semibold text-gray-700">Description</TableHead>
                        <TableHead className="font-semibold text-gray-700">Type</TableHead>
                        <TableHead className="font-semibold text-gray-700">Contacts Count</TableHead>
                        <TableHead className="font-semibold text-gray-700">Created At</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedCrmLists.map((group) => (
                        <TableRow key={group.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-semibold text-gray-900">{group.name}</TableCell>
                          <TableCell className="text-gray-500 max-w-[200px] truncate">{group.description || "-"}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center text-[11px] font-medium text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                              Contact List
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-700">{contactCounts[group.name] || 0} contacts</TableCell>
                          <TableCell className="text-gray-500">
                            {new Date(group.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-white hover:bg-blue-600 border-blue-200 h-8 px-2.5 text-xs font-medium"
                                onClick={() => window.location.href = `/contacts?group=${encodeURIComponent(group.name)}`}
                              >
                                <Users size={12} className="mr-1" /> View Contacts
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-gray-600 hover:text-white hover:bg-gray-600 border-gray-200 h-8 px-2.5 text-xs font-medium"
                                onClick={() => openEdit(group)}
                              >
                                <Edit size={12} className="mr-1" /> Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-amber-600 hover:text-white hover:bg-amber-600 border-amber-200 h-8 px-2.5 text-xs font-medium"
                                onClick={() => handleDeleteGroupContacts(group.id, group.name)}
                              >
                                <Trash size={12} className="mr-1" /> Clear Contacts
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 h-8 px-2.5 text-xs font-medium"
                                onClick={() => deleteGroup(group.id)}
                              >
                                <Trash size={12} className="mr-1" /> Delete List
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    currentPage={crmPage}
                    totalPages={totalCrmPages}
                    onPageChange={setCrmPage}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="broadcast" className="space-y-4">
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <GroupSkeleton key={i} />
                  ))}
                </>
              ) : broadcastLists.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-300">
                  <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="rounded-full bg-gray-100 p-6 mb-4">
                      <Inbox className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">
                      No broadcast lists yet
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm">
                      Create broadcast lists to group contacts for direct campaign broadcasts.
                    </p>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => {
                        setListEditMode(false);
                        setListEditId(null);
                        setListName("");
                        setListDescription("");
                        setOpenListDialog(true);
                      }}
                    >
                      <Plus className="mr-2" size={16} /> Create Your First List
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                  <Table>
                    <TableHeader className="bg-gray-50">
                      <TableRow>
                        <TableHead className="font-semibold text-gray-700">Name</TableHead>
                        <TableHead className="font-semibold text-gray-700">Description</TableHead>
                        <TableHead className="font-semibold text-gray-700">Type</TableHead>
                        <TableHead className="font-semibold text-gray-700">Contacts Count</TableHead>
                        <TableHead className="font-semibold text-gray-700">Created At</TableHead>
                        <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedBroadcastLists.map((list) => (
                        <TableRow key={list.id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="font-semibold text-gray-900">{list.name}</TableCell>
                          <TableCell className="text-gray-500 max-w-[200px] truncate">{list.description || "-"}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center text-[11px] font-medium text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
                              Broadcast List
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-700">{listContactCounts[list.name] || 0} contacts</TableCell>
                          <TableCell className="text-gray-500">
                            {new Date(list.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 hover:text-white hover:bg-blue-600 border-blue-200 h-8 px-2.5 text-xs font-medium"
                                onClick={() => window.location.href = `/contacts?broadcast=${encodeURIComponent(list.name)}`}
                              >
                                <Users size={12} className="mr-1" /> View Contacts
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-gray-600 hover:text-white hover:bg-gray-600 border-gray-200 h-8 px-2.5 text-xs font-medium"
                                onClick={() => {
                                  setListEditMode(true);
                                  setListEditId(list.id);
                                  setListName(list.name);
                                  setListDescription(list.description || "");
                                  setOpenListDialog(true);
                                }}
                              >
                                <Edit size={12} className="mr-1" /> Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-amber-600 hover:text-white hover:bg-amber-600 border-amber-200 h-8 px-2.5 text-xs font-medium"
                                onClick={() => handleDeleteBroadcastListContacts(list.id, list.name)}
                              >
                                <Trash size={12} className="mr-1" /> Clear Contacts
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 h-8 px-2.5 text-xs font-medium"
                                onClick={() => deleteBroadcastList(list.id)}
                              >
                                <Trash size={12} className="mr-1" /> Delete List
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <PaginationControls
                    currentPage={broadcastPage}
                    totalPages={totalBroadcastPages}
                    onPageChange={setBroadcastPage}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4">
              {loadingWaGroups ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <GroupSkeleton key={i} />
                  ))}
                </>
              ) : !whatsappGroups || whatsappGroups.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-300">
                  <CardContent className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="rounded-full bg-gray-100 p-6 mb-4">
                      <Users className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">
                      No WhatsApp Groups Synced
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm">
                      Sync your participating WhatsApp groups to send campaigns and manage group conversations directly.
                    </p>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={handleSyncGroups}
                      disabled={syncing}
                    >
                      {syncing ? "Syncing..." : "Sync Groups Now"}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {selectedWaGroupIds.length > 0 && (
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                      <span className="text-sm font-medium text-indigo-800">
                        {selectedWaGroupIds.length} WhatsApp Group{selectedWaGroupIds.length !== 1 ? "s" : ""} selected
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="default" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1">
                            <Plus size={14} /> Add Selected to CRM List...
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuLabel>Select CRM List</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {groups.length === 0 ? (
                            <div className="text-xs text-gray-500 p-2 text-center">
                              No CRM lists available.
                            </div>
                          ) : (
                            groups.map((lg) => (
                              <DropdownMenuItem
                                key={lg.id}
                                onClick={() => handleBulkAddWaGroupsToList(lg.name)}
                              >
                                {lg.name}
                              </DropdownMenuItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-gray-600 hover:text-gray-800"
                        onClick={() => setSelectedWaGroupIds([])}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={paginatedWaGroups.length > 0 && paginatedWaGroups.every((g) => selectedWaGroupIds.includes(g.id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  const currentIds = paginatedWaGroups.map((g) => g.id);
                                  setSelectedWaGroupIds((prev) => Array.from(new Set([...prev, ...currentIds])));
                                } else {
                                  const currentIds = paginatedWaGroups.map((g) => g.id);
                                  setSelectedWaGroupIds((prev) => prev.filter((id) => !currentIds.includes(id)));
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">Name</TableHead>
                          <TableHead className="font-semibold text-gray-700">JID / Phone</TableHead>
                          <TableHead className="font-semibold text-gray-700">Type</TableHead>
                          <TableHead className="font-semibold text-gray-700">Assigned CRM Lists</TableHead>
                          <TableHead className="font-semibold text-gray-700">Synced At</TableHead>
                          <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedWaGroups.map((group) => (
                          <TableRow key={group.id} className="hover:bg-gray-50/50 transition-colors">
                            <TableCell>
                              <Checkbox
                                checked={selectedWaGroupIds.includes(group.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedWaGroupIds((prev) => [...prev, group.id]);
                                  } else {
                                    setSelectedWaGroupIds((prev) => prev.filter((id) => id !== group.id));
                                  }
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-gray-900">{group.name}</TableCell>
                            <TableCell className="text-gray-500 font-mono text-xs truncate max-w-[200px]">{group.phone}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center text-[11px] font-medium text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full">
                                WhatsApp Group
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {group.groups && group.groups.length > 0 ? (
                                  group.groups.map((label: string) => (
                                    <span
                                      key={label}
                                      className="inline-flex items-center text-[10px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded"
                                    >
                                      <Tag size={8} className="mr-1" />
                                      {label}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-gray-400 italic">None</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-500">
                              {new Date(group.createdAt).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                                    <Plus size={14} /> Add to List
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel>Add to CRM Lists</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {groups.length === 0 ? (
                                    <div className="text-xs text-gray-500 p-2 text-center">
                                      No CRM lists created. Create them in the CRM Lists tab.
                                    </div>
                                  ) : (
                                    groups.map((labelGroup: any) => {
                                      const isAssigned = (group.groups || []).includes(labelGroup.name);
                                      return (
                                        <DropdownMenuCheckboxItem
                                          key={labelGroup.id}
                                          checked={isAssigned}
                                          onCheckedChange={() => handleToggleGroupLabel(group, labelGroup.name)}
                                        >
                                          {labelGroup.name}
                                        </DropdownMenuCheckboxItem>
                                      );
                                    })
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <PaginationControls
                      currentPage={waPage}
                      totalPages={totalWaPages}
                      onPageChange={setWaPage}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-xl font-semibold">CRM Lists</h2>
              <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="mr-2" size={16} /> Create CRM List
              </Button>
            </div>

            {loading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <GroupSkeleton key={i} />
                ))}
              </>
            ) : groups.length === 0 ? (
              <EmptyState onCreateClick={openCreateDialog} />
            ) : (
              <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="font-semibold text-gray-700">Name</TableHead>
                      <TableHead className="font-semibold text-gray-700">Description</TableHead>
                      <TableHead className="font-semibold text-gray-700">Type</TableHead>
                      <TableHead className="font-semibold text-gray-700">Contacts Count</TableHead>
                      <TableHead className="font-semibold text-gray-700">Created At</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCrmLists.map((group) => (
                      <TableRow key={group.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="font-semibold text-gray-900">{group.name}</TableCell>
                        <TableCell className="text-gray-500 max-w-[200px] truncate">{group.description || "-"}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center text-[11px] font-medium text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                            Contact List
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-700">{contactCounts[group.name] || 0} contacts</TableCell>
                        <TableCell className="text-gray-500">
                          {new Date(group.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-white hover:bg-blue-600 border-blue-200 h-8 px-2.5 text-xs font-medium"
                              onClick={() => window.location.href = `/contacts?group=${encodeURIComponent(group.name)}`}
                            >
                              <Users size={12} className="mr-1" /> View Contacts
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-gray-600 hover:text-white hover:bg-gray-600 border-gray-200 h-8 px-2.5 text-xs font-medium"
                              onClick={() => openEdit(group)}
                            >
                              <Edit size={12} className="mr-1" /> Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-600 hover:text-white hover:bg-amber-600 border-amber-200 h-8 px-2.5 text-xs font-medium"
                              onClick={() => handleDeleteGroupContacts(group.id, group.name)}
                            >
                              <Trash size={12} className="mr-1" /> Clear Contacts
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="bg-red-600 hover:bg-red-700 h-8 px-2.5 text-xs font-medium"
                              onClick={() => deleteGroup(group.id)}
                            >
                              <Trash size={12} className="mr-1" /> Delete List
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <PaginationControls
                  currentPage={crmPage}
                  totalPages={totalCrmPages}
                  onPageChange={setCrmPage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editMode ? "Edit CRM List" : "Create CRM List"}
            </DialogTitle>
            <DialogDescription>
              {editMode
                ? "Update your list details below."
                : "Create a new CRM list to organize your contacts."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                List Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g., VIP Customers"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Description
              </label>
              <Textarea
                placeholder="Add a description for this CRM list (optional)"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                disabled={isSubmitting}
                rows={4}
                className="w-full resize-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpenDialog(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                onClick={saveGroup}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : editMode
                  ? "Save Changes"
                  : "Create List"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Broadcast List Dialog */}
      <Dialog open={openListDialog} onOpenChange={setOpenListDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {listEditMode ? "Edit Broadcast List" : "Create Broadcast List"}
            </DialogTitle>
            <DialogDescription>
              {listEditMode
                ? "Update your broadcast list details below."
                : "Create a new broadcast list to group contacts for direct broadcasts."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                List Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g., Summer Promo List"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                disabled={isListSubmitting}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Description
              </label>
              <Textarea
                placeholder="Add a description for this broadcast list (optional)"
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value)}
                disabled={isListSubmitting}
                rows={4}
                className="w-full resize-none"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setOpenListDialog(false)}
                disabled={isListSubmitting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                onClick={saveBroadcastList}
                disabled={isListSubmitting}
              >
                {isListSubmitting
                  ? "Saving..."
                  : listEditMode
                  ? "Save Changes"
                  : "Create List"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
