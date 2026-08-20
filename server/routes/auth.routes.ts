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

import { Request, Response, Router } from "express";
import { diployLogger, HTTP_STATUS, DIPLOY_BRAND } from "@diploy/core";
import { db } from "../db";
import { users, userActivityLogs } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { validateRequest } from "../middlewares/validateRequest.middleware";
import { resolveUserPermissions } from "server/utils/role-permissions";
import country from "../config/country.json"
import {sendOTPEmail} from "../services/email.service"
import { otpVerifications } from "@shared/schema";


const router = Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),

});

// Login endpoint
router.post("/login", validateRequest(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    // console.log("Login request body:", req.body);

    // Find user by username
    const results = await db
      .select()
      .from(users)
      .where(eq(users.username, username));

      console.log(results)

    const user = results[0];

    if (!user) {
      console.warn("User not found:", username);
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // console.log(user.status, "checkk users statuuuuuu")

    // Check if user is active
    if ((user.status || "").trim().toLowerCase() !== "active") {
  return res.status(403).json({ error: "Account is inactive. Please contact administrator." });
}

    // Check if email is verified
if (user.isEmailVerified === false) {
  return res.status(403).json({ error: "Email not verified. Please verify your email first." });
}

    // Ensure password field exists
    if (!user.password) {
      console.error("User has no password in DB:", user.id);
      return res.status(500).json({ error: "User record is invalid. Contact support." });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Update last login
    await db
      .update(users)
      .set({
        lastLogin: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Log activity
    try {
      await db.insert(userActivityLogs).values({
        userId: user.id,
        action: "login",
        entityType: "user",
        entityId: user.id,
        details: JSON.stringify({
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
        }),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    } catch (logError) {
      console.error("Failed to log login activity:", logError);
    }

    // Store user in session
    if (!(req as any).session) {
      console.error("Session not initialized");
      return res.status(500).json({ error: "Session not initialized" });
    }

    (req as any).session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions: resolveUserPermissions(user.role, user.permissions as any),
      avatar: user.avatar,
      createdBy: user.createdBy || "",
      channelId: user.channelId || null,
      showOnlyAssigned: !!user.showOnlyAssigned,
      isAdminMember: !!user.isAdminMember,
    };

    // Remove password before sending back
    const { password: _, ...userData } = user;

    // Sign the session ID to support cross-origin header authentication
    const signature = await import("cookie-signature");
    const secret = process.env.SESSION_SECRET || "your-secret-key-change-in-production";
    const signedSessionId = "s:" + signature.sign((req as any).sessionID, secret);

    res.json({
      message: "Login successful",
      user: userData,
      sessionId: signedSessionId,
    });
  } catch (error) {
    console.log("Error during login:", error);
    res.status(500).json({ error: "Login failed", message: (error as Error).message });
  }
});

// Logout endpoint
router.post("/logout", (req, res) => {
  const userId = (req as any).session?.user?.id;

  if (userId) {
    // Clear FCM token on logout
    db.update(users)
      .set({ fcmToken: null })
      .where(eq(users.id, userId))
      .catch(err => console.error("Error clearing FCM token on logout:", err));

    // Log activity
    db.insert(userActivityLogs)
      .values({
        userId,
        action: "logout",
        entityType: "user",
        entityId: userId,
        details: {},
      })
      .catch(console.error);
  }

  // Destroy session
  (req as any).session.destroy((err: any) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({ error: "Logout failed" });
    }

    res.clearCookie("connect.sid");
    res.json({ message: "Logout successful" });
  });
});

// Get current user
router.get("/me", async (req, res) => {
  // console.log("Fetching current user" , req.session);
  const user = (req as any).session?.user;
// console.log("Session user:", user);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  // Get fresh user data
  const [currentUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id));

  if (!currentUser) {
    return res.status(404).json({ error: "User not found" });
  }

  // Remove password from response
  const { password, ...userData } = currentUser;
  res.json(userData);
});

// Check if authenticated (for frontend)
router.get("/check", (req, res) => {
  const user = (req as any).session?.user;
  res.json({ authenticated: !!user, user });
});


router.get("/country-data", (req, res) => {
  res.json(country);
});




// forgot password

router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!existingUser.length) {
      return res.status(404).json({ error: "Email not registered" });
    }

    const userId = existingUser[0].id;
    const userName = existingUser[0].firstName; // Use DB value

    // Rate limiting: max 3 OTP per 5 min
    const recentOTPs = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.userId, userId),
          sql`${otpVerifications.createdAt} > NOW() - INTERVAL '5 minutes'`
        )
      );

    if (recentOTPs.length >= 3) {
      return res.status(429).json({
        error: "Too many requests. Try again in 5 minutes.",
      });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    // Store OTP in DB
    await db.insert(otpVerifications).values({
      userId,
      otpCode,
      expiresAt,
      isUsed: false,
    });

    // Send OTP via email
    try {
      await sendOTPEmail(email, otpCode, userName);
      console.log(`✉️ OTP sent to ${email}`);
    } catch (emailError) {
      console.error("⚠️ Failed to send OTP email:", emailError);
    }

    res.json({
      success: true,
      message: "Verification code sent to your email",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: error.message || "Failed to process request" });
  }
});




