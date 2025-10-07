import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Calendar, LogOut, BarChart3, Sparkles } from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { ko } from "date-fns/locale";
import type { User, Session } from "@supabase/supabase-js";

interface DailyLog {
  id?: number;
  user_id: string;
  log_date: string;
  mood_score: number | null;
  sleep_hours: number | null;
  exercised: boolean;
  coffee_cups: number;
  memo: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState("");
  const [exercised, setExercised] = useState(false);
  const [coffeeCups, setCoffeeCups] = useState(0);
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadDailyLog();
    }
  }, [selectedDate, user]);

  const loadDailyLog = async () => {
    if (!user) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", dateStr)
      .maybeSingle();

    if (error) {
      console.error("Error loading log:", error);
      return;
    }

    if (data) {
      setMoodScore(data.mood_score);
      setSleepHours(data.sleep_hours?.toString() || "");
      setExercised(data.exercised);
      setCoffeeCups(data.coffee_cups);
      setMemo(data.memo || "");
    } else {
      setMoodScore(null);
      setSleepHours("");
      setExercised(false);
      setCoffeeCups(0);
      setMemo("");
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const logData = {
      user_id: user.id,
      log_date: dateStr,
      mood_score: moodScore,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
      exercised,
      coffee_cups: coffeeCups,
      memo,
    };

    const { error } = await supabase
      .from("daily_logs")
      .upsert([logData], { onConflict: "user_id,log_date" });

    if (error) {
      toast.error("저장 실패: " + error.message);
    } else {
      toast.success("저장되었습니다!");
    }

    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const moods = [
    { emoji: "😭", score: 1, label: "최악" },
    { emoji: "😟", score: 2, label: "나쁨" },
    { emoji: "😐", score: 3, label: "보통" },
    { emoji: "😊", score: 4, label: "좋음" },
    { emoji: "😃", score: 5, label: "최고" },
  ];

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
            <Button
              onClick={() => navigate("/analytics")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              분석 보기
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="icon">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <Button
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                variant="ghost"
                size="icon"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <span className="text-xl">
                  {format(selectedDate, "yyyy년 M월 d일 (EEE)", { locale: ko })}
                </span>
              </div>
              <Button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                variant="ghost"
                size="icon"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </CardTitle>
          </CardHeader>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">오늘의 기분</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between gap-2">
                {moods.map((mood) => (
                  <button
                    key={mood.score}
                    onClick={() => setMoodScore(mood.score)}
                    className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                      moodScore === mood.score
                        ? "bg-primary/20 scale-110 shadow-md"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span className="text-3xl mb-1">{mood.emoji}</span>
                    <span className="text-xs text-muted-foreground">{mood.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">수면 시간</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  max="24"
                  placeholder="7.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className="text-center text-lg"
                />
                <span className="text-muted-foreground">시간</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">운동</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="exercise" className="text-base">
                  운동하셨나요?
                </Label>
                <Switch
                  id="exercise"
                  checked={exercised}
                  onCheckedChange={setExercised}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">커피</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4">
                <Button
                  onClick={() => setCoffeeCups(Math.max(0, coffeeCups - 1))}
                  variant="outline"
                  size="icon"
                >
                  -
                </Button>
                <span className="text-2xl font-bold w-12 text-center">{coffeeCups}</span>
                <Button
                  onClick={() => setCoffeeCups(coffeeCups + 1)}
                  variant="outline"
                  size="icon"
                >
                  +
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">오늘의 한 줄</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="오늘 하루를 간단히 기록해보세요... (최대 200자)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              maxLength={200}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-2 text-right">
              {memo.length} / 200
            </p>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full mt-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-lg py-6"
        >
          {loading ? "저장 중..." : "저장하기"}
        </Button>
      </main>
    </div>
  );
};

export default Dashboard;
