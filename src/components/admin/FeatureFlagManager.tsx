import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FeatureFlag {
  id: number;
  name: string;
  description: string | null;
  is_enabled: boolean;
  rollout_percentage: number;
}

interface FeatureFlagManagerProps {
  flags: FeatureFlag[];
  onFlagUpdated: () => void;
}

export const FeatureFlagManager = ({ flags, onFlagUpdated }: FeatureFlagManagerProps) => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleAdd = async () => {
    if (!name) {
      toast.error("기능 이름을 입력해주세요");
      return;
    }

    const { error } = await supabase
      .from("feature_flags")
      .insert({ name, description });

    if (error) {
      toast.error("기능 플래그 추가 실패");
      return;
    }

    toast.success("기능 플래그가 추가되었습니다");
    setIsAddOpen(false);
    setName("");
    setDescription("");
    onFlagUpdated();
  };

  const handleToggle = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from("feature_flags")
      .update({ is_enabled: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("상태 변경 실패");
      return;
    }

    toast.success(currentStatus ? "기능이 비활성화되었습니다" : "기능이 활성화되었습니다");
    onFlagUpdated();
  };

  const handleRolloutChange = async (id: number, percentage: number) => {
    const { error } = await supabase
      .from("feature_flags")
      .update({ rollout_percentage: percentage })
      .eq("id", id);

    if (error) {
      toast.error("배포 비율 변경 실패");
      return;
    }

    onFlagUpdated();
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase
      .from("feature_flags")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("삭제 실패");
      return;
    }

    toast.success("기능 플래그가 삭제되었습니다");
    onFlagUpdated();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Feature Flag 관리</h3>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              플래그 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 Feature Flag</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>기능 이름</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: new_dashboard_design"
                />
              </div>
              <div className="space-y-2">
                <Label>설명</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="이 기능에 대한 설명"
                  rows={3}
                />
              </div>
              <Button onClick={handleAdd} className="w-full">
                추가
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {flags.map((flag) => (
          <Card key={flag.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{flag.name}</CardTitle>
                  {flag.description && (
                    <p className="text-sm text-muted-foreground mt-1">{flag.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Switch
                    checked={flag.is_enabled}
                    onCheckedChange={() => handleToggle(flag.id, flag.is_enabled)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(flag.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>배포 비율: {flag.rollout_percentage}%</Label>
                </div>
                <Slider
                  value={[flag.rollout_percentage]}
                  onValueChange={([value]) => handleRolloutChange(flag.id, value)}
                  max={100}
                  step={10}
                  disabled={!flag.is_enabled}
                />
                <p className="text-xs text-muted-foreground">
                  전체 사용자의 {flag.rollout_percentage}%에게만 이 기능이 표시됩니다
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {flags.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            등록된 Feature Flag가 없습니다
          </CardContent>
        </Card>
      )}
    </div>
  );
};
