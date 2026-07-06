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
import { Trash, Edit, Plus, Users, Inbox, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { useTranslation } from "@/lib/i18n";
import { StateDisplay } from "@/components/StateDisplay";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const { data: whatsappGroups, refetch: refetchWaGroups, isLoading: loadingWaGroups } = useQuery({
    queryKey: [`/api/contacts?isGroup=true`, activeChannel?.id],
    queryFn: async () => {
      if (!activeChannel?.id) return [];
      const res = await apiRequest("GET", `/api/contacts?isGroup=true&channelId=${activeChannel.id}`);
      if (!res.ok) return [];
      const result = await res.json();
      return Array.isArray(result) ? result : (result.data || []);
    },
    enabled: !!activeChannel?.id,
  });

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
    }
  }, [activeChannel?.id]);

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
                <TabsTrigger value="internal">CRM Label Groups</TabsTrigger>
                <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                  <Users size={14} /> Groups WA
                </TabsTrigger>
              </TabsList>

              <div>
                <TabsContent value="internal" className="mt-0">
                  <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="mr-2" size={16} /> Create Group
                  </Button>
                </TabsContent>
                <TabsContent value="whatsapp" className="mt-0">
                  <Button onClick={handleSyncGroups} disabled={syncing} className="bg-green-600 hover:bg-green-700 text-white">
                    {syncing ? "Syncing..." : "Sync Groups WA"}
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
                <div className="grid grid-cols-1 gap-4">
                  {groups.map((group) => (
                    <Card
                      key={group.id}
                      className="hover:shadow-md transition-shadow duration-200"
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                              {group.name}
                            </h3>
                            {group.description && (
                              <p className="text-sm sm:text-base text-gray-600 mt-1 line-clamp-2">
                                {group.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                <Users size={12} />
                                {contactCounts[group.name] || 0} contact{(contactCounts[group.name] || 0) !== 1 ? "s" : ""}
                              </span>
                              <span className="text-xs text-gray-400">
                                Created{" "}
                                {new Date(group.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 self-end sm:self-start">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1.5"
                              onClick={() => openEdit(group)}
                            >
                              <Edit size={14} />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteGroup(group.id)}
                              className="flex items-center gap-1.5"
                            >
                              <Trash size={14} />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
                <div className="grid grid-cols-1 gap-4">
                  {whatsappGroups.map((group: any) => (
                    <Card
                      key={group.id}
                      className="hover:shadow-md transition-shadow duration-200"
                    >
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                              {group.name}
                            </h3>
                            <p className="text-sm text-gray-500 mt-1 truncate">
                              JID: {group.phone}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                                <Users size={12} />
                                WhatsApp Group
                              </span>
                              <span className="text-xs text-gray-400">
                                Synced{" "}
                                {new Date(group.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h2 className="text-xl font-semibold">CRM Label Groups</h2>
              <Button onClick={openCreateDialog} className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="mr-2" size={16} /> Create Group
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
              <div className="grid grid-cols-1 gap-4">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    className="hover:shadow-md transition-shadow duration-200"
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                            {group.name}
                          </h3>
                          {group.description && (
                            <p className="text-sm sm:text-base text-gray-600 mt-1 line-clamp-2">
                              {group.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                              <Users size={12} />
                              {contactCounts[group.name] || 0} contact{(contactCounts[group.name] || 0) !== 1 ? "s" : ""}
                            </span>
                            <span className="text-xs text-gray-400">
                              Created{" "}
                              {new Date(group.createdAt).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 self-end sm:self-start">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1.5"
                            onClick={() => openEdit(group)}
                          >
                            <Edit size={14} />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteGroup(group.id)}
                            className="flex items-center gap-1.5"
                          >
                            <Trash size={14} />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
              {editMode ? "Edit Group" : "Create Group"}
            </DialogTitle>
            <DialogDescription>
              {editMode
                ? "Update your group details below."
                : "Create a new group to organize your contacts."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Group Name <span className="text-red-500">*</span>
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
                placeholder="Add a description for this group (optional)"
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
                  : "Create Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