router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword, otpCode } = req.body;

    if (!email || !newPassword || !otpCode) {
      return res.status(400).json({ error: "Email, new password, and OTP code are required" });
    }

    // Find user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!existingUser.length) {
      return res.status(404).json({ error: "Email not registered" });
    }

    const userId = existingUser[0].id;

    // Find OTP record by code
    const otpRecord = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.userId, userId),
          eq(otpVerifications.otpCode, otpCode.toString())
        )
      )
      .limit(1);

    if (!otpRecord.length) {
      return res.status(400).json({ error: "Invalid OTP code" });
    }

    const record = otpRecord[0];
    const now = new Date();
    if (new Date(record.expiresAt) < now) {
      // Clean up expired OTP
      await db.delete(otpVerifications).where(eq(otpVerifications.id, record.id));
      return res.status(400).json({ error: "OTP code has expired" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    // Delete the OTP record after successful password reset to prevent reuse
    await db
      .delete(otpVerifications)
      .where(eq(otpVerifications.id, record.id));

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error: any) {
    console.error("Reset password error:", error);
    res.status(500).json({ error: error.message || "Failed to reset password" });
  }
});




router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    console.log("Request body:", req.body);

    if (!email || !otpCode) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    // Find user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    console.log("Found user:", existingUser);

    if (!existingUser.length) {
      return res.status(404).json({ error: "Email not registered" });
    }

    const userId = existingUser[0].id;

    // Find valid OTP
    const otpRecord = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.userId, userId),
          eq(otpVerifications.otpCode, otpCode.toString()),
          eq(otpVerifications.isUsed, false),
          // sql`${otpVerifications.expiresAt} > timezone('UTC', now())`

        )
      )
      .limit(1);

    console.log("OTP records found:", otpRecord);
    if (otpRecord.length) {
      console.log("OTP expires at:", otpRecord[0].expiresAt);
      console.log("Current time:", new Date().toISOString());
    }

    if (!otpRecord.length) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // OTP valid => mark as used
    await db
      .update(otpVerifications)
      .set({ isUsed: true })
      .where(eq(otpVerifications.id, otpRecord[0].id));

    res.json({ success: true, message: "OTP verified successfully" });
  } catch (error: any) {
    console.error("OTP verification error:", error);
    res.status(500).json({ error: error.message || "Failed to verify OTP" });
  }
});


setInterval(async () => {
  try {
    await db.delete(otpVerifications).where(
      sql`${otpVerifications.expiresAt} < timezone('UTC', now())`
    );
  } catch (error) {
    console.error('[OTP Cleanup] Error:', error);
  }
}, 5 * 60 * 1000);



// Impersonate a user (Superadmin only)
router.post("/impersonate/:userId", async (req, res) => {
  try {
    const session = (req as any).session;
    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Must be superadmin to impersonate
    if (session.user.role !== "superadmin" && !session.originalUser) {
      return res.status(403).json({ error: "Only superadmins can impersonate users" });
    }

    const { userId } = req.params;

    // Find the target user
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found" });
    }

    if (targetUser.role === "superadmin") {
      return res.status(400).json({ error: "Cannot impersonate another superadmin" });
    }

    // Save the original user if not already impersonating
    if (!session.originalUser) {
      session.originalUser = { ...session.user };
    }

    // Set target user as active session user
    session.user = {
      id: targetUser.id,
      username: targetUser.username,
      email: targetUser.email,
      firstName: targetUser.firstName,
      lastName: targetUser.lastName,
      role: targetUser.role,
      permissions: resolveUserPermissions(targetUser.role, targetUser.permissions as any),
      avatar: targetUser.avatar,
      createdBy: targetUser.createdBy || "",
      channelId: targetUser.channelId || null,
      showOnlyAssigned: !!targetUser.showOnlyAssigned,
      isAdminMember: !!targetUser.isAdminMember,
      originalSuperadmin: session.originalUser
    };

    // Remove password before sending back
    const { password: _, ...userData } = targetUser;

    res.json({
      message: `Impersonating user ${targetUser.username}`,
      user: userData,
      originalUser: session.originalUser
    });
  } catch (error: any) {
    console.error("Impersonation error:", error);
    res.status(500).json({ error: error.message || "Failed to impersonate user" });
  }
});

// Stop impersonation and restore superadmin session
router.post("/unimpersonate", async (req, res) => {
  try {
    const session = (req as any).session;
    if (!session || !session.originalUser) {
      return res.status(400).json({ error: "Not currently impersonating a user" });
    }

    // Restore original superadmin user
    session.user = { ...session.originalUser };
    delete session.originalUser;

    res.json({
      message: "Restored superadmin session",
      user: session.user
    });
  } catch (error: any) {
    console.error("Unimpersonation error:", error);
    res.status(500).json({ error: error.message || "Failed to restore superadmin session" });
  }
});

// Account deletion route
router.post("/delete-account", async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const sessionUserId = (req as any).session?.user?.id;
    if (!sessionUserId) {
      return res.status(401).json({ error: "Unauthorized. Please log in first." });
    }

    // Find user by ID from session
    const results = await db
      .select()
      .from(users)
      .where(eq(users.id, sessionUserId))
      .limit(1);

    const user = results[0];

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Protection for last admin
    if (user.role === "admin") {
      const [adminCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.role, "admin"), ne(users.id, user.id)));
      if (adminCount.count === 0) {
        return res.status(400).json({ error: "Cannot delete the last admin user" });
      }
    }

    // Protect superadmin from deletion
    if (user.role === "superadmin") {
      return res.status(400).json({ error: "Superadmin accounts cannot be deleted directly" });
    }

    // Clean up active session for this user
    (req as any).session.destroy(() => {});
    res.clearCookie("connect.sid");

    // Soft delete user by setting status to "deleted" and releasing username/email
    const deletedSuffix = `_deleted_${Date.now()}`;
    const updatedUsername = `${user.username}${deletedSuffix}`;
    const updatedEmail = `${user.email}${deletedSuffix}`;

    await db
      .update(users)
      .set({
        status: "deleted",
        username: updatedUsername,
        email: updatedEmail,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("Account deletion error:", error);
    res.status(500).json({ error: error.message || "Failed to delete account" });
  }
});

export default router;