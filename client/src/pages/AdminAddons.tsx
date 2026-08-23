import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Puzzle, Users, Settings, Plus, Edit2, ToggleLeft, ToggleRight, Check, X, ShieldAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Addon {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: string;
  billingCycle: string;
  aiKeyType: "tenant" | "admin";
  defaultCredits: number;
  isActive: boolean;
}

interface Subscription {
  id: string;
  tenantName: string;
  tenantEmail: string;
  addonName: string;
  addonSlug: string;
  addonPrice: string;
  status: string;
  credits: number;
  maxCredits: number;
  expiresAt: string | null;
  createdAt: string;
}

export default function AdminAddons() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [aiKeyType, setAiKeyType] = useState<"tenant" | "admin">("tenant");
  const [defaultCredits, setDefaultCredits] = useState("0");

  // Fetch addons
  const { data: addons, isLoading: loadingAddons } = useQuery<Addon[]>({
    queryKey: ["/api/admin/addons"],
  });

  // Fetch subscriptions
  const { data: subscriptions, isLoading: loadingSubs } = useQuery<Subscription[]>({
    queryKey: ["/api/admin/addons/subscriptions"],
  });

  // Add/Edit Addon Mutation
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiRequest("POST", "/api/admin/addons", payload);
      if (!res.ok) throw new Error("Failed to save addon");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Addon saved successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/addons"] });
      setIsFormOpen(false);
      resetForm();
    },
  });

  // Toggle Addon Mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PUT", `/api/admin/addons/${id}/toggle`);
      if (!res.ok) throw new Error("Failed to toggle status");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status Updated", description: "Addon status updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/addons"] });
    },
  });

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setPrice("0");
    setBillingCycle("monthly");
    setAiKeyType("tenant");
    setDefaultCredits("0");
    setEditingAddon(null);
  };

  const handleEdit = (addon: Addon) => {
    setEditingAddon(addon);
    setName(addon.name);
    setSlug(addon.slug);
    setDescription(addon.description || "");
    setPrice(addon.price);
    setBillingCycle(addon.billingCycle || "monthly");
    setAiKeyType(addon.aiKeyType || "tenant");
    setDefaultCredits(String(addon.defaultCredits || 0));
    setIsFormOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      id: editingAddon?.id,
      name,
      slug,
      description,
      price,
      billingCycle,
      aiKeyType,
      defaultCredits: parseInt(defaultCredits, 10) || 0,
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
            <Settings className="text-green-600 w-8 h-8" /> Addons & Plugins Management
          </h1>
          <p className="text-gray-500">
            Define system plugins, enable/disable modules, assign credits, and configure tenant AI key settings.
          </p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 text-white font-medium flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Create Addon
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>{editingAddon ? "Edit Addon" : "Register New Addon"}</DialogTitle>
              <DialogDescription>Define plugin configurations and billing rules below.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" placeholder="Expense Module" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="slug" className="text-right">Slug</Label>
                <Input id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="col-span-3" placeholder="expense-tracker" disabled={!!editingAddon} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="desc" className="text-right">Description</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" placeholder="Addon features summary..." />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">Price ($)</Label>
                <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="cycle" className="text-right">Cycle</Label>
                <select id="cycle" value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)} className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="keyType" className="text-right">AI Key</Label>
                <select id="keyType" value={aiKeyType} onChange={(e) => setAiKeyType(e.target.value as any)} className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <option value="tenant">Tenant-based (Uses customer keys)</option>
                  <option value="admin">Admin-provided (Uses platform keys)</option>
                </select>
              </div>
              {aiKeyType === "admin" && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="credits" className="text-right">Default Credits</Label>
                  <Input id="credits" type="number" value={defaultCredits} onChange={(e) => setDefaultCredits(e.target.value)} className="col-span-3" placeholder="100" />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="addons" className="w-full">
        <TabsList className="grid w-[400px] grid-cols-2">
          <TabsTrigger value="addons" className="flex items-center gap-1.5"><Puzzle className="w-4 h-4" /> Addons Register</TabsTrigger>
          <TabsTrigger value="subs" className="flex items-center gap-1.5"><Users className="w-4 h-4" /> Active Subscriptions</TabsTrigger>
        </TabsList>

        <TabsContent value="addons" className="bg-white p-4 border border-gray-150 rounded-lg shadow-xs mt-4">
          {loadingAddons ? (
            <div className="py-12 text-center text-gray-500">Loading addons register...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Key Type</TableHead>
                  <TableHead>Def. Credits</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {addons?.map((addon) => (
                  <TableRow key={addon.id}>
                    <TableCell className="font-bold text-gray-800">{addon.name}</TableCell>
                    <TableCell className="font-mono text-xs">{addon.slug}</TableCell>
                    <TableCell className="font-semibold">${parseFloat(addon.price).toFixed(2)}</TableCell>
                    <TableCell className="capitalize">{addon.billingCycle}</TableCell>
                    <TableCell className="capitalize">{addon.aiKeyType}</TableCell>
                    <TableCell>{addon.defaultCredits}</TableCell>
                    <TableCell>
                      <button onClick={() => toggleMutation.mutate(addon.id)} className="focus:outline-none">
                        {addon.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Inactive</span>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(addon)} className="h-8 w-8 p-0">
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="subs" className="bg-white p-4 border border-gray-150 rounded-lg shadow-xs mt-4">
          {loadingSubs ? (
            <div className="py-12 text-center text-gray-500">Loading subscriber lists...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Plugin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions?.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-850">{sub.tenantName}</span>
                        <span className="text-xs text-gray-400">{sub.tenantEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{sub.addonName}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                        sub.status === "active" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}>
                        {sub.status}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono">
                      {sub.credits} / {sub.maxCredits}
                    </TableCell>
                    <TableCell>
                      {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      {new Date(sub.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
