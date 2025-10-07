import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserX, Shield, ShieldOff, Ban, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UserWithEmail {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
}

interface Profile {
  id: string;
  status: 'active' | 'suspended' | 'banned';
  suspended_until: string | null;
  ban_reason: string | null;
}

interface UserManagementProps {
  users: UserWithEmail[];
  profiles: Profile[];
  onUserDeleted: () => void;
  onUserUpdated: () => void;
}

export const UserManagementTable = ({ users, profiles, onUserDeleted, onUserUpdated }: UserManagementProps) => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'ban' | null>(null);
  const [reason, setReason] = useState("");
  const [suspendDays, setSuspendDays] = useState("7");

  const getUserStatus = (userId: string) => {
    return profiles.find(p => p.id === userId)?.status || 'active';
  };

  const handleChangeRole = async (userId: string, newRole: 'user' | 'admin') => {
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: newRole });

    if (error) {
      toast.error("역할 변경 실패");
      return;
    }

    toast.success(`역할이 ${newRole}로 변경되었습니다`);
    onUserUpdated();
  };

  const handleSuspend = async () => {
    if (!selectedUser || !reason) {
      toast.error("사유를 입력해주세요");
      return;
    }

    const suspendUntil = new Date();
    suspendUntil.setDate(suspendUntil.getDate() + parseInt(suspendDays));

    const { error } = await supabase
      .from("profiles")
      .update({
        status: 'suspended',
        suspended_until: suspendUntil.toISOString(),
        ban_reason: reason,
      })
      .eq("id", selectedUser);

    if (error) {
      toast.error("정지 처리 실패");
      return;
    }

    toast.success("사용자가 정지되었습니다");
    setActionType(null);
    setSelectedUser(null);
    setReason("");
    onUserUpdated();
  };

  const handleBan = async () => {
    if (!selectedUser || !reason) {
      toast.error("사유를 입력해주세요");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        status: 'banned',
        ban_reason: reason,
      })
      .eq("id", selectedUser);

    if (error) {
      toast.error("차단 처리 실패");
      return;
    }

    toast.success("사용자가 영구 차단되었습니다");
    setActionType(null);
    setSelectedUser(null);
    setReason("");
    onUserUpdated();
  };

  const handleActivate = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        status: 'active',
        suspended_until: null,
        ban_reason: null,
      })
      .eq("id", userId);

    if (error) {
      toast.error("활성화 실패");
      return;
    }

    toast.success("사용자가 활성화되었습니다");
    onUserUpdated();
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/admin-delete-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) throw new Error("Failed to delete user");

      toast.success("사용자가 삭제되었습니다");
      onUserDeleted();
    } catch (error) {
      toast.error("사용자 삭제 실패");
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이메일</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>가입일</TableHead>
            <TableHead>마지막 로그인</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => {
            const status = getUserStatus(user.id);
            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{user.email}</p>
                    <p className="text-xs text-muted-foreground font-mono">{user.id.slice(0, 8)}...</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={status === 'active' ? 'default' : status === 'suspended' ? 'secondary' : 'destructive'}>
                    {status === 'active' ? '활성' : status === 'suspended' ? '정지' : '차단'}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString("ko-KR")}</TableCell>
                <TableCell>
                  {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("ko-KR") : "없음"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Select onValueChange={(value) => handleChangeRole(user.id, value as 'user' | 'admin')}>
                      <SelectTrigger className="w-24 h-8">
                        <SelectValue placeholder="역할" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {status === 'active' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user.id);
                            setActionType('suspend');
                          }}
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user.id);
                            setActionType('ban');
                          }}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    {status !== 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleActivate(user.id)}
                      >
                        <ShieldOff className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-destructive"
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={actionType === 'suspend'} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 일시 정지</DialogTitle>
            <DialogDescription>
              사용자를 일시적으로 정지시킵니다. 기간이 지나면 자동으로 활성화됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>정지 기간 (일)</Label>
              <Input
                type="number"
                value={suspendDays}
                onChange={(e) => setSuspendDays(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>사유</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="정지 사유를 입력하세요"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>취소</Button>
            <Button onClick={handleSuspend}>정지</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={actionType === 'ban'} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 영구 차단</DialogTitle>
            <DialogDescription>
              사용자를 영구적으로 차단합니다. 이 작업은 관리자만 해제할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>차단 사유</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="차단 사유를 입력하세요"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionType(null)}>취소</Button>
            <Button variant="destructive" onClick={handleBan}>영구 차단</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
