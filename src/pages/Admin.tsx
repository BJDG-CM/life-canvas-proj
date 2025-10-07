import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Shield, LogOut, Search, LayoutDashboard, Users, FileCheck, Bell, ToggleLeft, MessageSquare, Edit, Plus, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { UserManagementTable } from "@/components/admin/UserManagementTable";
import { TemplateApprovalTable } from "@/components/admin/TemplateApprovalTable";
import { AnnouncementManager } from "@/components/admin/AnnouncementManager";
import { FeatureFlagManager } from "@/components/admin/FeatureFlagManager";
import { SupportTicketManager } from "@/components/admin/SupportTicketManager";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dashboard stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    totalLogs: 0,
    totalTemplates: 0,
    errorCount: 0,
  });

  // Data states
  const [usersWithEmail, setUsersWithEmail] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  // Challenge & Insight forms
  const [isAddChallengeOpen, setIsAddChallengeOpen] = useState(false);
  const [isEditChallengeOpen, setIsEditChallengeOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<any>(null);
  const [challengeName, setChallengeName] = useState("");
  const [challengeDesc, setChallengeDesc] = useState("");
  const [challengeType, setChallengeType] = useState("");
  const [challengeTarget, setChallengeTarget] = useState("");

  const [isAddInsightOpen, setIsAddInsightOpen] = useState(false);
  const [isEditInsightOpen, setIsEditInsightOpen] = useState(false);
  const [editingInsight, setEditingInsight] = useState<any>(null);
  const [insightTitle, setInsightTitle] = useState("");
  const [insightContent, setInsightContent] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error || !roles) {
        toast.error("관리자 권한이 없습니다");
        navigate("/today");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
      loadAllData();
    };

    checkAuth();
  }, [navigate]);

  const loadAllData = async () => {
    loadStats();
    loadUsers();
    loadProfiles();
    loadTemplates();
    loadAnnouncements();
    loadFeatureFlags();
    loadSupportTickets();
    loadChallenges();
    loadInsights();
  };

  const loadStats = async () => {
    // Load dashboard statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [usersRes, logsRes, templatesRes, errorsRes, profilesRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: 'exact', head: true }),
      supabase.from("daily_logs").select("id", { count: 'exact', head: true }),
      supabase.from("tracker_templates").select("id", { count: 'exact', head: true }),
      supabase.from("error_logs").select("id", { count: 'exact', head: true }).gte("created_at", today.toISOString()),
      supabase.from("profiles").select("id", { count: 'exact', head: true }).gte("last_active_at", today.toISOString()),
    ]);

    setStats({
      totalUsers: usersRes.count || 0,
      activeToday: profilesRes.count || 0,
      totalLogs: logsRes.count || 0,
      totalTemplates: templatesRes.count || 0,
      errorCount: errorsRes.count || 0,
    });
  };

  const loadUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/admin-get-users`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch users");

      const { users } = await response.json();
      setUsersWithEmail(users || []);
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadProfiles = async () => {
    const { data } = await supabase.from("profiles").select("*");
    setProfiles(data || []);
  };

  const loadTemplates = async () => {
    const { data } = await supabase.from("tracker_templates").select("*").order("created_at", { ascending: false });
    setTemplates(data || []);
  };

  const loadAnnouncements = async () => {
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setAnnouncements(data || []);
  };

  const loadFeatureFlags = async () => {
    const { data } = await supabase.from("feature_flags").select("*").order("name");
    setFeatureFlags(data || []);
  };

  const loadSupportTickets = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setSupportTickets(data || []);
  };

  const loadChallenges = async () => {
    const { data } = await supabase.from("challenges").select("*").order("created_at", { ascending: false });
    setChallenges(data || []);
  };

  const loadInsights = async () => {
    const { data } = await supabase.from("community_insights").select("*").order("published_at", { ascending: false });
    setInsights(data || []);
  };

  // Challenge management
  const handleAddChallenge = async () => {
    if (!challengeName || !challengeDesc || !challengeType || !challengeTarget) {
      toast.error("모든 필드를 입력해주세요");
      return;
    }

    const { error } = await supabase.from("challenges").insert({
      name: challengeName,
      description: challengeDesc,
      tracker_type: challengeType,
      target_value: parseFloat(challengeTarget),
      frequency: "daily"
    });

    if (error) {
      toast.error("챌린지 생성 실패");
      return;
    }

    toast.success("챌린지가 생성되었습니다!");
    setIsAddChallengeOpen(false);
    resetChallengeForm();
    loadChallenges();
  };

  const handleEditChallenge = (challenge: any) => {
    setEditingChallenge(challenge);
    setChallengeName(challenge.name);
    setChallengeDesc(challenge.description);
    setChallengeType(challenge.tracker_type);
    setChallengeTarget(challenge.target_value.toString());
    setIsEditChallengeOpen(true);
  };

  const handleUpdateChallenge = async () => {
    if (!editingChallenge) return;

    const { error } = await supabase.from("challenges").update({
      name: challengeName,
      description: challengeDesc,
      tracker_type: challengeType,
      target_value: parseFloat(challengeTarget),
    }).eq("id", editingChallenge.id);

    if (error) {
      toast.error("챌린지 수정 실패");
      return;
    }

    toast.success("챌린지가 수정되었습니다!");
    setIsEditChallengeOpen(false);
    setEditingChallenge(null);
    resetChallengeForm();
    loadChallenges();
  };

  const handleToggleChallengeActive = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase.from("challenges").update({ is_active: !currentStatus }).eq("id", id);
    if (error) {
      toast.error("상태 변경 실패");
      return;
    }
    toast.success(currentStatus ? "챌린지가 비활성화되었습니다" : "챌린지가 활성화되었습니다");
    loadChallenges();
  };

  const handleDeleteChallenge = async (id: number) => {
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) {
      toast.error("챌린지 삭제 실패");
      return;
    }
    toast.success("챌린지가 삭제되었습니다");
    loadChallenges();
  };

  const resetChallengeForm = () => {
    setChallengeName("");
    setChallengeDesc("");
    setChallengeType("");
    setChallengeTarget("");
  };

  // Insight management
  const handleAddInsight = async () => {
    if (!insightTitle || !insightContent) {
      toast.error("제목과 내용을 입력해주세요");
      return;
    }

    const { error } = await supabase.from("community_insights").insert({
      title: insightTitle,
      content: insightContent,
      insight_data: {}
    });

    if (error) {
      toast.error("인사이트 발행 실패");
      return;
    }

    toast.success("인사이트가 발행되었습니다!");
    setIsAddInsightOpen(false);
    resetInsightForm();
    loadInsights();
  };

  const handleEditInsight = (insight: any) => {
    setEditingInsight(insight);
    setInsightTitle(insight.title);
    setInsightContent(insight.content);
    setIsEditInsightOpen(true);
  };

  const handleUpdateInsight = async () => {
    if (!editingInsight) return;

    const { error } = await supabase.from("community_insights").update({
      title: insightTitle,
      content: insightContent,
    }).eq("id", editingInsight.id);

    if (error) {
      toast.error("인사이트 수정 실패");
      return;
    }

    toast.success("인사이트가 수정되었습니다!");
    setIsEditInsightOpen(false);
    setEditingInsight(null);
    resetInsightForm();
    loadInsights();
  };

  const handleDeleteInsight = async (id: number) => {
    const { error } = await supabase.from("community_insights").delete().eq("id", id);
    if (error) {
      toast.error("인사이트 삭제 실패");
      return;
    }
    toast.success("인사이트가 삭제되었습니다");
    loadInsights();
  };

  const resetInsightForm = () => {
    setInsightTitle("");
    setInsightContent("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const filteredUsers = usersWithEmail.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">권한 확인 중...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Command Center
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => navigate("/today")} variant="outline">
              앱으로 돌아가기
            </Button>
            <Button onClick={handleLogout} variant="ghost" size="icon">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="dashboard"><LayoutDashboard className="w-4 h-4 mr-2" />대시보드</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-2" />사용자</TabsTrigger>
            <TabsTrigger value="templates"><FileCheck className="w-4 h-4 mr-2" />템플릿</TabsTrigger>
            <TabsTrigger value="challenges"><ToggleLeft className="w-4 h-4 mr-2" />챌린지</TabsTrigger>
            <TabsTrigger value="insights"><Bell className="w-4 h-4 mr-2" />인사이트</TabsTrigger>
            <TabsTrigger value="platform"><Bell className="w-4 h-4 mr-2" />플랫폼</TabsTrigger>
            <TabsTrigger value="support"><MessageSquare className="w-4 h-4 mr-2" />고객지원</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">종합 현황판</h2>
              <p className="text-muted-foreground">라이프 캔버스 서비스의 실시간 상태를 모니터링합니다</p>
            </div>
            <DashboardStats {...stats} />
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">사용자 관리</h3>
                <p className="text-sm text-muted-foreground">총 {usersWithEmail.length}명의 사용자</p>
              </div>
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="이메일 또는 ID로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <UserManagementTable
                  users={filteredUsers}
                  profiles={profiles}
                  onUserDeleted={loadUsers}
                  onUserUpdated={() => {
                    loadUsers();
                    loadProfiles();
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Template Approval */}
          <TabsContent value="templates" className="space-y-4">
            <TemplateApprovalTable
              templates={templates}
              onTemplateUpdated={loadTemplates}
            />
          </TabsContent>

          {/* Challenge Management */}
          <TabsContent value="challenges" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">커뮤니티 챌린지</h3>
                <p className="text-sm text-muted-foreground">사용자들이 참여할 챌린지를 생성하고 관리하세요</p>
              </div>
              <Dialog open={isAddChallengeOpen} onOpenChange={setIsAddChallengeOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />챌린지 추가</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 챌린지 만들기</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>챌린지 이름</Label>
                      <Input
                        placeholder="예: 매일 1만 보 걷기"
                        value={challengeName}
                        onChange={(e) => setChallengeName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>설명</Label>
                      <Textarea
                        placeholder="챌린지에 대한 설명을 입력하세요"
                        value={challengeDesc}
                        onChange={(e) => setChallengeDesc(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>트래커 타입</Label>
                      <Input
                        placeholder="예: steps, exercise, meditation"
                        value={challengeType}
                        onChange={(e) => setChallengeType(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>목표값</Label>
                      <Input
                        type="number"
                        placeholder="10000"
                        value={challengeTarget}
                        onChange={(e) => setChallengeTarget(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAddChallenge} className="w-full">
                      챌린지 생성
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {challenges.map((challenge) => (
                <Card key={challenge.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{challenge.name}</h3>
                          {challenge.is_active && <Badge className="bg-green-500">활성</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{challenge.description}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditChallenge(challenge)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteChallenge(challenge.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">타입: {challenge.tracker_type}</span>
                        <span className="text-muted-foreground">목표: {challenge.target_value}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm">활성 상태</span>
                        <Switch
                          checked={challenge.is_active}
                          onCheckedChange={() => handleToggleChallengeActive(challenge.id, challenge.is_active)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Dialog open={isEditChallengeOpen} onOpenChange={setIsEditChallengeOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>챌린지 수정</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>챌린지 이름</Label>
                    <Input value={challengeName} onChange={(e) => setChallengeName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>설명</Label>
                    <Textarea value={challengeDesc} onChange={(e) => setChallengeDesc(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>트래커 타입</Label>
                    <Input value={challengeType} onChange={(e) => setChallengeType(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>목표값</Label>
                    <Input type="number" value={challengeTarget} onChange={(e) => setChallengeTarget(e.target.value)} />
                  </div>
                  <Button onClick={handleUpdateChallenge} className="w-full">수정 완료</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Insight Management */}
          <TabsContent value="insights" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">커뮤니티 인사이트</h3>
                <p className="text-sm text-muted-foreground">데이터 기반 인사이트를 커뮤니티에 공유하세요</p>
              </div>
              <Dialog open={isAddInsightOpen} onOpenChange={setIsAddInsightOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />인사이트 발행</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>새 인사이트 발행</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>제목</Label>
                      <Input
                        placeholder="예: 라이프 캔버스 사용자들의 수면 패턴"
                        value={insightTitle}
                        onChange={(e) => setInsightTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>내용</Label>
                      <Textarea
                        placeholder="인사이트 내용을 입력하세요"
                        rows={6}
                        value={insightContent}
                        onChange={(e) => setInsightContent(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleAddInsight} className="w-full">발행하기</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {insights.map((insight) => (
                <Card key={insight.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{insight.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(insight.published_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditInsight(insight)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteInsight(insight.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground whitespace-pre-line">{insight.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Dialog open={isEditInsightOpen} onOpenChange={setIsEditInsightOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>인사이트 수정</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>제목</Label>
                    <Input value={insightTitle} onChange={(e) => setInsightTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>내용</Label>
                    <Textarea value={insightContent} rows={6} onChange={(e) => setInsightContent(e.target.value)} />
                  </div>
                  <Button onClick={handleUpdateInsight} className="w-full">수정 완료</Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Platform Operations */}
          <TabsContent value="platform" className="space-y-6">
            <AnnouncementManager announcements={announcements} onAnnouncementUpdated={loadAnnouncements} />
            <FeatureFlagManager flags={featureFlags} onFlagUpdated={loadFeatureFlags} />
          </TabsContent>

          {/* Customer Support */}
          <TabsContent value="support" className="space-y-4">
            <SupportTicketManager tickets={supportTickets} onTicketUpdated={loadSupportTickets} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
