import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { updateUser, deleteUser } from "@/services/userApi";

const ProfilePage = ({ currentUser, onClose }) => {
  const navigate = useNavigate();

  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [password, setPassword] = useState("");

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }) => updateUser(userId, data),

    onSuccess: (updatedUser) => {
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setPassword("");

      toast.success("Profile updated");
    },

    onError: () => {
      toast.error("Update failed");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (userId) => deleteUser(userId),

    onSuccess: () => {
      localStorage.clear();
      navigate("/");
      toast.success("Account deleted");
    },

    onError: () => {
      toast.error("Delete failed");
    },
  });

  const handleUpdate = () => {
    updateMutation.mutate({
      userId: currentUser.id,
      data: {
        name,
        email,
        password: password || undefined,
      },
    });
  };

  return (
    <div className="w-full h-full p-8 overflow-auto">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Profile Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your account information
            </p>
          </div>

          <Button variant="outline" size="sm" onClick={onClose}>
            ← Back
          </Button>
        </div>

        {/* Profile Card */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg">
              {name?.charAt(0).toUpperCase()}
            </div>

            <div>
              <CardTitle>Update Profile</CardTitle>
              <p className="text-sm text-muted-foreground">
                Update your personal information
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                placeholder="Leave empty if not changing password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Updating..." : "Update Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>

          <CardContent className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently remove your account and all data.
              </p>
            </div>

            <Button
              variant="destructive"
              onClick={() => {
                toast.custom((t) => (
                  <div className="bg-background border rounded-lg p-4 shadow-lg space-y-3">
                    <p className="font-medium">Are you sure?</p>
                    <p className="text-sm text-muted-foreground">
                      This will permanently delete your account.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.dismiss(t)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          toast.dismiss(t);
                          deleteMutation.mutate(currentUser.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ));
              }}
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
