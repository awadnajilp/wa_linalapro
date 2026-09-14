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
import { users, userActivityLogs, whatsappBusinessAccountsConfig, otpVerifications } from "@shared/schema";
import { eq, and, sql, or, ne } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { validateRequest } from "../middlewares/validateRequest.middleware";
import { resolveUserPermissions } from "server/utils/role-permissions";
import country from "../config/country.json"
import {sendOTPEmail} from "../services/email.service"
import { getFirstPanelConfig } from "../services/panel.config";


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

    const cleanUsername = (username || "").trim();

    // Find user by username OR email
    const results = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.username, cleanUsername),
          eq(users.email, cleanUsername)
        )
      );

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

// ==========================================
// GOOGLE AUTHENTICATION (WEB & MOBILE)
// ==========================================

// Public endpoint to get Google Client ID for Web/Mobile SDK initialization
router.get("/google/config", async (_req: Request, res: Response) => {
  try {
    const config = await getFirstPanelConfig();
    const clientId = (config?.googleClientId || process.env.GOOGLE_CLIENT_ID || "").trim();
    const enabled = Boolean(clientId.length > 0 && (config?.googleAuthEnabled ?? true));

    res.json({
      enabled,
      clientId: clientId || "",
    });
  } catch (error: any) {
    console.error("Error fetching Google auth config:", error);
    res.status(500).json({ error: "Failed to fetch Google auth config" });
  }
});

const googleLoginSchema = z.object({
  credential: z.string().optional(),
  idToken: z.string().optional(),
  accessToken: z.string().optional(),
});

