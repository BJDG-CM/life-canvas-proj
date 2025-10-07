import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Target, Plus, Trash2, LogOut, Sparkles, CalendarIcon, ListTodo, Store, FileText, BarChart3 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Goal {
  id: number;
  name: string;
  target_value: number;
  linked_tracker_id: number | null;
  created_at: string;
  is_active: boolean;
}

interface Tracker {
  id: number;
  name: string;
  type: string;
}

interface GoalProgress {
  goalId: number;
  currentValue: number;
  targetValue: number;
  percentage: number;
  trackerName: string;
}

const Goals = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [goalProgress, setGoalProgress] = useState<Record<number, GoalProgress>>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  // New goal form
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [selectedTracker, setSelectedTracker] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadGoals();
      loadTrackers();
    }
  }, [user]);

  const loadGoals = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading goals:", error);
      return;
    }

    setGoals(data || []);
    
    // Calculate progress for each goal
    if (data) {
      for (const goal of data) {
        await calculateGoalProgress(goal);
      }
    }
  };

  const loadTrackers = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("trackers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading trackers:", error);
      return;
    }

    setTrackers(data || []);
  };

  const calculateGoalProgress = async (goal: Goal) => {
    if (!goal.linked_tracker_id || !user) return;

    // Get tracker info
    const { data: tracker } = await supabase
      .from("trackers")
      .select("name, type")
      .eq("id", goal.linked_tracker_id)
      .single();

    if (!tracker) return;

    // Get all custom logs for this tracker
    const { data: logs } = await supabase
      .from("custom_logs")
      .select(`
        value,
        daily_logs!inner(user_id)
      `)
      .eq("tracker_id", goal.linked_tracker_id)
      .eq("daily_logs.user_id", user.id);

    if (!logs) return;

    // Calculate total based on tracker type
    let total = 0;
    if (tracker.type === "boolean") {
      total = logs.filter(log => log.value === "true").length;
    } else {
      total = logs.reduce((sum, log) => {
        const val = parseFloat(log.value);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);
    }

    const percentage = Math.min(100, (total / goal.target_value) * 100);

    setGoalProgress(prev => ({
      ...prev,
      [goal.id]: {
        goalId: goal.id,
        currentValue: total,
        targetValue: goal.target_value,
        percentage,
        trackerName: tracker.name
      }
    }));
  };

  const handleAddGoal = async () => {
    if (!user || !newGoalName || !newGoalTarget || !selectedTracker) {
      toast.error("모든 필드를 입력해주세요");
      return;
    }

    const { error } = await supabase
      .from("goals")
      .insert({
        user_id: user.id,
        name: newGoalName,
        target_value: parseFloat(newGoalTarget),
        linked_tracker_id: parseInt(selectedTracker)
      });

    if (error) {
      toast.error("목표 추가 실패: " + error.message);
      return;
    }

    toast.success("목표가 추가되었습니다!");
    setIsAddDialogOpen(false);
    setNewGoalName("");
    setNewGoalTarget("");
    setSelectedTracker("");
    loadGoals();
  };

  const handleDeleteGoal = async (goalId: number) => {
    const { error } = await supabase
      .from("goals")
      .update({ is_active: false })
      .eq("id", goalId);

    if (error) {
      toast.error("목표 삭제 실패: " + error.message);
      return;
    }

    toast.success("목표가 삭제되었습니다");
    loadGoals();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              라이프 캔버스
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/today")} variant="outline" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              오늘
            </Button>
            <Button onClick={() => navigate("/dashboard")} variant="outline" className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              달력
            </Button>
            <Button onClick={() => navigate("/trackers")} variant="outline" className="flex items-center gap-2">
              <ListTodo className="w-4 h-4" />
              트래커
            </Button>
            <Button onClick={() => navigate("/market")} variant="outline" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              마켓
            </Button>
            <Button onClick={() => navigate("/reports")} variant="outline" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              리포트
            </Button>
            <Button onClick={() => navigate("/analytics")} variant="outline" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              분석
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="icon">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold">나의 목표</h2>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent">
                <Plus className="w-4 h-4" />
                새 목표 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="z-50 bg-card">
              <DialogHeader>
                <DialogTitle>새 목표 추가하기</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>목표 이름</Label>
                  <Input
                    placeholder="예: 올해 책 50권 읽기"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>목표값</Label>
                  <Input
                    type="number"
                    placeholder="50"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>연결할 트래커</Label>
                  <Select value={selectedTracker} onValueChange={setSelectedTracker}>
                    <SelectTrigger>
                      <SelectValue placeholder="트래커 선택" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-card">
                      {trackers.map((tracker) => (
                        <SelectItem key={tracker.id} value={tracker.id.toString()}>
                          {tracker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddGoal} className="w-full">
                  목표 추가하기
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {goals.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground mb-4">
                아직 설정된 목표가 없습니다
              </p>
              <p className="text-sm text-muted-foreground">
                '+ 새 목표 추가' 버튼을 눌러 첫 목표를 설정해보세요
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {goals.map((goal) => {
              const progress = goalProgress[goal.id];
              return (
                <Card key={goal.id} className="shadow-card">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="text-xl">{goal.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {progress ? (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">
                              연결된 트래커: {progress.trackerName}
                            </span>
                            <span className="text-sm font-semibold">
                              {progress.currentValue} / {progress.targetValue}
                            </span>
                          </div>
                          <Progress value={progress.percentage} className="h-3" />
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-primary">
                            {progress.percentage.toFixed(1)}%
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            목표 달성률
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        진행률을 계산하는 중...
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Goals;
