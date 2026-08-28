import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ShoppingCart, Package, Settings, ClipboardList, Users, Plus, Trash, Edit, RefreshCw, FileText, CheckCircle, ExternalLink } from "lucide-react";
import { useChannelContext } from "@/contexts/channel-context";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ChannelSwitcher } from "@/components/channel-switcher";

interface Product {
  id: string;
  name: string;
  price: string;
  description: string | null;
  photos: string[] | string;
  checkoutLink: string | null;
  triggerKeyword: string | null;
  isTriggerEnabled: boolean;
  createdAt: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerPhone: string;
  customerName: string | null;
  customerData: Record<string, any>;
  productId: string | null;
  productName: string | null;
  price: string;
  quantity: number;
  totalAmount: string;
  paymentMethod: string;
  paymentStatus: string;
  receiptUrl: string | null;
  status: string;
  createdAt: string;
}

interface Customer {
  phone: string;
  name: string | null;
  lastOrderDate: string;
  totalOrders: string;
  totalSpent: string;
}

interface EcommerceConfig {
  id: string;
  storeTriggerKeyword: string;
  isStoreFlowActive: boolean;
  welcomeMessage: string;
  welcomeHeaderUrl: string | null;
  welcomeHeaderType: string;
  qrCodeUrl: string | null;
  checkoutFields: string[];
  instamojoApiKey: string | null;
  instamojoAuthToken: string | null;
  instamojoSandbox: boolean;
  razorpayKeyId: string | null;
  razorpayKeySecret: string | null;
  isActive: boolean;
}

