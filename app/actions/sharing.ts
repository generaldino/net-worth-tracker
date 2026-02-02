"use server";

import { db } from "@/db";
import {
  dashboardShares,
  dashboardInvitations,
  users,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/auth-helpers";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Get all user IDs that the current user can access (their own + dashboards shared with them)
 */
export async function getAccessibleUserIds(): Promise<string[]> {
  try {
    const currentUserId = await getUserId();
    console.log("[DEBUG] getAccessibleUserIds - currentUserId:", currentUserId);
    if (!currentUserId) {
      console.log("[DEBUG] getAccessibleUserIds - no currentUserId, returning []");
      return [];
    }

    // Get user IDs of dashboards shared with the current user
    const shares = await db
      .select({ ownerId: dashboardShares.ownerId })
      .from(dashboardShares)
      .where(eq(dashboardShares.sharedWithUserId, currentUserId));

    const result = [currentUserId, ...shares.map((s) => s.ownerId)];
    console.log("[DEBUG] getAccessibleUserIds - shares:", shares.length, "result:", result);
    // Return array: current user ID + all owner IDs of dashboards shared with them
    return result;
  } catch (error) {
    console.error("Error getting accessible user IDs:", error);
    console.log("[DEBUG] getAccessibleUserIds - ERROR, returning []");
    return [];
  }
}

/**
 * Invite a user by email to view the dashboard
 * Validates that email is @gmail.com
 */
export async function inviteUser(email: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const ownerId = session.user.id;
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email is @gmail.com
    if (!normalizedEmail.endsWith("@gmail.com")) {
      return {
        success: false,
        error: "Only Gmail addresses are allowed (@gmail.com)",
      };
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return { success: false, error: "Invalid email format" };
    }

    // Check if user is trying to invite themselves
    const owner = await db
      .select()
      .from(users)
      .where(eq(users.id, ownerId))
      .limit(1);

    if (owner.length > 0 && owner[0].email === normalizedEmail) {
      return { success: false, error: "You cannot invite yourself" };
    }

    // Check if user already has access (existing share)
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      const existingShare = await db
        .select()
        .from(dashboardShares)
        .where(
          and(
            eq(dashboardShares.ownerId, ownerId),
            eq(dashboardShares.sharedWithUserId, existingUser[0].id)
          )
        )
        .limit(1);

      if (existingShare.length > 0) {
        return { success: false, error: "User already has access" };
      }

      // User exists but no share - create share immediately
      await db.insert(dashboardShares).values({
        ownerId,
        sharedWithUserId: existingUser[0].id,
      });

      // Mark any pending invitations as accepted
      await db
        .update(dashboardInvitations)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dashboardInvitations.ownerId, ownerId),
            eq(dashboardInvitations.inviteeEmail, normalizedEmail),
            eq(dashboardInvitations.status, "pending")
          )
        );

      revalidatePath("/");
      return { success: true, message: "Access granted successfully" };
    }

    // Check if there's already a pending invitation
    const existingInvitation = await db
      .select()
      .from(dashboardInvitations)
      .where(
        and(
          eq(dashboardInvitations.ownerId, ownerId),
          eq(dashboardInvitations.inviteeEmail, normalizedEmail),
          eq(dashboardInvitations.status, "pending")
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return { success: false, error: "Invitation already sent" };
    }

    // Create new invitation
    await db.insert(dashboardInvitations).values({
      ownerId,
      inviteeEmail: normalizedEmail,
      status: "pending",
    });

    revalidatePath("/");
    return {
      success: true,
      message: "Invitation created. Share the instructions below with the user.",
      inviteeEmail: normalizedEmail,
    };
  } catch (error) {
    console.error("Error inviting user:", error);
    return { success: false, error: "Failed to create invitation" };
  }
}

/**
 * Revoke access for a shared user
 */
