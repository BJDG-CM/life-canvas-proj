import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ArrowLeft, Sparkles } from "lucide-react";
import { subDays, format } from "date-fns";
import { ko } from "date-fns/locale";
import type { User, Session } from "@supabase/supabase-js";

interface ChartData {
  date: string;
  value1: number | null;
  value2: number | null;
}

const Analytics = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [period, setPeriod] = useState("30");
  const [metric1, setMetric1] = useState("mood_score");
  const [metric2, setMetric2] = useState("sleep_hours");
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
  }, [user, period, metric1, metric2]);

  const loadChartData = async () => {
    if (!user) return;

    const days = parseInt(period);
    const startDate = format(subDays(new Date(), days), "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("daily_logs")
      .select("log_date, mood_score, sleep_hours, coffee_cups")
      .eq("user_id", user.id)
      .gte("log_date", startDate)
      .order("log_date", { ascending: true });

    if (error) {
      console.error("Error loading data:", error);
      return;
    }

    const formattedData = data.map((log) => ({
      date: format(new Date(log.log_date), "M/d", { locale: ko }),
      value1: log[metric1 as keyof typeof log] as number | null,
      value2: log[metric2 as keyof typeof log] as number | null,
    }));

    setChartData(formattedData);
  };

  const metricLabels: Record<string, string> = {
    mood_score: "기분 점수",
    sleep_hours: "수면 시간",
    coffee_cups: "커피 잔 수",
  };

  const metricColors: Record<string, string> = {
    mood_score: "#a855f7",
    sleep_hours: "#3b82f6",
    coffee_cups: "#ec4899",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate("/dashboard")} variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                데이터 분석
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Card className="mb-6 shadow-card">
          <CardHeader>
            <CardTitle>분석 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-2 block">기간</label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">최근 7일</SelectItem>
                    <SelectItem value="30">최근 30일</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">첫 번째 데이터</label>
                <Select value={metric1} onValueChange={setMetric1}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mood_score">기분 점수</SelectItem>
                    <SelectItem value="sleep_hours">수면 시간</SelectItem>
                    <SelectItem value="coffee_cups">커피 잔 수</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">두 번째 데이터</label>
                <Select value={metric2} onValueChange={setMetric2}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mood_score">기분 점수</SelectItem>
                    <SelectItem value="sleep_hours">수면 시간</SelectItem>
                    <SelectItem value="coffee_cups">커피 잔 수</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>
              {metricLabels[metric1]} vs {metricLabels[metric2]}
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
                    yAxisId="left"
                    stroke={metricColors[metric1]}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke={metricColors[metric2]}
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
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="value1"
                    stroke={metricColors[metric1]}
                    strokeWidth={2}
                    name={metricLabels[metric1]}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="value2"
                    stroke={metricColors[metric2]}
                    strokeWidth={2}
                    name={metricLabels[metric2]}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 shadow-card bg-gradient-to-br from-primary/5 to-accent/5">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              💡 <strong>팁:</strong> 두 데이터 라인을 비교하여 일상의 패턴을 발견해보세요. 
              예를 들어, 수면 시간과 기분의 상관관계를 확인할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Analytics;
