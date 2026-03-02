import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import { updateUser } from "@/services/userApi";

const ProfilePage = ({ currentUser }) => {
  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [password, setPassword] = useState("");

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }) => updateUser(userId, data),

    onSuccess: (updatedUser) => {
      localStorage.setItem("user", JSON.stringify(updatedUser));

      setPassword("");

      alert("Profile updated");
    },

    onError: () => {
      alert("Update failed");
    },
  });

  // ✅ UPDATE
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

        {/* DELETE */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Delete Account</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>

            <Button variant="destructive">Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
