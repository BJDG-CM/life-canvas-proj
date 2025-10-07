import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, FileText, TrendingUp, Sparkles, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { User } from "@supabase/supabase-js";
import { generateWeeklyReport, getWeekRange, type WeeklyReportData } from "@/lib/reportUtils";

interface WeeklyReport {
  id: number;
  week_start: string;
  week_end: string;
  report_data: WeeklyReportData;
  created_at: string;
}

const Reports = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

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
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false });

    if (error) {
      console.error("Error loading reports:", error);
      toast.error("리포트 로드 실패");
    } else {
      setReports((data || []) as unknown as WeeklyReport[]);
    }

    setLoading(false);
  };

  const handleGenerateReport = async (weeksAgo: number = 1) => {
    if (!user) return;

    setGenerating(true);
    const { start, end } = getWeekRange(weeksAgo);
    const weekStartStr = format(start, "yyyy-MM-dd");
    const weekEndStr = format(end, "yyyy-MM-dd");

    try {
      // Check if report already exists
      const { data: existing } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start", weekStartStr)
        .maybeSingle();

      if (existing) {
        toast.info("이미 생성된 리포트입니다");
        setSelectedReport(existing as unknown as WeeklyReport);
        setGenerating(false);
        return;
      }

      // Generate report
      const reportData = await generateWeeklyReport(user.id, start, end);

      // Save report
      const { data: newReport, error } = await supabase
        .from("weekly_reports")
        .insert([{
          user_id: user.id,
          week_start: weekStartStr,
          week_end: weekEndStr,
          report_data: reportData as any,
        }])
        .select()
        .single();

      if (error) {
        toast.error("리포트 생성 실패: " + error.message);
      } else {
        toast.success("리포트가 생성되었습니다!");
        const typedReport = newReport as unknown as WeeklyReport;
        setReports([typedReport, ...reports]);
        setSelectedReport(typedReport);
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("리포트 생성 중 오류가 발생했습니다");
    }

    setGenerating(false);
  };

  if (selectedReport) {
    const data = selectedReport.report_data;
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => setSelectedReport(null)}
                variant="ghost"
                size="icon"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                주간 리포트
              </h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <Card className="mb-6 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {data.weekLabel}
              </CardTitle>
            </CardHeader>
          </Card>

          {/* Summary */}
          <Card className="mb-6 shadow-card bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                주간 요약
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-lg font-medium">지난주도 수고하셨어요!</p>
              
              {data.summary.streakHabit && (
                <div className="p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                  <p className="text-base">
                    ⭐ <span className="font-semibold">{data.summary.streakHabit.name}</span> 목표를{" "}
                    {data.summary.streakHabit.totalDays}일 중{" "}
                    <span className="text-primary font-bold">{data.summary.streakHabit.successCount}일</span>{" "}
                    달성하셨네요! (성공률 {data.summary.streakHabit.successRate}%)
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {data.summary.avgMood !== null && (
                  <div className="p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">평균 기분</p>
                    <p className="text-2xl font-bold text-primary">{data.summary.avgMood}점</p>
                  </div>
                )}
                {data.summary.avgSleep !== null && (
                  <div className="p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">평균 수면</p>
                    <p className="text-2xl font-bold text-primary">{data.summary.avgSleep}시간</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Deep Analysis */}
          {data.deepAnalysis && (
            <Card className="mb-6 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  핵심 습관 심층 분석
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="font-semibold text-lg">{data.deepAnalysis.habitName}</p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="font-semibold mb-3 text-green-800 dark:text-green-200">✅ 성공한 날</p>
                    <div className="space-y-2 text-sm">
                      {data.deepAnalysis.successDayAvg.mood !== null && (
                        <p>평균 기분: <span className="font-semibold">{data.deepAnalysis.successDayAvg.mood.toFixed(1)}점</span></p>
                      )}
                      {data.deepAnalysis.successDayAvg.sleep !== null && (
                        <p>평균 수면: <span className="font-semibold">{data.deepAnalysis.successDayAvg.sleep.toFixed(1)}시간</span></p>
                      )}
                      {data.deepAnalysis.successDayAvg.coffee !== null && (
                        <p>평균 커피: <span className="font-semibold">{data.deepAnalysis.successDayAvg.coffee.toFixed(1)}잔</span></p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="font-semibold mb-3 text-red-800 dark:text-red-200">❌ 실패한 날</p>
                    <div className="space-y-2 text-sm">
                      {data.deepAnalysis.failureDayAvg.mood !== null && (
                        <p>평균 기분: <span className="font-semibold">{data.deepAnalysis.failureDayAvg.mood.toFixed(1)}점</span></p>
                      )}
                      {data.deepAnalysis.failureDayAvg.sleep !== null && (
                        <p>평균 수면: <span className="font-semibold">{data.deepAnalysis.failureDayAvg.sleep.toFixed(1)}시간</span></p>
                      )}
                      {data.deepAnalysis.failureDayAvg.coffee !== null && (
                        <p>평균 커피: <span className="font-semibold">{data.deepAnalysis.failureDayAvg.coffee.toFixed(1)}잔</span></p>
                      )}
                    </div>
                  </div>
                </div>

                {data.deepAnalysis.successDayAvg.mood !== null && 
                 data.deepAnalysis.failureDayAvg.mood !== null && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-base">
                      {data.deepAnalysis.habitName}을(를) 한 날의 평균 기분 점수는{" "}
                      <span className="font-bold text-primary">
                        {data.deepAnalysis.successDayAvg.mood.toFixed(1)}점
                      </span>
                      으로, 하지 않은 날(
                      <span className="font-semibold">
                        {data.deepAnalysis.failureDayAvg.mood.toFixed(1)}점
                      </span>
                      )보다 눈에 띄게{" "}
                      {data.deepAnalysis.successDayAvg.mood > data.deepAnalysis.failureDayAvg.mood
                        ? "높았어요"
                        : "낮았어요"}
                      .
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Interesting Finding */}
          {data.interestingFinding && (
            <Card className="shadow-card bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  💡 흥미로운 발견
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg">{data.interestingFinding.text}</p>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    );
  }

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
              주간 리포트
            </h1>
          </div>
          <Button
            onClick={() => handleGenerateReport(1)}
            disabled={generating}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            {generating ? "생성 중..." : "지난주 리포트 생성"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {loading ? (
          <p className="text-center text-muted-foreground">로딩 중...</p>
        ) : reports.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                아직 생성된 리포트가 없습니다.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                지난주 리포트를 생성하여 당신의 패턴을 발견해보세요!
              </p>
              <Button onClick={() => handleGenerateReport(1)} disabled={generating}>
                {generating ? "생성 중..." : "첫 리포트 생성하기"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              주차별 리포트를 클릭하여 상세 내용을 확인하세요.
            </p>
            {reports.map((report) => (
              <Card
                key={report.id}
                className="shadow-card cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedReport(report)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-lg">{report.report_data.weekLabel}</p>
                        <p className="text-sm text-muted-foreground font-normal">
                          {format(new Date(report.week_start), "M/d", { locale: ko })} -{" "}
                          {format(new Date(report.week_end), "M/d", { locale: ko })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {report.report_data.summary.streakHabit && (
                        <p className="text-sm">
                          성공률{" "}
                          <span className="text-primary font-semibold">
                            {report.report_data.summary.streakHabit.successRate}%
                          </span>
                        </p>
                      )}
                    </div>
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

export default Reports;
