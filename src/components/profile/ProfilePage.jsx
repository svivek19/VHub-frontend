import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const ProfilePage = ({ currentUser }) => {
  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [password, setPassword] = useState("");

  const handleUpdate = () => {
    console.log("update", { name, email, password });
  };

  const handleDelete = () => {
    console.log("delete account");
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

            <Button onClick={handleUpdate}>Update Profile</Button>
          </CardContent>
        </Card>

        <Separator />

        {/* DELETE ACCOUNT */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Delete Account</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>

            <Button variant="destructive" onClick={handleDelete}>
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