export async function revokeAccess(sharedWithUserId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const ownerId = session.user.id;

    // Delete the share
    await db
      .delete(dashboardShares)
      .where(
        and(
          eq(dashboardShares.ownerId, ownerId),
          eq(dashboardShares.sharedWithUserId, sharedWithUserId)
        )
      );

    revalidatePath("/");
    return { success: true, message: "Access revoked successfully" };
  } catch (error) {
    console.error("Error revoking access:", error);
    return { success: false, error: "Failed to revoke access" };
  }
}

/**
 * Get list of users who have access to the dashboard (shared users)
 */
export async function getSharedUsers() {
  try {
    const session = await auth();
    if (!session?.user) {
      return [];
    }

    const ownerId = session.user.id;

    const shares = await db
      .select({
        id: dashboardShares.sharedWithUserId,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        sharedAt: dashboardShares.createdAt,
      })
      .from(dashboardShares)
      .innerJoin(users, eq(dashboardShares.sharedWithUserId, users.id))
      .where(eq(dashboardShares.ownerId, ownerId));

    return shares.map((share) => ({
      id: share.id,
      email: share.email,
      name: share.name,
      avatarUrl: share.avatarUrl,
      sharedAt: share.sharedAt,
    }));
  } catch (error) {
    console.error("Error getting shared users:", error);
    return [];
  }
}

/**
 * Get list of pending invitations
 */
export async function getPendingInvitations() {
  try {
    const session = await auth();
    if (!session?.user) {
      return [];
    }

    const ownerId = session.user.id;

    const invitations = await db
      .select()
      .from(dashboardInvitations)
      .where(
        and(
          eq(dashboardInvitations.ownerId, ownerId),
          eq(dashboardInvitations.status, "pending")
        )
      )
      .orderBy(dashboardInvitations.createdAt);

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.inviteeEmail,
      createdAt: inv.createdAt,
    }));
  } catch (error) {
    console.error("Error getting pending invitations:", error);
    return [];
  }
}

/**
 * Check if the current user has pending invitations and accept them
 * Called after user signs in with Google
 */
export async function checkAndAcceptPendingInvitations() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return;
    }

    const userEmail = session.user.email.toLowerCase().trim();

    // Find all pending invitations for this email
    const pendingInvitations = await db
      .select()
      .from(dashboardInvitations)
      .where(
        and(
          eq(dashboardInvitations.inviteeEmail, userEmail),
          eq(dashboardInvitations.status, "pending")
        )
      );

    if (pendingInvitations.length === 0) {
      return;
    }

    // Get current user ID
    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail))
      .limit(1);

    if (currentUser.length === 0) {
      return;
    }

    const currentUserId = currentUser[0].id;

    // Create dashboard shares for each invitation
    for (const invitation of pendingInvitations) {
      // Check if share already exists (shouldn't happen, but just in case)
      const existingShare = await db
        .select()
        .from(dashboardShares)
        .where(
          and(
            eq(dashboardShares.ownerId, invitation.ownerId),
            eq(dashboardShares.sharedWithUserId, currentUserId)
          )
        )
        .limit(1);

      if (existingShare.length === 0) {
        // Create the share
        await db.insert(dashboardShares).values({
          ownerId: invitation.ownerId,
          sharedWithUserId: currentUserId,
        });
      }

      // Mark invitation as accepted
      await db
        .update(dashboardInvitations)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dashboardInvitations.id, invitation.id));
    }
  } catch (error) {
    console.error("Error checking pending invitations:", error);
  }
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(invitationId: string) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Not authenticated" };
    }

    const ownerId = session.user.id;

    // Verify the invitation belongs to the current user
    const invitation = await db
      .select()
      .from(dashboardInvitations)
      .where(
        and(
          eq(dashboardInvitations.id, invitationId),
          eq(dashboardInvitations.ownerId, ownerId),
          eq(dashboardInvitations.status, "pending")
        )
      )
      .limit(1);

    if (invitation.length === 0) {
      return { success: false, error: "Invitation not found" };
    }

    // Update status to expired (or delete it)
    await db
      .delete(dashboardInvitations)
      .where(eq(dashboardInvitations.id, invitationId));

    revalidatePath("/");
    return { success: true, message: "Invitation cancelled" };
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return { success: false, error: "Failed to cancel invitation" };
  }
}

