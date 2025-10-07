import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

interface AnnouncementManagerProps {
  announcements: Announcement[];
  onAnnouncementUpdated: () => void;
}

export const AnnouncementManager = ({ announcements, onAnnouncementUpdated }: AnnouncementManagerProps) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState("info");
  const [endDate, setEndDate] = useState("");

  const handleAdd = async () => {
    if (!title || !content) {
      toast.error("제목과 내용을 입력해주세요");
      return;
    }

    const { error } = await supabase
      .from("announcements")
      .insert({
        title,
        content,
        type,
        end_date: endDate || null,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });

    if (error) {
      toast.error("공지사항 등록 실패");
      return;
    }

    toast.success("공지사항이 등록되었습니다");
    setIsAddOpen(false);
    setTitle("");
    setContent("");
    setEndDate("");
    onAnnouncementUpdated();
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("상태 변경 실패");
      return;
    }

    toast.success(currentStatus ? "공지사항이 비활성화되었습니다" : "공지사항이 활성화되었습니다");
    onAnnouncementUpdated();
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("삭제 실패");
      return;
    }

    toast.success("공지사항이 삭제되었습니다");
    onAnnouncementUpdated();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">공지사항 관리</h3>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              공지사항 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>새 공지사항</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="공지사항 제목"
                />
              </div>
              <div className="space-y-2">
                <Label>내용</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="공지사항 내용"
                  rows={6}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>타입</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">정보</SelectItem>
                      <SelectItem value="warning">경고</SelectItem>
                      <SelectItem value="success">성공</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>종료일 (선택)</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleAdd} className="w-full">
                등록
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    <Badge variant={
                      announcement.type === 'success' ? 'default' :
                      announcement.type === 'warning' ? 'secondary' : 'outline'
                    }>
                      {announcement.type === 'success' ? '성공' : 
                       announcement.type === 'warning' ? '경고' : '정보'}
                    </Badge>
                    {announcement.is_active && <Badge className="bg-green-500">활성</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Switch
                    checked={announcement.is_active}
                    onCheckedChange={() => handleToggleActive(announcement.id, announcement.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(announcement.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-line">{announcement.content}</p>
              <div className="mt-4 text-sm text-muted-foreground">
                {announcement.end_date && (
                  <p>종료일: {new Date(announcement.end_date).toLocaleDateString("ko-KR")}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {announcements.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            등록된 공지사항이 없습니다
          </CardContent>
        </Card>
      )}
    </div>
  );
};