export default function EcommerceLedger() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedChannel } = useChannelContext();

  const channelId = selectedChannel?.id;

  // Active Tab
  const [activeTab, setActiveTab] = useState("products");

  // Modals Open state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Filters for Orders
  const [search, setSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Product Form states
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPhotos, setProdPhotos] = useState("");
  const [prodCheckoutLink, setProdCheckoutLink] = useState("");
  const [prodTrigger, setProdTrigger] = useState("");
  const [prodTriggerEnabled, setProdTriggerEnabled] = useState(false);

  // Store Configuration Form states
  const [storeKeyword, setStoreKeyword] = useState("store");
  const [storeFlowActive, setStoreFlowActive] = useState(true);
  const [welcomeMsg, setWelcomeMsg] = useState("Welcome to our store!");
  const [welcomeHeaderUrl, setWelcomeHeaderUrl] = useState("");
  const [welcomeHeaderType, setWelcomeHeaderType] = useState("image");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [checkoutFieldsText, setCheckoutFieldsText] = useState("name, phone, address, pin");
  const [instaKey, setInstaKey] = useState("");
  const [instaToken, setInstaToken] = useState("");
  const [instaSandbox, setInstaSandbox] = useState(true);
  const [rzpKeyId, setRzpKeyId] = useState("");
  const [rzpKeySecret, setRzpKeySecret] = useState("");
  const [configActive, setConfigActive] = useState(true);

  // Queries
  // 1. Fetch Ecommerce Config
  const { data: config, isLoading: isConfigLoading } = useQuery<EcommerceConfig | null>({
    queryKey: ["/api/ecommerce/config", channelId],
    queryFn: async () => {
      if (!channelId) return null;
      const res = await fetch(`/api/ecommerce/config?channelId=${channelId}`);
      if (!res.ok) throw new Error("Failed to fetch store config");
      return res.json();
    },
    enabled: !!channelId,
  });

  // Populate config form when loaded
  React.useEffect(() => {
    if (config) {
      setStoreKeyword(config.storeTriggerKeyword || "store");
      setStoreFlowActive(config.isStoreFlowActive !== undefined ? config.isStoreFlowActive : true);
      setWelcomeMsg(config.welcomeMessage || "Welcome to our store!");
      setWelcomeHeaderUrl(config.welcomeHeaderUrl || "");
      setWelcomeHeaderType(config.welcomeHeaderType || "image");
      setQrCodeUrl(config.qrCodeUrl || "");
      setCheckoutFieldsText(
        Array.isArray(config.checkoutFields)
          ? config.checkoutFields.join(", ")
          : "name, phone, address, pin"
      );
      setInstaKey(config.instamojoApiKey || "");
      setInstaToken(config.instamojoAuthToken || "");
      setInstaSandbox(config.instamojoSandbox !== undefined ? config.instamojoSandbox : true);
      setRzpKeyId(config.razorpayKeyId || "");
      setRzpKeySecret(config.razorpayKeySecret || "");
      setConfigActive(config.isActive !== undefined ? config.isActive : true);
    }
  }, [config]);

  // 2. Fetch Products
  const { data: products = [], isLoading: isProductsLoading } = useQuery<Product[]>({
    queryKey: ["/api/ecommerce/products"],
    queryFn: async () => {
      const res = await fetch("/api/ecommerce/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
  });

  // 3. Fetch Orders
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ["/api/ecommerce/orders", search, orderStatus, paymentStatus, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search,
        status: orderStatus,
        paymentStatus,
      });
      const res = await fetch(`/api/ecommerce/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  // 4. Fetch Customers
  const { data: customers = [], isLoading: isCustomersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/ecommerce/customers"],
    queryFn: async () => {
      const res = await fetch("/api/ecommerce/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  // Mutations
  // 1. Create or Update Product
  const saveProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest("POST", "/api/ecommerce/products", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/products"] });
      toast({ title: editingProduct ? "Product Updated" : "Product Created", description: "Successfully saved product." });
      setIsProductModalOpen(false);
      resetProductForm();
    },
    onError: (err: any) => {
      toast({ title: "Failed to save product", description: err.message, variant: "destructive" });
    },
  });

  // 2. Delete Product
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/ecommerce/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/products"] });
      toast({ title: "Product Deleted", description: "Successfully removed product." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to delete product", description: err.message, variant: "destructive" });
    },
  });

  // 3. Save Store Config
  const saveConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest("POST", "/api/ecommerce/config", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/config", channelId] });
      toast({ title: "Configuration Saved", description: "Successfully updated store settings." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to save config", description: err.message, variant: "destructive" });
    },
  });

  // 4. Update Order Status
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status, paymentStatus }: { id: string; status?: string; paymentStatus?: string }) => {
      return apiRequest("POST", `/api/ecommerce/orders/${id}/status`, { status, paymentStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/customers"] });
      toast({ title: "Order Updated", description: "Successfully updated status and triggered WhatsApp notification." });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update order", description: err.message, variant: "destructive" });
    },
  });

  const resetProductForm = () => {
    setEditingProduct(null);
    setProdName("");
    setProdPrice("");
    setProdDesc("");
    setProdPhotos("");
    setProdCheckoutLink("");
    setProdTrigger("");
    setProdTriggerEnabled(false);
  };

  const handleEditProductClick = (product: Product) => {
    setEditingProduct(product);
    setProdName(product.name);
    setProdPrice(product.price);
    setProdDesc(product.description || "");
    let photoUrls = "";
    if (product.photos) {
      photoUrls = Array.isArray(product.photos)
        ? product.photos.join(", ")
        : String(product.photos);
    }
    setProdPhotos(photoUrls);
    setProdCheckoutLink(product.checkoutLink || "");
    setProdTrigger(product.triggerKeyword || "");
    setProdTriggerEnabled(product.isTriggerEnabled);
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const photosArray = prodPhotos
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);

    const payload: any = {
      name: prodName,
      price: prodPrice,
      description: prodDesc,
      photos: photosArray,
      checkoutLink: prodCheckoutLink,
      triggerKeyword: prodTrigger,
      isTriggerEnabled: prodTriggerEnabled,
    };

    if (editingProduct) {
      payload.id = editingProduct.id;
    }

    saveProductMutation.mutate(payload);
  };

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId) {
      toast({ title: "No Channel Selected", description: "Please activate a WhatsApp channel first.", variant: "destructive" });
      return;
    }

    const fieldsArray = checkoutFieldsText
      .split(",")
      .map((f) => f.trim().toLowerCase())
      .filter(Boolean);

    const payload = {
      channelId,
      storeTriggerKeyword: storeKeyword,
      isStoreFlowActive: storeFlowActive,
      welcomeMessage: welcomeMsg,
      welcomeHeaderUrl,
      welcomeHeaderType,
      qrCodeUrl,
      checkoutFields: fieldsArray,
      instamojoApiKey: instaKey,
      instamojoAuthToken: instaToken,
      instamojoSandbox: instaSandbox,
      razorpayKeyId: rzpKeyId,
      razorpayKeySecret: rzpKeySecret,
      isActive: configActive,
    };

    saveConfigMutation.mutate(payload);
  };

  if (!channelId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
        <ShoppingCart className="w-16 h-16 text-gray-300 mb-2" />
        <h2 className="text-xl font-bold text-gray-700">No Active Channel Selected</h2>
        <p className="text-gray-500 max-w-sm text-center">
          Please select a WhatsApp channel to manage your store catalog and settings.
        </p>
        <div className="w-64">
          <ChannelSwitcher />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-emerald-600" />
            Ecommerce Module Store Manager
          </h1>
          <p className="text-gray-500 text-sm">
            Configure automated checkout flows, products list, and track customer orders.
          </p>
        </div>

        <Dialog open={isProductModalOpen} onOpenChange={(open) => {
          setIsProductModalOpen(open);
          if (!open) resetProductForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>
                Provide details of the product to make it purchasable on WhatsApp.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleProductSubmit} className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Premium Leather Wallet"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="price">Price ($ or INR) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  placeholder="e.g. 29.99"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Short description..."
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="photos">Product Photos (comma-separated URLs)</Label>
                <Textarea
                  id="photos"
                  value={prodPhotos}
                  onChange={(e) => setProdPhotos(e.target.value)}
                  placeholder="e.g. https://img.com/1.png, https://img.com/2.png"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="chkLink">Checkout Link (Optional redirect)</Label>
                <Input
                  id="chkLink"
                  value={prodCheckoutLink}
                  onChange={(e) => setProdCheckoutLink(e.target.value)}
                  placeholder="e.g. https://store.com/buy-now"
                />
              </div>

              <div className="border p-3 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <Label className="font-semibold">Individual Keyword Trigger</Label>
                    <span className="text-xs text-gray-500">Allow customers to buy this product directly via keyword trigger.</span>
                  </div>
                  <Switch checked={prodTriggerEnabled} onCheckedChange={setProdTriggerEnabled} />
                </div>
                {prodTriggerEnabled && (
                  <div className="space-y-1">
                    <Label htmlFor="keyword">Trigger Word</Label>
                    <Input
                      id="keyword"
                      value={prodTrigger}
                      onChange={(e) => setProdTrigger(e.target.value)}
                      placeholder="e.g. wallet, buywallet"
                      required
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveProductMutation.isPending}>
                  {saveProductMutation.isPending ? "Saving..." : "Save Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-100 p-1 rounded-lg border flex w-fit gap-1 mb-4">
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Products ({products.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Orders ({ordersData?.total || 0})
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Customers ({customers.length})
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Store Settings
          </TabsTrigger>
        </TabsList>

        {/* 1. PRODUCTS TAB */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Catalog Products</CardTitle>
              <CardDescription>
                List of products that customers can buy. You can set individual triggers or list them in the store menu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isProductsLoading ? (
                <div className="text-center py-6 flex items-center justify-center gap-2 text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading products...
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No products added yet. Click "Add Product" to create one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Keyword Trigger</TableHead>
                      <TableHead>External Checkout</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((prod) => {
                      let firstPhoto = "";
                      try {
                        const photosArray = typeof prod.photos === "string" ? JSON.parse(prod.photos) : prod.photos;
                        if (Array.isArray(photosArray) && photosArray.length > 0) {
                          firstPhoto = photosArray[0];
                        }
                      } catch {}

                      return (
                        <TableRow key={prod.id}>
                          <TableCell>
                            {firstPhoto ? (
                              <img src={firstPhoto} alt={prod.name} className="w-12 h-12 object-cover rounded-lg border" />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 flex items-center justify-center rounded-lg border">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold">{prod.name}</TableCell>
                          <TableCell className="text-emerald-600 font-medium">${prod.price}</TableCell>
                          <TableCell>
                            {prod.isTriggerEnabled ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                Active: {prod.triggerKeyword}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                Disabled
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {prod.checkoutLink ? (
                              <a href={prod.checkoutLink} target="_blank" rel="noreferrer" className="text-blue-500 flex items-center gap-1 text-sm hover:underline">
                                Link <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">Standard Chat</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="icon" variant="ghost" className="text-gray-600" onClick={() => handleEditProductClick(prod)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-red-500" onClick={() => {
                              if (confirm("Are you sure you want to delete this product?")) {
                                deleteProductMutation.mutate(prod.id);
                              }
                            }}>
                              <Trash className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ORDERS TAB */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div>
                <CardTitle>Orders Ledger</CardTitle>
                <CardDescription>Manage status updates, trace payment receipts, and dispatch notifications.</CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <Input
                  className="max-w-xs h-9"
                  placeholder="Search order no, phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select value={orderStatus} onValueChange={setOrderStatus}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Order Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Orders</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pending_verification">Verification Req</SelectItem>
                    <SelectItem value="pending_payment">Link Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isOrdersLoading ? (
                <div className="text-center py-6 flex items-center justify-center gap-2 text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading orders...
                </div>
              ) : !ordersData?.orders || ordersData.orders.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No checkout orders match the current criteria.</div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Delivery Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersData.orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-semibold text-emerald-700">{order.orderNumber}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{order.customerName || "Customer"}</div>
                            <div className="text-xs text-gray-500">{order.customerPhone}</div>
                            {order.customerData && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <button className="text-xs text-blue-500 flex items-center gap-0.5 hover:underline mt-1">
                                    View details <FileText className="w-3 h-3" />
                                  </button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Customer Order Form Data</DialogTitle>
                                    <DialogDescription>Collected fields for {order.orderNumber}</DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-2 py-4">
                                    {Object.entries(order.customerData).map(([key, val]) => (
                                      <div key={key} className="flex justify-between border-b pb-1">
                                        <span className="font-semibold text-gray-600 text-sm">{key.toUpperCase()}:</span>
                                        <span className="text-gray-800 text-sm">{String(val)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{order.productName}</div>
                            <div className="text-xs text-gray-400">Qty: {order.quantity}</div>
                          </TableCell>
                          <TableCell className="font-medium">${order.totalAmount}</TableCell>
                          <TableCell className="uppercase text-xs">{order.paymentMethod}</TableCell>
                          <TableCell>
                            <select
                              value={order.paymentStatus}
                              onChange={(e) => updateOrderStatusMutation.mutate({ id: order.id, paymentStatus: e.target.value })}
                              className="text-xs border rounded p-1"
                            >
                              <option value="pending">Pending</option>
                              <option value="pending_verification">Verification Req</option>
                              <option value="pending_payment">Link Pending</option>
                              <option value="paid">Paid</option>
                              <option value="failed">Failed</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            {order.receiptUrl ? (
                              <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1 hover:underline">
                                View <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <select
                              value={order.status}
                              onChange={(e) => updateOrderStatusMutation.mutate({ id: order.id, status: e.target.value })}
                              className="text-xs border rounded p-1 font-semibold text-emerald-800 bg-emerald-50"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </TableCell>
                          <TableCell className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {ordersData.total > limit && (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
                      <Button size="sm" variant="outline" disabled={page * limit >= ordersData.total} onClick={() => setPage(p => p + 1)}>Next</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. CUSTOMERS TAB */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Customer Registry</CardTitle>
              <CardDescription>List of customers who have made orders on this store flow.</CardDescription>
            </CardHeader>
            <CardContent>
              {isCustomersLoading ? (
                <div className="text-center py-6 flex items-center justify-center gap-2 text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Loading customers...
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No checkout customers found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Phone</TableHead>
                      <TableHead>Customer Name</TableHead>
                      <TableHead>Total Orders</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Last Order Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((cust) => (
                      <TableRow key={cust.phone}>
                        <TableCell className="font-mono">{cust.phone}</TableCell>
                        <TableCell>{cust.name || "Customer"}</TableCell>
                        <TableCell className="font-semibold text-gray-700">{cust.totalOrders}</TableCell>
                        <TableCell className="font-bold text-emerald-600">${parseFloat(cust.totalSpent || "0").toFixed(2)}</TableCell>
                        <TableCell className="text-gray-500 text-sm">{new Date(cust.lastOrderDate).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. CONFIG TAB */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Store Configuration</CardTitle>
              <CardDescription>Setup custom welcome keywords, payment gateways, and checkout form details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfigSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* General Config */}
                  <div className="space-y-4 border p-4 rounded-lg">
                    <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-emerald-600" />
                      General Shop Flows
                    </h3>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Label className="font-semibold">Store-wise Catalog Flow</Label>
                        <span className="text-xs text-gray-500">Enable automatic product lists when customer triggers the keyword.</span>
                      </div>
                      <Switch checked={storeFlowActive} onCheckedChange={setStoreFlowActive} />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="storeKeyword">Store Trigger Keyword</Label>
                      <Input
                        id="storeKeyword"
                        value={storeKeyword}
                        onChange={(e) => setStoreKeyword(e.target.value)}
                        placeholder="e.g. store, shop, catalogue"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="welcome">Welcome Text Message</Label>
                      <Textarea
                        id="welcome"
                        value={welcomeMsg}
                        onChange={(e) => setWelcomeMsg(e.target.value)}
                        placeholder="Welcome message..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="headerType">Header Media Type</Label>
                        <select
                          id="headerType"
                          value={welcomeHeaderType}
                          onChange={(e) => setWelcomeHeaderType(e.target.value)}
                          className="w-full border rounded p-2 text-sm"
                        >
                          <option value="none">No Header</option>
                          <option value="image">Image Header</option>
                          <option value="video">Video Header</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="headerUrl">Header Media URL</Label>
                        <Input
                          id="headerUrl"
                          value={welcomeHeaderUrl}
                          onChange={(e) => setWelcomeHeaderUrl(e.target.value)}
                          placeholder="e.g. https://img.com/header.jpg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Checkout & QR */}
                  <div className="space-y-4 border p-4 rounded-lg">
                    <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-emerald-600" />
                      Checkout Questions
                    </h3>

                    <div className="space-y-1">
                      <Label htmlFor="fields">Checkout Form Fields (comma-separated)</Label>
                      <Input
                        id="fields"
                        value={checkoutFieldsText}
                        onChange={(e) => setCheckoutFieldsText(e.target.value)}
                        placeholder="e.g. name, phone, address, pin"
                      />
                      <span className="text-xs text-gray-500 block">
                        Default variables: name, phone, address, pin. You can add customized variables.
                      </span>
                    </div>

                    <div className="space-y-1 pt-2">
                      <Label htmlFor="qr">UPI Payment Scan QR Code URL</Label>
                      <Input
                        id="qr"
                        value={qrCodeUrl}
                        onChange={(e) => setQrCodeUrl(e.target.value)}
                        placeholder="e.g. https://img.com/upi-qr-code.jpg"
                      />
                      <span className="text-xs text-gray-500 block">
                        Provide a URL to the UPI payment QR code image (GPay/PhonePe). Customers will pay and upload screenshot.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Gateways Config */}
                <div className="border p-4 rounded-lg space-y-4">
                  <h3 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Online Gateways Integration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Instamojo */}
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
                      <h4 className="font-bold text-emerald-800 text-sm">Instamojo Configuration</h4>
                      <div className="space-y-1">
                        <Label htmlFor="instaKey">Instamojo API Key</Label>
                        <Input
                          id="instaKey"
                          type="password"
                          value={instaKey}
                          onChange={(e) => setInstaKey(e.target.value)}
                          placeholder="API Key"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="instaToken">Instamojo Auth Token</Label>
                        <Input
                          id="instaToken"
                          type="password"
                          value={instaToken}
                          onChange={(e) => setInstaToken(e.target.value)}
                          placeholder="Auth Token"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <Label className="text-sm font-semibold">Sandbox / Test Mode</Label>
                        <Switch checked={instaSandbox} onCheckedChange={setInstaSandbox} />
                      </div>
                    </div>

                    {/* Razorpay */}
                    <div className="space-y-3 p-3 bg-gray-50 rounded-lg border">
                      <h4 className="font-bold text-emerald-800 text-sm">Razorpay Configuration</h4>
                      <div className="space-y-1">
                        <Label htmlFor="rzpKey">Razorpay Key ID</Label>
                        <Input
                          id="rzpKey"
                          type="password"
                          value={rzpKeyId}
                          onChange={(e) => setRzpKeyId(e.target.value)}
                          placeholder="Key ID"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="rzpSecret">Razorpay Key Secret</Label>
                        <Input
                          id="rzpSecret"
                          type="password"
                          value={rzpKeySecret}
                          onChange={(e) => setRzpKeySecret(e.target.value)}
                          placeholder="Key Secret"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t pt-4">
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saveConfigMutation.isPending}>
                    {saveConfigMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
