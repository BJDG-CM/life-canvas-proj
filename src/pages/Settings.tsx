import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Settings as SettingsIcon, Download, Link2, LogOut, Sparkles, CalendarIcon, ListTodo, Store, FileText, BarChart3, Target, MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";
import type { User } from "@supabase/supabase-js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ServiceIntegration {
  service_name: string;
  is_active: boolean;
}

interface SupportTicket {
  id: number;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_response: string | null;
  created_at: string;
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
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

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
      loadTickets();
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

  const loadTickets = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading tickets:", error);
      return;
    }

    setTickets(data || []);
  };

  const handleSubmitTicket = async () => {
    if (!user || !subject || !message) {
      toast.error("제목과 내용을 모두 입력해주세요");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject,
        message,
        priority,
      });

    if (error) {
      toast.error("문의 전송 실패");
      console.error(error);
    } else {
      toast.success("문의가 전송되었습니다. 빠른 시일 내에 답변 드리겠습니다.");
      setSubject("");
      setMessage("");
      setPriority("medium");
      loadTickets();
    }

    setSubmitting(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
      open: { label: "대기중", variant: "outline" },
      in_progress: { label: "처리중", variant: "secondary" },
      resolved: { label: "해결됨", variant: "default" },
      closed: { label: "종료", variant: "outline" },
    };
    return variants[status] || variants.open;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { label: string; class: string }> = {
      low: { label: "낮음", class: "bg-gray-100 text-gray-800" },
      medium: { label: "보통", class: "bg-blue-100 text-blue-800" },
      high: { label: "높음", class: "bg-orange-100 text-orange-800" },
      urgent: { label: "긴급", class: "bg-red-100 text-red-800" },
    };
    return variants[priority] || variants.medium;
  };

  const toggleIntegration = async (serviceName: string, isActive: boolean) => {
    if (!user) return;

    // Use secure function that handles token encryption
    const { error } = await supabase
      .rpc("insert_service_integration", {
        p_user_id: user.id,
        p_service_name: serviceName,
        p_is_active: isActive,
        p_access_token: null // OAuth tokens will be added when OAuth flow is implemented
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export">데이터 관리</TabsTrigger>
            <TabsTrigger value="integrations">외부 연동</TabsTrigger>
            <TabsTrigger value="support">고객 지원</TabsTrigger>
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

          <TabsContent value="support" className="space-y-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  문의하기
                </CardTitle>
                <CardDescription>
                  궁금하신 점이나 문제가 있으시면 언제든지 문의해주세요
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>제목</Label>
                  <Input
                    placeholder="문의 제목을 입력하세요"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>우선순위</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">낮음</SelectItem>
                      <SelectItem value="medium">보통</SelectItem>
                      <SelectItem value="high">높음</SelectItem>
                      <SelectItem value="urgent">긴급</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>문의 내용</Label>
                  <Textarea
                    placeholder="문의 내용을 자세히 작성해주세요"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={6}
                  />
                </div>
                <Button
                  onClick={handleSubmitTicket}
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-primary to-accent"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? "전송 중..." : "문의 전송"}
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>나의 문의 내역</CardTitle>
                <CardDescription>
                  이전에 작성한 문의 내역과 답변을 확인할 수 있습니다
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tickets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    아직 작성한 문의가 없습니다
                  </p>
                ) : (
                  tickets.map((ticket) => (
                    <Card key={ticket.id} className="border">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle className="text-base">{ticket.subject}</CardTitle>
                              <Badge variant={getStatusBadge(ticket.status).variant}>
                                {getStatusBadge(ticket.status).label}
                              </Badge>
                              <Badge className={getPriorityBadge(ticket.priority).class}>
                                {getPriorityBadge(ticket.priority).label}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(ticket.created_at).toLocaleString("ko-KR")}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-sm font-medium mb-1">문의 내용:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-line">
                            {ticket.message}
                          </p>
                        </div>
                        {ticket.admin_response && (
                          <div className="border-t pt-4">
                            <p className="text-sm font-medium mb-1 text-primary">관리자 답변:</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                              {ticket.admin_response}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
