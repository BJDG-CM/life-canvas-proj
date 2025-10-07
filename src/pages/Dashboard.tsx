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
import { ChevronLeft, ChevronRight, Calendar, LogOut, BarChart3, Sparkles, ListTodo, FileText, Store } from "lucide-react";
import { format, addDays, subDays, parseISO } from "date-fns";
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

interface Tracker {
  id: number;
  name: string;
  type: "boolean" | "number" | "scale";
}

interface CustomLog {
  tracker_id: number;
  value: string;
}

interface StreakInfo {
  trackerName: string;
  days: number;
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
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [customLogs, setCustomLogs] = useState<Record<number, string>>({});
  const [currentLogId, setCurrentLogId] = useState<number | null>(null);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);

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
      loadTrackers();
      loadStreakInfo();
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
      setCurrentLogId(data.id);
      await loadCustomLogs(data.id);
    } else {
      setMoodScore(null);
      setSleepHours("");
      setExercised(false);
      setCoffeeCups(0);
      setMemo("");
      setCurrentLogId(null);
      setCustomLogs({});
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

    setTrackers((data || []) as Tracker[]);
  };

  const loadCustomLogs = async (logId: number) => {
    const { data, error } = await supabase
      .from("custom_logs")
      .select("*")
      .eq("log_id", logId);

    if (error) {
      console.error("Error loading custom logs:", error);
      return;
    }

    const logsMap: Record<number, string> = {};
    data?.forEach((log) => {
      logsMap[log.tracker_id] = log.value;
    });
    setCustomLogs(logsMap);
  };

  const loadStreakInfo = async () => {
    if (!user) return;

    // Get user's streak tracker
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("streak_tracker_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.streak_tracker_id) {
      setStreakInfo(null);
      return;
    }

    // Get tracker info
    const { data: tracker, error: trackerError } = await supabase
      .from("trackers")
      .select("name, type")
      .eq("id", profile.streak_tracker_id)
      .single();

    if (trackerError || !tracker) {
      setStreakInfo(null);
      return;
    }

    // Get all logs with this tracker
    const { data: logs, error: logsError } = await supabase
      .from("custom_logs")
      .select(`
        value,
        daily_logs!inner(log_date, user_id)
      `)
      .eq("tracker_id", profile.streak_tracker_id)
      .eq("daily_logs.user_id", user.id)
      .order("daily_logs(log_date)", { ascending: false });

    if (logsError || !logs) {
      setStreakInfo(null);
      return;
    }

    // Calculate streak
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const log of logs) {
      const logDate = parseISO((log as any).daily_logs.log_date);
      logDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
        // Check if achieved
        let achieved = false;
        if (tracker.type === "boolean") {
          achieved = log.value === "true";
        } else {
          const numValue = parseFloat(log.value);
          achieved = !isNaN(numValue) && numValue > 0;
        }

        if (achieved) {
          streak++;
        } else {
          break;
        }
      } else if (daysDiff > streak) {
        break;
      }
    }

    setStreakInfo({
      trackerName: tracker.name,
      days: streak
    });
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

    const { data, error } = await supabase
      .from("daily_logs")
      .upsert([logData], { onConflict: "user_id,log_date" })
      .select()
      .single();

    if (error) {
      toast.error("저장 실패: " + error.message);
      setLoading(false);
      return;
    }

    // Save custom logs
    const logId = data.id;
    
    // Delete existing custom logs for this date
    await supabase
      .from("custom_logs")
      .delete()
      .eq("log_id", logId);

    // Insert new custom logs
    const customLogsToInsert = Object.entries(customLogs)
      .filter(([_, value]) => value !== "" && value !== undefined)
      .map(([trackerId, value]) => ({
        log_id: logId,
        tracker_id: parseInt(trackerId),
        value: value
      }));

    if (customLogsToInsert.length > 0) {
      const { error: customError } = await supabase
        .from("custom_logs")
        .insert(customLogsToInsert);

      if (customError) {
        toast.error("커스텀 로그 저장 실패: " + customError.message);
      }
    }

    toast.success("저장되었습니다!");
    loadStreakInfo();
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
              onClick={() => navigate("/trackers")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ListTodo className="w-4 h-4" />
              나의 트래커
            </Button>
            <Button
              onClick={() => navigate("/market")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Store className="w-4 h-4" />
              마켓
            </Button>
            <Button
              onClick={() => navigate("/reports")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              리포트
            </Button>
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
        {streakInfo && streakInfo.days > 0 && (
          <Card className="mb-6 shadow-card bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="py-4">
              <p className="text-center text-lg font-semibold flex items-center justify-center gap-2">
                <span className="text-2xl">⭐</span>
                <span>{streakInfo.trackerName}</span>
                <span className="text-primary">{streakInfo.days}일째</span>
                <span>달성 중!</span>
                <span className="text-2xl">🔥</span>
              </p>
            </CardContent>
          </Card>
        )}

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

        {trackers.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            {trackers.map((tracker) => (
              <Card key={tracker.id} className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">{tracker.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {tracker.type === "boolean" ? (
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`tracker-${tracker.id}`} className="text-base">
                        완료하셨나요?
                      </Label>
                      <Switch
                        id={`tracker-${tracker.id}`}
                        checked={customLogs[tracker.id] === "true"}
                        onCheckedChange={(checked) =>
                          setCustomLogs({ ...customLogs, [tracker.id]: checked.toString() })
                        }
                      />
                    </div>
                  ) : tracker.type === "number" ? (
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        onClick={() => {
                          const current = parseInt(customLogs[tracker.id] || "0");
                          setCustomLogs({ ...customLogs, [tracker.id]: Math.max(0, current - 1).toString() });
                        }}
                        variant="outline"
                        size="icon"
                      >
                        -
                      </Button>
                      <span className="text-2xl font-bold w-12 text-center">
                        {customLogs[tracker.id] || "0"}
                      </span>
                      <Button
                        onClick={() => {
                          const current = parseInt(customLogs[tracker.id] || "0");
                          setCustomLogs({ ...customLogs, [tracker.id]: (current + 1).toString() });
                        }}
                        variant="outline"
                        size="icon"
                      >
                        +
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-between gap-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          onClick={() => setCustomLogs({ ...customLogs, [tracker.id]: score.toString() })}
                          className={`flex-1 p-2 rounded-lg transition-all ${
                            customLogs[tracker.id] === score.toString()
                              ? "bg-primary/20 scale-110 shadow-md"
                              : "hover:bg-muted"
                          }`}
                        >
                          <span className="text-2xl">{score}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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