// Google Login / SSO endpoint for both Web and Mobile apps
router.post("/google", validateRequest(googleLoginSchema), async (req: Request, res: Response) => {
  try {
    const { credential, idToken, accessToken } = req.body;
    const token = credential || idToken;

    if (!token && !accessToken) {
      return res.status(400).json({ error: "Google credential/idToken or accessToken is required" });
    }

    const config = await getFirstPanelConfig();
    const clientId = (config?.googleClientId || process.env.GOOGLE_CLIENT_ID || "").trim();

    let googleId: string = "";
    let email: string = "";
    let firstName: string = "User";
    let lastName: string = "";
    let avatar: string | null = null;
    let isEmailVerified: boolean = true;

    if (token) {
      // Verify JWT ID token with google-auth-library
      const { OAuth2Client } = await import("google-auth-library");
      const googleClient = new OAuth2Client(clientId || undefined);

      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: clientId || undefined,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.sub) {
        return res.status(401).json({ error: "Invalid Google token payload" });
      }

      googleId = payload.sub;
      email = (payload.email || "").trim().toLowerCase();
      firstName = payload.given_name || (payload.name ? payload.name.split(" ")[0] : "Google User");
      lastName = payload.family_name || (payload.name ? payload.name.split(" ").slice(1).join(" ") : "");
      avatar = payload.picture || null;
      isEmailVerified = payload.email_verified ?? true;
    } else if (accessToken) {
      // Query Google userinfo endpoint using access token
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = (await response.json()) as any;

      if (!response.ok || !data.sub) {
        return res.status(401).json({ error: data.error_description || "Invalid Google access token" });
      }

      googleId = data.sub;
      email = (data.email || "").trim().toLowerCase();
      firstName = data.given_name || (data.name ? data.name.split(" ")[0] : "Google User");
      lastName = data.family_name || (data.name ? data.name.split(" ").slice(1).join(" ") : "");
      avatar = data.picture || null;
      isEmailVerified = data.email_verified ?? true;
    }

    if (!googleId) {
      return res.status(400).json({ error: "Failed to retrieve Google profile ID" });
    }

    if (!email) {
      email = `google_${googleId}@google.user`;
    }

    // Resolve existing user or create a new user account
    let existingUser: any = null;

    // Check by googleId
    const usersByGoogleId = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId))
      .limit(1);

    if (usersByGoogleId.length > 0) {
      existingUser = usersByGoogleId[0];
    } else if (email) {
      // Check by matching verified email
      const usersByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (usersByEmail.length > 0) {
        existingUser = usersByEmail[0];
        // Link googleId to this account
        await db
          .update(users)
          .set({ googleId })
          .where(eq(users.id, existingUser.id));
        existingUser.googleId = googleId;
      }
    }

    let activeUser: any = null;

    if (existingUser) {
      if ((existingUser.status || "").trim().toLowerCase() !== "active") {
        return res.status(403).json({ error: "Account is inactive. Please contact administrator." });
      }

      const updatePayload: any = {
        lastLogin: new Date(),
        updatedAt: new Date(),
      };
      if (!existingUser.avatar && avatar) {
        updatePayload.avatar = avatar;
      }
      if (!existingUser.isEmailVerified && isEmailVerified) {
        updatePayload.isEmailVerified = true;
      }

      await db
        .update(users)
        .set(updatePayload)
        .where(eq(users.id, existingUser.id));

      activeUser = { ...existingUser, ...updatePayload };
    } else {
      // New User Registration via Google
      let baseUsername = (email.split("@")[0] || firstName)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (!baseUsername || baseUsername.length < 3) {
        baseUsername = `user_${googleId.slice(-4)}`;
      }

      let candidateUsername = baseUsername;
      let counter = 1;
      while (true) {
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, candidateUsername))
          .limit(1);
        if (!existing) break;
        candidateUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
        counter++;
        if (counter > 10) {
          candidateUsername = `${baseUsername}_${Date.now()}`;
          break;
        }
      }

      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      const defaultPermissions = resolveUserPermissions("admin", []);

      const [createdUser] = await db
        .insert(users)
        .values({
          username: candidateUsername,
          password: hashedPassword,
          email,
          firstName,
          lastName,
          role: "admin",
          avatar,
          permissions: defaultPermissions,
          isEmailVerified: true,
          status: "active",
          googleId,
        })
        .returning();

      activeUser = createdUser;
    }

    // Log activity
    try {
      await db.insert(userActivityLogs).values({
        userId: activeUser.id,
        action: existingUser ? "google_login" : "google_signup",
        entityType: "user",
        entityId: activeUser.id,
        details: JSON.stringify({
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          provider: "google",
          googleId,
        }),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    } catch (logErr) {
      console.error("Failed to log Google login activity:", logErr);
    }

    // Set session
    if (!(req as any).session) {
      console.error("Session not initialized");
      return res.status(500).json({ error: "Session not initialized" });
    }

    (req as any).session.user = {
      id: activeUser.id,
      username: activeUser.username,
      email: activeUser.email,
      firstName: activeUser.firstName,
      lastName: activeUser.lastName,
      role: activeUser.role,
      permissions: resolveUserPermissions(activeUser.role, activeUser.permissions as any),
      avatar: activeUser.avatar,
      createdBy: activeUser.createdBy || "",
      channelId: activeUser.channelId || null,
      showOnlyAssigned: !!activeUser.showOnlyAssigned,
      isAdminMember: !!activeUser.isAdminMember,
    };

    const { password: _, ...userData } = activeUser;

    const signature = await import("cookie-signature");
    const secret = process.env.SESSION_SECRET || "your-secret-key-change-in-production";
    const signedSessionId = "s:" + signature.sign((req as any).sessionID, secret);

    res.json({
      message: existingUser ? "Login successful" : "Account created and logged in successfully",
      user: userData,
      sessionId: signedSessionId,
    });
  } catch (error: any) {
    console.error("Error during Google login:", error);
    res.status(500).json({
      error: "Google login failed",
      message: error.message || "Unknown error",
    });
  }
});

// ==========================================
// FACEBOOK AUTHENTICATION (WEB & MOBILE)
// ==========================================

// Public endpoint to get Facebook App ID for Web/Mobile SDK initialization
router.get("/facebook/config", async (_req: Request, res: Response) => {
  try {
    let config = await db.query.whatsappBusinessAccountsConfig.findFirst({
      where: ne(whatsappBusinessAccountsConfig.appId, ""),
    });
    if (!config) {
      config = await db.query.whatsappBusinessAccountsConfig.findFirst();
    }

    const appId = (config?.appId || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || "").trim();

    res.json({
      enabled: Boolean(appId.length > 0),
      appId: appId || "",
    });
  } catch (error: any) {
    console.error("Error fetching Facebook auth config:", error);
    res.status(500).json({ error: "Failed to fetch Facebook auth config" });
  }
});

const facebookLoginSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
});

