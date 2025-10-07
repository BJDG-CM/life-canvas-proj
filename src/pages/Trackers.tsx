import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Star, Plus, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Tracker {
  id: number;
  name: string;
  type: "boolean" | "number" | "scale";
  created_at: string;
}

interface Profile {
  streak_tracker_id: number | null;
}

const Trackers = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [streakTrackerId, setStreakTrackerId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTrackerName, setNewTrackerName] = useState("");
  const [newTrackerType, setNewTrackerType] = useState<"boolean" | "number" | "scale">("boolean");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadTrackers();
      loadProfile();
    }
  }, [user]);

  const loadTrackers = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("trackers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading trackers:", error);
      toast.error("트래커 로드 실패");
      return;
    }

    setTrackers((data || []) as Tracker[]);
  };

  const loadProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("streak_tracker_id")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error loading profile:", error);
      return;
    }

    setStreakTrackerId(data?.streak_tracker_id || null);
  };

  const handleCreateTracker = async () => {
    if (!user || !newTrackerName.trim()) {
      toast.error("트래커 이름을 입력해주세요");
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("trackers")
      .insert([{
        user_id: user.id,
        name: newTrackerName.trim(),
        type: newTrackerType
      }]);

    if (error) {
      toast.error("트래커 생성 실패: " + error.message);
    } else {
      toast.success("트래커가 생성되었습니다!");
      setNewTrackerName("");
      setNewTrackerType("boolean");
      setDialogOpen(false);
      loadTrackers();
    }

    setLoading(false);
  };

  const handleSetStreakTracker = async (trackerId: number) => {
    if (!user) return;

    const newStreakId = streakTrackerId === trackerId ? null : trackerId;

    const { error } = await supabase
      .from("profiles")
      .update({ streak_tracker_id: newStreakId })
      .eq("id", user.id);

    if (error) {
      toast.error("핵심 습관 설정 실패: " + error.message);
    } else {
      setStreakTrackerId(newStreakId);
      toast.success(newStreakId ? "핵심 습관으로 설정되었습니다!" : "핵심 습관 설정이 해제되었습니다");
    }
  };

  const handleDeleteTracker = async (trackerId: number) => {
    if (!user) return;

    const { error } = await supabase
      .from("trackers")
      .delete()
      .eq("id", trackerId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("트래커 삭제 실패: " + error.message);
    } else {
      toast.success("트래커가 삭제되었습니다");
      loadTrackers();
      if (streakTrackerId === trackerId) {
        setStreakTrackerId(null);
      }
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "boolean": return "참/거짓";
      case "number": return "숫자";
      case "scale": return "척도";
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate("/dashboard")}
              variant="ghost"
              size="icon"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              나의 트래커
            </h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                새 트래커 추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 트래커 만들기</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">트래커 이름</Label>
                  <Input
                    id="name"
                    placeholder="예: 운동하기, 책 읽기"
                    value={newTrackerName}
                    onChange={(e) => setNewTrackerName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">타입</Label>
                  <Select value={newTrackerType} onValueChange={(value: any) => setNewTrackerType(value)}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="boolean">참/거짓 (했다/안했다)</SelectItem>
                      <SelectItem value="number">숫자 (횟수, 양 등)</SelectItem>
                      <SelectItem value="scale">척도 (1-5 점수)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateTracker} disabled={loading} className="w-full">
                {loading ? "생성 중..." : "트래커 만들기"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {trackers.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">
                아직 생성된 트래커가 없습니다.
              </p>
              <p className="text-sm text-muted-foreground">
                '새 트래커 추가' 버튼을 눌러 첫 트래커를 만들어보세요!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              ⭐ 별표를 클릭하여 핵심 습관으로 설정하면 대시보드에서 스트릭을 확인할 수 있습니다.
            </p>
            {trackers.map((tracker) => (
              <Card key={tracker.id} className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSetStreakTracker(tracker.id)}
                        className={`transition-all ${
                          streakTrackerId === tracker.id
                            ? "text-yellow-500 scale-110"
                            : "text-gray-300 hover:text-yellow-400"
                        }`}
                      >
                        <Star
                          className="w-6 h-6"
                          fill={streakTrackerId === tracker.id ? "currentColor" : "none"}
                        />
                      </button>
                      <div>
                        <p className="text-lg">{tracker.name}</p>
                        <p className="text-sm text-muted-foreground font-normal">
                          타입: {getTypeLabel(tracker.type)}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDeleteTracker(tracker.id)}
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Trackers;
