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
import { LogOut, BarChart3, Sparkles, ListTodo, FileText, Store, CloudSun, TrendingUp, Calendar as CalendarIcon, Target, Settings as SettingsIcon, Users, Image as ImageIcon } from "lucide-react";
import { format, subDays, subYears } from "date-fns";
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

interface StreakInfo {
  trackerName: string;
  days: number;
}

interface YesterdayData {
  mood_score: number | null;
  sleep_hours: number | null;
  exercised: boolean;
  memo: string | null;
}

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
}

interface Insights {
  insights: string[];
  hasData: boolean;
}

const Today = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const today = new Date();
  
  // Today's log data
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [sleepHours, setSleepHours] = useState("");
  const [exercised, setExercised] = useState(false);
  const [coffeeCups, setCoffeeCups] = useState(0);
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [customLogs, setCustomLogs] = useState<Record<number, string>>({});
  const [currentLogId, setCurrentLogId] = useState<number | null>(null);
  
  // Briefing data
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [yesterdayData, setYesterdayData] = useState<YesterdayData | null>(null);
  const [lastYearData, setLastYearData] = useState<DailyLog | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

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
      loadTodayLog();
      loadTrackers();
      loadStreakInfo();
      loadYesterdayData();
      loadLastYearData();
      loadWeather();
      loadInsights();
    }
  }, [user]);

  const loadInsights = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-insights');
      
      if (error) throw error;
      
      if (data && data.insights) {
        setInsights(data.insights);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const loadWeather = async () => {
    // For demo, showing sample weather data
    // In production, call weather API via edge function
    setWeather({
      temp: 18,
      description: "맑음",
      icon: "☀️"
    });
  };

  const loadYesterdayData = async () => {
    if (!user) return;

    const yesterday = subDays(today, 1);
    const dateStr = format(yesterday, "yyyy-MM-dd");
    
    const { data, error } = await supabase
      .from("daily_logs")
      .select("mood_score, sleep_hours, exercised, memo")
      .eq("user_id", user.id)
      .eq("log_date", dateStr)
      .maybeSingle();

    if (!error && data) {
      setYesterdayData(data as YesterdayData);
    }
  };

  const loadLastYearData = async () => {
    if (!user) return;

    const lastYear = subYears(today, 1);
    const dateStr = format(lastYear, "yyyy-MM-dd");
    
    const { data, error } = await supabase
      .from("daily_logs")
      .select("*")
      .eq("user_id", user.id)
      .eq("log_date", dateStr)
      .maybeSingle();

    if (!error && data) {
      setLastYearData(data as DailyLog);
    }
  };

  const loadTodayLog = async () => {
    if (!user) return;

    const dateStr = format(today, "yyyy-MM-dd");
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
      setPhotoUrl(data.photo_url);
      await loadCustomLogs(data.id);
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("streak_tracker_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.streak_tracker_id) {
      setStreakInfo(null);
      return;
    }

    const { data: tracker, error: trackerError } = await supabase
      .from("trackers")
      .select("name, type")
      .eq("id", profile.streak_tracker_id)
      .single();

    if (trackerError || !tracker) {
      setStreakInfo(null);
      return;
    }

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

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (const log of logs) {
      const logDate = new Date((log as any).daily_logs.log_date);
      logDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor((currentDate.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
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
    const dateStr = format(today, "yyyy-MM-dd");

    let uploadedPhotoUrl = photoUrl;

    // Upload photo if selected
    if (photoFile) {
      const filePath = `${user.id}/${dateStr}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('daily-photos')
        .upload(filePath, photoFile);

      if (uploadError) {
        toast.error("사진 업로드 실패: " + uploadError.message);
      } else {
        const { data: urlData } = supabase.storage
          .from('daily-photos')
          .getPublicUrl(filePath);
        uploadedPhotoUrl = urlData.publicUrl;
      }
    }

    const logData = {
      user_id: user.id,
      log_date: dateStr,
      mood_score: moodScore,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
      exercised,
      coffee_cups: coffeeCups,
      memo,
      photo_url: uploadedPhotoUrl,
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

    const logId = data.id;
    
    await supabase
      .from("custom_logs")
      .delete()
      .eq("log_id", logId);

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
    loadYesterdayData();
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

  const getMoodEmoji = (score: number | null) => {
    if (!score) return "😐";
    return moods.find(m => m.score === score)?.emoji || "😐";
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
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CalendarIcon className="w-4 h-4" />
              달력 보기
            </Button>
            <Button
              onClick={() => navigate("/trackers")}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ListTodo className="w-4 h-4" />
              트래커
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
              분석
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="icon">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Weather & Greeting */}
        <Card className="mb-6 shadow-elevated bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  좋은 아침이에요, {user?.email?.split('@')[0]} 님! 👋
                </h2>
                <p className="text-muted-foreground">
                  {format(today, "yyyy년 M월 d일 (EEE)", { locale: ko })}
                </p>
              </div>
              {weather && (
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-3xl">{weather.icon}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{weather.temp}°C</p>
                    <p className="text-sm text-muted-foreground">{weather.description}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Yesterday & Streak */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {yesterdayData && (
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  어제의 나
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {yesterdayData.sleep_hours && (
                    <p className="flex items-center gap-2">
                      <span className="text-2xl">💤</span>
                      <span>{yesterdayData.sleep_hours}시간 주무셨네요!</span>
                    </p>
                  )}
                  {yesterdayData.mood_score && (
                    <p className="flex items-center gap-2">
                      <span className="text-2xl">{getMoodEmoji(yesterdayData.mood_score)}</span>
                      <span>기분 점수 {yesterdayData.mood_score}점</span>
                    </p>
                  )}
                  {yesterdayData.exercised && (
                    <p className="flex items-center gap-2">
                      <span className="text-2xl">💪</span>
                      <span>운동도 하셨어요!</span>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {streakInfo && streakInfo.days > 0 && (
            <Card className="shadow-card bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-200 dark:border-yellow-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="text-2xl">⭐</span>
                  오늘의 다짐
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {streakInfo.trackerName}
                </p>
                <p className="text-primary font-bold text-2xl mt-2">
                  {streakInfo.days}일째 달성 중! 🔥
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  오늘도 도전해 볼까요?
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Personalized Insights */}
        {insights.length > 0 && (
          <Card className="mb-6 shadow-card bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                나를 위한 인사이트
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight, index) => (
                  <p key={index} className="text-base flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{insight}</span>
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* On This Day Last Year */}
        {lastYearData && (
          <Card className="mb-6 shadow-card bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                1년 전 오늘
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastYearData.memo && (
                <p className="text-lg italic">"{lastYearData.memo}"</p>
              )}
              <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
                {lastYearData.mood_score && (
                  <span>{getMoodEmoji(lastYearData.mood_score)} 기분 {lastYearData.mood_score}점</span>
                )}
                {lastYearData.sleep_hours && (
                  <span>💤 {lastYearData.sleep_hours}시간</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Log Input */}
        <Card className="mb-6 shadow-card">
          <CardHeader>
            <CardTitle className="text-xl">오늘의 기록</CardTitle>
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
                  {tracker.type === "boolean" && (
                    <Switch
                      checked={customLogs[tracker.id] === "true"}
                      onCheckedChange={(checked) =>
                        setCustomLogs({ ...customLogs, [tracker.id]: checked.toString() })
                      }
                    />
                  )}
                  {tracker.type === "number" && (
                    <Input
                      type="number"
                      value={customLogs[tracker.id] || ""}
                      onChange={(e) =>
                        setCustomLogs({ ...customLogs, [tracker.id]: e.target.value })
                      }
                      placeholder="0"
                    />
                  )}
                  {tracker.type === "scale" && (
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={customLogs[tracker.id] || ""}
                      onChange={(e) =>
                        setCustomLogs({ ...customLogs, [tracker.id]: e.target.value })
                      }
                      placeholder="1-10"
                    />
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
          <CardContent className="space-y-4">
            <Textarea
              placeholder="오늘 하루는 어땠나요?"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4" />
                오늘의 사진 (선택사항)
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPhotoFile(file);
                }}
              />
              {(photoUrl || photoFile) && (
                <p className="text-sm text-muted-foreground mt-2">
                  {photoFile ? "새 사진이 선택되었습니다" : "사진이 저장되어 있습니다"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full mt-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-elevated text-lg py-6"
        >
          {loading ? "저장 중..." : "오늘 기록 저장하기"}
        </Button>
      </main>
    </div>
  );
};

export default Today;
