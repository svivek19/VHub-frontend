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
    <div className="flex-1 p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Profile</h1>

        <Button variant="outline" size="sm" onClick={onClose}>
          ← Back
        </Button>
      </div>
      <div className="max-w-xl mx-auto space-y-6">
        {/* UPDATE PROFILE */}
        <Card>
          <CardHeader>
            <CardTitle>Update Profile</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
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
                placeholder="Leave empty if not change"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Profile"}
            </Button>
          </CardContent>
        </Card>

        <Separator />

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Delete Account</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>

            <Button
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
              variant="destructive"
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
