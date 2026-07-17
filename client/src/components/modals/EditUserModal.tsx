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

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: { id: string; username: string; email: string } | null;
  onSuccess: () => void;
}

export default function EditUserModal({ open, onOpenChange, user, onSuccess }: EditUserModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState({ username: "", email: "", password: "", sendEmail: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ username: user.username || "", email: user.email || "", password: "", sendEmail: false });
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!form.username || !form.email) {
      toast({ title: "Missing fields", description: "Please fill all fields.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload: any = { username: form.username, email: form.email };
      if (form.password) {
        payload.password = form.password;
        payload.sendEmail = form.sendEmail;
      }
      const res = await apiRequest("PUT", `/api/users/${user?.id}`, payload);
      const data = await res.json();
      if (data.success) {
        toast({ title: "Success", description: "User updated successfully!" });
        onSuccess();
        onOpenChange(false);
      } else {
        throw new Error(data.message || "Failed to update user");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label>Username</Label>
            <Input value={form.username} onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))} placeholder="Username" />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="email@example.com" type="email" />
          </div>
          
          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Security & Password Reset</h4>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>New Password (leave blank to keep current)</Label>
                <Input 
                  value={form.password} 
                  onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))} 
                  placeholder="Temporary password" 
                  type="text" 
                />
              </div>

              {form.password && (
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="checkbox"
                    id="sendEmail"
                    checked={form.sendEmail}
                    onChange={(e) => setForm(prev => ({ ...prev, sendEmail: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  />
                  <Label htmlFor="sendEmail" className="text-xs text-gray-600 cursor-pointer">
                    Send temporary password to tenant's email address
                  </Label>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
