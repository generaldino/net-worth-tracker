"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import { InviteUserDialog } from "./InviteUserDialog";
import { SharedUsersList } from "./SharedUsersList";
import { PendingInvitationsList } from "./PendingInvitationsList";
import {
  getSharedUsers,
  getPendingInvitations,
} from "@/app/actions/sharing";
import { Users, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ShareDashboardSection() {
  const [sharedUsers, setSharedUsers] = useState<
    Array<{
      id: string;
      email: string;
      name: string | null;
      avatarUrl: string | null;
      sharedAt: Date;
    }>
  >([]);
  const [pendingInvitations, setPendingInvitations] = useState<
    Array<{
      id: string;
      email: string;
      createdAt: Date;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [users, invitations] = await Promise.all([
        getSharedUsers(),
        getPendingInvitations(),
      ]);
      setSharedUsers(users);
      setPendingInvitations(invitations);
    } catch (error) {
      console.error("Error loading sharing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Share Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Invite others to view your Wealth Tracker dashboard
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Users className="mr-2 h-4 w-4" />
              Invite User
            </Button>
          </DialogTrigger>
          <InviteUserDialog onSuccess={handleRefresh} />
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Shared Users
            </CardTitle>
            <CardDescription>
              Users who currently have access to your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Loading...
              </div>
            ) : (
              <SharedUsersList users={sharedUsers} onRevoke={handleRefresh} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations waiting for users to sign in
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                Loading...
              </div>
            ) : (
              <PendingInvitationsList
                invitations={pendingInvitations}
                onCancel={handleRefresh}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

