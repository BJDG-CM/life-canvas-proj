import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings as SettingsIcon, Download, Link2, LogOut, Sparkles, CalendarIcon, ListTodo, Store, FileText, BarChart3, Target } from "lucide-react";
import { format } from "date-fns";
import type { User } from "@supabase/supabase-js";

interface ServiceIntegration {
  service_name: string;
  is_active: boolean;
}

const Settings = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [integrations, setIntegrations] = useState<Record<string, boolean>>({
    "Google Calendar": false,
    "Apple Health": false,
    "Google Fit": false
  });
  const [exporting, setExporting] = useState(false);

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
      loadIntegrations();
    }
  }, [user]);

  const loadIntegrations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("service_integrations")
      .select("service_name, is_active")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error loading integrations:", error);
      return;
    }

    if (data) {
      const integrationsMap: Record<string, boolean> = { ...integrations };
      data.forEach((item: ServiceIntegration) => {
        integrationsMap[item.service_name] = item.is_active;
      });
      setIntegrations(integrationsMap);
    }
  };

  const toggleIntegration = async (serviceName: string, isActive: boolean) => {
    if (!user) return;

    // For now, just update the database. Actual OAuth flow would be implemented later
    const { error } = await supabase
      .from("service_integrations")
      .upsert({
        user_id: user.id,
        service_name: serviceName,
        is_active: isActive
      }, {
        onConflict: "user_id,service_name"
      });

    if (error) {
      toast.error("연동 설정 실패: " + error.message);
      return;
    }

    setIntegrations(prev => ({
      ...prev,
      [serviceName]: isActive
    }));

    toast.success(isActive ? `${serviceName} 연동이 활성화되었습니다` : `${serviceName} 연동이 비활성화되었습니다`);
  };

  const handleExportData = async () => {
    if (!user) return;

    setExporting(true);

    try {
      // Fetch all daily logs
      const { data: dailyLogs, error: dailyError } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("log_date", { ascending: true });

      if (dailyError) throw dailyError;

      // Fetch all custom logs
      const { data: customLogs, error: customError } = await supabase
        .from("custom_logs")
        .select(`
          *,
          daily_logs!inner(log_date),
          trackers!inner(name)
        `)
        .eq("daily_logs.user_id", user.id);

      if (customError) throw customError;

      // Create CSV content
      let csvContent = "날짜,기분 점수,수면 시간,운동 여부,커피 잔수,메모\n";
      
      dailyLogs?.forEach(log => {
        const row = [
          log.log_date,
          log.mood_score ?? "",
          log.sleep_hours ?? "",
          log.exercised ? "예" : "아니오",
          log.coffee_cups,
          `"${(log.memo || "").replace(/"/g, '""')}"` // Escape quotes in memo
        ];
        csvContent += row.join(",") + "\n";
      });

      // Add custom logs section
      if (customLogs && customLogs.length > 0) {
        csvContent += "\n커스텀 트래커 기록\n";
        csvContent += "날짜,트래커명,값\n";
        
        customLogs.forEach(log => {
          const row = [
            (log as any).daily_logs.log_date,
            (log as any).trackers.name,
            log.value
          ];
          csvContent += row.join(",") + "\n";
        });
      }

      // Create and download file with BOM for proper UTF-8 encoding
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `라이프캔버스_데이터_${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("데이터가 성공적으로 내보내졌습니다!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("데이터 내보내기 실패");
    } finally {
      setExporting(false);
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold">설정</h2>
        </div>

        <Tabs defaultValue="export" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">데이터 관리</TabsTrigger>
            <TabsTrigger value="integrations">외부 연동</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-primary" />
                  데이터 내보내기
                </CardTitle>
                <CardDescription>
                  모든 기록을 CSV 파일로 다운로드할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleExportData}
                  disabled={exporting}
                  className="w-full bg-gradient-to-r from-primary to-accent"
                >
                  {exporting ? "내보내는 중..." : "전체 데이터 내보내기"}
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  내보내진 파일에는 일일 로그, 커스텀 트래커 기록 등이 포함됩니다.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-primary" />
                  외부 서비스 연동
                </CardTitle>
                <CardDescription>
                  다른 서비스와 연동하여 데이터를 자동으로 동기화할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(integrations).map(([serviceName, isActive]) => (
                  <div key={serviceName} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <Label className="text-base font-semibold">{serviceName}</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {serviceName === "Google Calendar" && "일정을 자동으로 기록에 반영"}
                        {serviceName === "Apple Health" && "건강 데이터 자동 동기화"}
                        {serviceName === "Google Fit" && "운동 기록 자동 동기화"}
                      </p>
                    </div>
                    <Switch
                      checked={isActive}
                      onCheckedChange={(checked) => toggleIntegration(serviceName, checked)}
                    />
                  </div>
                ))}
                <p className="text-sm text-muted-foreground mt-4">
                  * 실제 OAuth 연동은 추후 업데이트될 예정입니다
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