// Facebook Login / SSO endpoint for both Web and Mobile apps
router.post("/facebook", validateRequest(facebookLoginSchema), async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;

    // 1. Get Meta App credentials configured in SuperAdmin
    let config = await db.query.whatsappBusinessAccountsConfig.findFirst({
      where: ne(whatsappBusinessAccountsConfig.appId, ""),
    });
    if (!config) {
      config = await db.query.whatsappBusinessAccountsConfig.findFirst();
    }

    const appId = (config?.appId || process.env.META_APP_ID || process.env.FACEBOOK_APP_ID || "").trim();
    const appSecret = (config?.appSecret || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || "").trim();

    if (!appSecret) {
      return res.status(400).json({
        error: "Facebook login is not configured on this server. Please configure Meta App credentials in Superadmin settings.",
      });
    }

    // 2. Generate appsecret_proof for secure Graph API call
    const appsecretProof = crypto
      .createHmac("sha256", appSecret)
      .update(accessToken)
      .digest("hex");

    // 3. Query Graph API for user profile
    const metaUrl = `https://graph.facebook.com/v20.0/me?fields=id,name,first_name,last_name,email,picture.width(250).height(250)&access_token=${encodeURIComponent(
      accessToken
    )}&appsecret_proof=${appsecretProof}`;

    const fbResponse = await fetch(metaUrl);
    const fbData = (await fbResponse.json()) as any;

    if (!fbResponse.ok || fbData.error) {
      console.error("[Facebook Auth] Verification failed:", fbData.error);
      return res.status(401).json({
        error: fbData.error?.message || "Invalid or expired Facebook access token",
      });
    }

    const fbId = fbData.id;
    const fbEmail = fbData.email ? String(fbData.email).trim().toLowerCase() : null;
    const firstName = fbData.first_name || (fbData.name ? fbData.name.split(" ")[0] : "Facebook");
    const lastName = fbData.last_name || (fbData.name ? fbData.name.split(" ").slice(1).join(" ") : "User");
    const avatar = fbData.picture?.data?.url || null;

    if (!fbId) {
      return res.status(400).json({ error: "Failed to retrieve Facebook profile ID" });
    }

    // 4. Resolve existing user or create a new user account
    let existingUser: any = null;

    // Check by facebookId
    const usersByFbId = await db
      .select()
      .from(users)
      .where(eq(users.facebookId, fbId))
      .limit(1);

    if (usersByFbId.length > 0) {
      existingUser = usersByFbId[0];
    } else if (fbEmail) {
      // Check by matching verified email
      const usersByEmail = await db
        .select()
        .from(users)
        .where(eq(users.email, fbEmail))
        .limit(1);

      if (usersByEmail.length > 0) {
        existingUser = usersByEmail[0];
        // Link facebookId to this account
        await db
          .update(users)
          .set({ facebookId: fbId })
          .where(eq(users.id, existingUser.id));
        existingUser.facebookId = fbId;
      }
    }

    let activeUser: any = null;

    if (existingUser) {
      // Verify user status
      if ((existingUser.status || "").trim().toLowerCase() !== "active") {
        return res.status(403).json({ error: "Account is inactive. Please contact administrator." });
      }

      const updatePayload: any = {
        lastLogin: new Date(),
        updatedAt: new Date(),
      };
      if (!existingUser.avatar && avatar) {
        updatePayload.avatar = avatar;
      }
      if (!existingUser.isEmailVerified) {
        updatePayload.isEmailVerified = true;
      }

      await db
        .update(users)
        .set(updatePayload)
        .where(eq(users.id, existingUser.id));

      activeUser = { ...existingUser, ...updatePayload };
    } else {
      // New User Registration via Facebook
      const email = fbEmail || `fb_${fbId}@facebook.user`;

      // Generate a unique clean username
      let baseUsername = (fbData.name || "fbuser")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (!baseUsername || baseUsername.length < 3) {
        baseUsername = `fbuser_${fbId.slice(-4)}`;
      }

      let candidateUsername = baseUsername;
      let counter = 1;
      while (true) {
        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, candidateUsername))
          .limit(1);
        if (!existing) break;
        candidateUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
        counter++;
        if (counter > 10) {
          candidateUsername = `${baseUsername}_${Date.now()}`;
          break;
        }
      }

      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      const defaultPermissions = resolveUserPermissions("admin", []);

      const [createdUser] = await db
        .insert(users)
        .values({
          username: candidateUsername,
          password: hashedPassword,
          email,
          firstName,
          lastName,
          role: "admin",
          avatar,
          permissions: defaultPermissions,
          isEmailVerified: true,
          status: "active",
          facebookId: fbId,
        })
        .returning();

      activeUser = createdUser;
    }

    // 5. Log activity
    try {
      await db.insert(userActivityLogs).values({
        userId: activeUser.id,
        action: existingUser ? "facebook_login" : "facebook_signup",
        entityType: "user",
        entityId: activeUser.id,
        details: JSON.stringify({
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          provider: "facebook",
          facebookId: fbId,
        }),
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });
    } catch (logErr) {
      console.error("Failed to log Facebook login activity:", logErr);
    }

    // 6. Set session
    if (!(req as any).session) {
      console.error("Session not initialized");
      return res.status(500).json({ error: "Session not initialized" });
    }

    (req as any).session.user = {
      id: activeUser.id,
      username: activeUser.username,
      email: activeUser.email,
      firstName: activeUser.firstName,
      lastName: activeUser.lastName,
      role: activeUser.role,
      permissions: resolveUserPermissions(activeUser.role, activeUser.permissions as any),
      avatar: activeUser.avatar,
      createdBy: activeUser.createdBy || "",
      channelId: activeUser.channelId || null,
      showOnlyAssigned: !!activeUser.showOnlyAssigned,
      isAdminMember: !!activeUser.isAdminMember,
    };

    const { password: _, ...userData } = activeUser;

    // Sign the session ID to support cross-origin header authentication on mobile apps
    const signature = await import("cookie-signature");
    const secret = process.env.SESSION_SECRET || "your-secret-key-change-in-production";
    const signedSessionId = "s:" + signature.sign((req as any).sessionID, secret);

    res.json({
      message: existingUser ? "Login successful" : "Account created and logged in successfully",
      user: userData,
      sessionId: signedSessionId,
    });
  } catch (error: any) {
    console.error("Error during Facebook login:", error);
    res.status(500).json({
      error: "Facebook login failed",
      message: error.message || "Unknown error",
    });
  }
});

