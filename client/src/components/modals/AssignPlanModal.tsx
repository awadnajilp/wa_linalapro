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

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AssignPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any | null;
  plans: any[];
  onSuccess: () => void;
}

export default function AssignPlanModal({
  open,
  onOpenChange,
  user,
  plans,
  onSuccess,
}: AssignPlanModalProps) {
  const { toast } = useToast();

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  const [selectedPlan, setSelectedPlan] = useState("");
  const [planDetails, setPlanDetails] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [renewAddons, setRenewAddons] = useState(true);
  const [loading, setLoading] = useState(false);

  /** -----------------------------------------
   *  FETCH USER SUBSCRIPTIONS WHEN MODAL OPENS
   * ----------------------------------------*/
  useEffect(() => {
    if (!open || !user?.id) return;

    const fetchSubs = async () => {
      try {
        setLoadingSubs(true);
        const res = await apiRequest(
          "GET",
          `/api/subscriptions/user/${user.id}`
        );
        const data = await res.json();

        const list = Array.isArray(data?.data) ? data.data : [];
        setSubscriptions(list);
      } catch (err) {
        console.error("Error loading subscriptions", err);
        setSubscriptions([]);
      } finally {
        setLoadingSubs(false);
      }
    };

    fetchSubs();
  }, [open, user?.id]);

  /** -----------------------------------------
   *  UPDATE DETAILS WHEN USER SELECTS PLAN
   * ----------------------------------------*/
  useEffect(() => {
    if (!selectedPlan) {
      setPlanDetails(null);
      return;
    }
    const details = plans.find((p) => p.id === selectedPlan);
    setPlanDetails(details || null);
  }, [selectedPlan, plans]);

  useEffect(() => {
    if (open) {
      setSelectedPlan("");   // reset dropdown
      setPlanDetails(null);  // reset details
      setBillingCycle("monthly"); // reset cycle
      setRenewAddons(true); // reset renew checkbox
    }
  }, [open]);

  /** -----------------------------------------
   *  UNIQUE FEATURES (optional)
   * ----------------------------------------*/
  const uniqueFeatures = useMemo(() => {
    if (!planDetails?.features) return [];
    const seen = new Set<string>();

    return planDetails.features.filter((f: any) => {
      const clean = f.name.trim().toLowerCase();
      if (seen.has(clean)) return false;
      seen.add(clean);
      return true;
    });
  }, [planDetails]);

  /** -----------------------------------------
   *  ASSIGN PLAN
   * ----------------------------------------*/
  const handleAssign = async () => {
    if (!selectedPlan) {
      toast({
        title: "Missing Field",
        description: "Please select a plan.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await apiRequest("POST", "/api/assignSubscription", {
        userId: user.id,
        planId: selectedPlan,
        billingCycle: billingCycle,
        renewAllAddons: renewAddons,
      });

      const data = await res.json();

      if (!data.success) throw new Error(data.message || "Failed");

      toast({
        title: "Success",
        description: "Plan assigned successfully!",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const activeSubs = subscriptions
    .map((x: any) => x.subscription)
    .filter((s: any) => s?.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Plan to {user?.username}</DialogTitle>
        </DialogHeader>

        {loadingSubs ? (
          <p>Loading user's subscriptions...</p>
        ) : (
          <div className="space-y-4 mt-4">

            {/* ACTIVE SUBSCRIPTIONS LIST */}
            {activeSubs?.length > 0 && (
              <div className="border rounded-lg p-3 bg-green-50 text-sm">
                <strong>Active Plans:</strong>
                <ul className="mt-1 list-disc ml-4">
                  {activeSubs.map((sub: any, i: number) => (
                    <li key={i}>
                      {sub.planData?.name || "Unknown"} — till{" "}
                      {new Date(sub.endDate).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* PLAN DROPDOWN */}
            <div>
              <Label>Select Plan *</Label>
              <select
                className="border rounded p-2 w-full mt-1 bg-white"
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
              >
                <option value="">Choose a plan</option>
                {plans.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* BILLING CYCLE DROPDOWN */}
            {selectedPlan && (
              <div className="space-y-4">
                <div>
                  <Label>Billing Cycle *</Label>
                  <select
                    className="border rounded p-2 w-full mt-1 bg-white"
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                  >
                    <option value="monthly">Monthly (1 Month) — ₹{planDetails?.monthlyPrice || 0}</option>
                    <option value="quarterly">Quarterly (3 Months) — ₹{Number(planDetails?.monthlyPrice || 0) * 3}</option>
                    <option value="semi-annual">Semi-Annual (6 Months) — ₹{Number(planDetails?.monthlyPrice || 0) * 6}</option>
                    <option value="annual">Annual (1 Year) — ₹{planDetails?.annualPrice || 0}</option>
                  </select>
                </div>

                <div className="flex items-center justify-between border p-3 rounded-lg bg-indigo-50/50">
                  <div className="flex flex-col pr-4">
                    <span className="text-sm font-semibold text-gray-800">Auto-renew active/expired addons</span>
                    <span className="text-xs text-gray-500">Align all tenant addons' expiry with this new subscription.</span>
                  </div>
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    checked={renewAddons}
                    onChange={(e) => setRenewAddons(e.target.checked)}
                  />
                </div>
              </div>
            )}

            {/* PLAN DETAILS */}
            {planDetails && (
              <div className="border rounded-lg p-4 bg-muted/30">
                <h3 className="text-lg font-semibold">{planDetails.name}</h3>
                <p className="text-sm text-gray-500">{planDetails.description}</p>

                <div className="mt-3 grid grid-cols-2 gap-2 text-sm border-t border-gray-100 pt-3">
                  <div><strong>Monthly Price:</strong> ₹{planDetails.monthlyPrice || 0}</div>
                  <div><strong>Annual Price:</strong> ₹{planDetails.annualPrice || 0}</div>
                </div>

                {uniqueFeatures.length > 0 && (
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <h4 className="font-semibold mb-2">Features:</h4>
                    <ul className="space-y-1 text-sm">
                      {uniqueFeatures.map((f: any, i: number) => (
                        <li key={i} className="flex items-center gap-1.5 text-gray-600">
                          {f.included ? "✔️" : "❌"} {f.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="mt-6 border-t border-gray-100 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading || !selectedPlan}>
            {loading ? "Assigning..." : "Assign Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
