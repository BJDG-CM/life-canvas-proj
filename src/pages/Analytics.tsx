import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { LogOut, Sparkles, CalendarIcon, ListTodo, Store, FileText, Target, Settings as SettingsIcon, Users } from "lucide-react";
import { subDays, subMonths, subYears, format } from "date-fns";
import { ko } from "date-fns/locale";
import type { User, Session } from "@supabase/supabase-js";

interface ChartData {
  date: string;
  [key: string]: number | null | string;
}

const Analytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [periodType, setPeriodType] = useState("preset");
  const [period, setPeriod] = useState("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["mood_score", "sleep_hours"]);
  const [chartData, setChartData] = useState<ChartData[]>([]);

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
      loadChartData();
    }
  }, [user, period, periodType, customStart, customEnd, selectedMetrics]);

  const loadChartData = async () => {
    if (!user) return;

    let startDate: string;
    let endDate = format(new Date(), "yyyy-MM-dd");

    if (periodType === "custom" && customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
    } else {
      const days = parseInt(period);
      if (period === "30") {
        startDate = format(subDays(new Date(), 30), "yyyy-MM-dd");
      } else if (period === "90") {
        startDate = format(subMonths(new Date(), 3), "yyyy-MM-dd");
      } else if (period === "365") {
        startDate = format(subYears(new Date(), 1), "yyyy-MM-dd");
      } else {
        startDate = format(subDays(new Date(), days), "yyyy-MM-dd");
      }
    }

    const { data, error } = await supabase
      .from("daily_logs")
      .select("log_date, mood_score, sleep_hours, coffee_cups, exercised")
      .eq("user_id", user.id)
      .gte("log_date", startDate)
      .lte("log_date", endDate)
      .order("log_date", { ascending: true });

    if (error) {
      console.error("Error loading data:", error);
      return;
    }

    const formattedData = data.map((log) => {
      const dataPoint: ChartData = {
        date: format(new Date(log.log_date), "M/d", { locale: ko })
      };
      
      selectedMetrics.forEach((metric, index) => {
        if (metric === "exercised") {
          dataPoint[`value${index + 1}`] = log.exercised ? 1 : 0;
        } else {
          dataPoint[`value${index + 1}`] = log[metric as keyof typeof log] as number | null;
        }
      });

      return dataPoint;
    });

    setChartData(formattedData);
  };

  const metricLabels: Record<string, string> = {
    mood_score: "기분 점수",
    sleep_hours: "수면 시간",
    coffee_cups: "커피 잔 수",
    exercised: "운동 여부"
  };

  const metricColors = ["#a855f7", "#3b82f6", "#ec4899", "#10b981"];

  const toggleMetric = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
      }
    } else {
      if (selectedMetrics.length < 4) {
        setSelectedMetrics([...selectedMetrics, metric]);
      }
    }
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
            <Button onClick={() => navigate("/goals")} variant="outline" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              목표
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
            <Button onClick={() => navigate("/community")} variant="outline" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              커뮤니티
            </Button>
            <Button onClick={() => navigate("/settings")} variant="outline" className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              설정
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="icon">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">고급 분석</h2>
          <p className="text-muted-foreground">여러 데이터를 동시에 비교하여 패턴을 발견하세요</p>
        </div>

        <Card className="mb-6 shadow-card">
          <CardHeader>
            <CardTitle>분석 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Period Selection */}
            <div className="space-y-4">
              <Label>기간 선택</Label>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Select value={periodType} onValueChange={setPeriodType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-card">
                      <SelectItem value="preset">기본 기간</SelectItem>
                      <SelectItem value="custom">커스텀 기간</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {periodType === "preset" ? (
                  <div>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-50 bg-card">
                        <SelectItem value="7">최근 7일</SelectItem>
                        <SelectItem value="30">최근 30일</SelectItem>
                        <SelectItem value="90">최근 3개월</SelectItem>
                        <SelectItem value="365">최근 1년</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">시작일</Label>
                      <Input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">종료일</Label>
                      <Input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Metric Selection */}
            <div className="space-y-3">
              <Label>비교할 데이터 (최대 4개)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(metricLabels).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={selectedMetrics.includes(key) ? "default" : "outline"}
                    className="w-full"
                    onClick={() => toggleMetric(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                선택된 데이터: {selectedMetrics.length}/4
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>
              {selectedMetrics.map(m => metricLabels[m]).join(" / ")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '8px'
                    }}
                  />
                  <Legend />
                  {selectedMetrics.map((metric, index) => (
                    <Line
                      key={metric}
                      type="monotone"
                      dataKey={`value${index + 1}`}
                      stroke={metricColors[index]}
                      strokeWidth={2}
                      name={metricLabels[metric]}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              💡 <strong>Pro Tip:</strong> 최대 4개의 데이터를 동시에 비교하여 숨겨진 패턴을 발견해보세요.
              장기간 데이터를 분석하면 더 정확한 인사이트를 얻을 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Analytics;