// Helper to parse and verify signed_request from Meta callbacks
async function parseMetaSignedRequest(signedRequest: string): Promise<any | null> {
  try {
    let config = await db.query.whatsappBusinessAccountsConfig.findFirst({
      where: ne(whatsappBusinessAccountsConfig.appId, ""),
    });
    if (!config) {
      config = await db.query.whatsappBusinessAccountsConfig.findFirst();
    }
    const appSecret = (config?.appSecret || process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || "").trim();
    if (!appSecret) return null;

    const [encodedSig, payload] = signedRequest.split(".");
    if (!encodedSig || !payload) return null;

    const sig = Buffer.from(encodedSig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8"));

    const expectedSig = crypto.createHmac("sha256", appSecret).update(payload).digest();
    if (!crypto.timingSafeEqual(sig, expectedSig)) {
      return null;
    }
    return data;
  } catch (err) {
    console.error("Failed to parse Meta signed_request:", err);
    return null;
  }
}

// Meta Deauthorize Callback URL
router.post("/facebook/deauthorize", async (req: Request, res: Response) => {
  try {
    const signedRequest = req.body.signed_request;
    if (!signedRequest) {
      return res.status(400).json({ error: "signed_request parameter is required" });
    }

    const data = await parseMetaSignedRequest(signedRequest);
    if (!data || !data.user_id) {
      return res.status(400).json({ error: "Invalid signed_request signature or missing user_id" });
    }

    const fbUserId = String(data.user_id);
    console.log(`[Facebook Deauthorize] User ${fbUserId} deauthorized the app`);

    // Unlink facebookId from the user in database
    await db
      .update(users)
      .set({ facebookId: null, updatedAt: new Date() })
      .where(eq(users.facebookId, fbUserId));

    res.json({ success: true, message: "Deauthorized successfully" });
  } catch (error: any) {
    console.error("Facebook deauthorize error:", error);
    res.status(500).json({ error: error.message || "Failed to process deauthorization" });
  }
});

// Meta Data Deletion Callback URL (Complies with Meta Platform Terms)
router.post("/facebook/data-deletion", async (req: Request, res: Response) => {
  try {
    const signedRequest = req.body.signed_request;
    if (!signedRequest) {
      return res.status(400).json({ error: "signed_request parameter is required" });
    }

    const data = await parseMetaSignedRequest(signedRequest);
    if (!data || !data.user_id) {
      return res.status(400).json({ error: "Invalid signed_request signature or missing user_id" });
    }

    const fbUserId = String(data.user_id);
    const confirmationCode = `del_${fbUserId}_${Date.now()}`;
    console.log(`[Facebook Data Deletion] Received request for user ${fbUserId}, confirmation: ${confirmationCode}`);

    // Unlink or soft-clean user facebook association
    await db
      .update(users)
      .set({ facebookId: null, updatedAt: new Date() })
      .where(eq(users.facebookId, fbUserId));

    // Respond with JSON format required by Meta
    res.json({
      url: `https://wa.linalapro.com/account-deletion?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (error: any) {
    console.error("Facebook data deletion callback error:", error);
    res.status(500).json({ error: error.message || "Failed to process data deletion callback" });
  }
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