import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Shield, Plus, Trash2, LogOut, Users, Target, TrendingUp, Image as ImageIcon, FileText, Edit, UserX, Search, ToggleLeft, ToggleRight } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Challenge {
  id: number;
  name: string;
  description: string;
  tracker_type: string;
  target_value: number;
  frequency: string;
  is_active: boolean;
}

interface CommunityInsight {
  id: number;
  title: string;
  content: string;
  insight_data: any;
  published_at: string;
}

interface Profile {
  id: string;
  created_at: string;
}

interface DailyLog {
  id: number;
  user_id: string;
  log_date: string;
  photo_url: string | null;
  created_at: string;
}

interface UserWithEmail {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [insights, setInsights] = useState<CommunityInsight[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [photos, setPhotos] = useState<DailyLog[]>([]);
  const [usersWithEmail, setUsersWithEmail] = useState<UserWithEmail[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Challenge form
  const [isAddChallengeOpen, setIsAddChallengeOpen] = useState(false);
  const [isEditChallengeOpen, setIsEditChallengeOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [challengeName, setChallengeName] = useState("");
  const [challengeDesc, setChallengeDesc] = useState("");
  const [challengeType, setChallengeType] = useState("");
  const [challengeTarget, setChallengeTarget] = useState("");

  // Insight form
  const [isAddInsightOpen, setIsAddInsightOpen] = useState(false);
  const [isEditInsightOpen, setIsEditInsightOpen] = useState(false);
  const [editingInsight, setEditingInsight] = useState<CommunityInsight | null>(null);
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

      // Check if user is admin
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        console.error("Error checking admin role:", error);
        toast.error("권한 확인 실패");
        navigate("/today");
        return;
      }

      if (!roles) {
        toast.error("관리자 권한이 없습니다");
        navigate("/today");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
      loadChallenges();
      loadInsights();
      loadProfiles();
      loadPhotos();
      loadUsersWithEmail();
    };

    checkAuth();
  }, [navigate]);

  const loadChallenges = async () => {
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading challenges:", error);
      return;
    }

    setChallenges(data || []);
  };

  const loadInsights = async () => {
    const { data, error } = await supabase
      .from("community_insights")
      .select("*")
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Error loading insights:", error);
      return;
    }

    setInsights(data || []);
  };

  const handleAddChallenge = async () => {
    if (!challengeName || !challengeDesc || !challengeType || !challengeTarget) {
      toast.error("모든 필드를 입력해주세요");
      return;
    }

    const { error } = await supabase
      .from("challenges")
      .insert({
        name: challengeName,
        description: challengeDesc,
        tracker_type: challengeType,
        target_value: parseFloat(challengeTarget),
        frequency: "daily"
      });

    if (error) {
      toast.error("챌린지 생성 실패: " + error.message);
      return;
    }

    toast.success("챌린지가 생성되었습니다!");
    setIsAddChallengeOpen(false);
    setChallengeName("");
    setChallengeDesc("");
    setChallengeType("");
    setChallengeTarget("");
    loadChallenges();
  };

  const handleDeleteChallenge = async (id: number) => {
    const { error } = await supabase
      .from("challenges")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("챌린지 삭제 실패: " + error.message);
      return;
    }

    toast.success("챌린지가 삭제되었습니다");
    loadChallenges();
  };

  const handleAddInsight = async () => {
    if (!insightTitle || !insightContent) {
      toast.error("제목과 내용을 입력해주세요");
      return;
    }

    const { error } = await supabase
      .from("community_insights")
      .insert({
        title: insightTitle,
        content: insightContent,
        insight_data: {}
      });

    if (error) {
      toast.error("인사이트 발행 실패: " + error.message);
      return;
    }

    toast.success("인사이트가 발행되었습니다!");
    setIsAddInsightOpen(false);
    setInsightTitle("");
    setInsightContent("");
    loadInsights();
  };

  const handleDeleteInsight = async (id: number) => {
    const { error } = await supabase
      .from("community_insights")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("인사이트 삭제 실패: " + error.message);
      return;
    }

    toast.success("인사이트가 삭제되었습니다");
    loadInsights();
  };

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading profiles:", error);
      return;
    }

    setProfiles(data || []);
  };

  const loadPhotos = async () => {
    const { data, error } = await supabase
      .from("daily_logs")
      .select("id, user_id, log_date, photo_url, created_at")
      .not("photo_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error loading photos:", error);
      return;
    }

    setPhotos(data || []);
  };

  const loadUsersWithEmail = async () => {
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

  const handleEditChallenge = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setChallengeName(challenge.name);
    setChallengeDesc(challenge.description);
    setChallengeType(challenge.tracker_type);
    setChallengeTarget(challenge.target_value.toString());
    setIsEditChallengeOpen(true);
  };

  const handleUpdateChallenge = async () => {
    if (!editingChallenge) return;

    const { error } = await supabase
      .from("challenges")
      .update({
        name: challengeName,
        description: challengeDesc,
        tracker_type: challengeType,
        target_value: parseFloat(challengeTarget),
      })
      .eq("id", editingChallenge.id);

    if (error) {
      toast.error("챌린지 수정 실패: " + error.message);
      return;
    }

    toast.success("챌린지가 수정되었습니다!");
    setIsEditChallengeOpen(false);
    setEditingChallenge(null);
    setChallengeName("");
    setChallengeDesc("");
    setChallengeType("");
    setChallengeTarget("");
    loadChallenges();
  };

  const handleToggleChallengeActive = async (id: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from("challenges")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("상태 변경 실패: " + error.message);
      return;
    }

    toast.success(currentStatus ? "챌린지가 비활성화되었습니다" : "챌린지가 활성화되었습니다");
    loadChallenges();
  };

  const handleEditInsight = (insight: CommunityInsight) => {
    setEditingInsight(insight);
    setInsightTitle(insight.title);
    setInsightContent(insight.content);
    setIsEditInsightOpen(true);
  };

  const handleUpdateInsight = async () => {
    if (!editingInsight) return;

    const { error } = await supabase
      .from("community_insights")
      .update({
        title: insightTitle,
        content: insightContent,
      })
      .eq("id", editingInsight.id);

    if (error) {
      toast.error("인사이트 수정 실패: " + error.message);
      return;
    }

    toast.success("인사이트가 수정되었습니다!");
    setIsEditInsightOpen(false);
    setEditingInsight(null);
    setInsightTitle("");
    setInsightContent("");
    loadInsights();
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/admin-delete-user`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: deleteUserId }),
        }
      );

      if (!response.ok) throw new Error("Failed to delete user");

      toast.success("사용자가 삭제되었습니다");
      setDeleteUserId(null);
      loadUsersWithEmail();
    } catch (error) {
      toast.error("사용자 삭제 실패");
      console.error(error);
    }
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
              관리자 대시보드
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

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">환영합니다, 관리자님</h2>
          <p className="text-muted-foreground">라이프 캔버스 커뮤니티를 관리하세요</p>
        </div>

        <Tabs defaultValue="challenges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="challenges">챌린지</TabsTrigger>
            <TabsTrigger value="insights">인사이트</TabsTrigger>
            <TabsTrigger value="members">멤버</TabsTrigger>
            <TabsTrigger value="files">파일</TabsTrigger>
          </TabsList>

          <TabsContent value="challenges" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">커뮤니티 챌린지</h3>
                <p className="text-sm text-muted-foreground">사용자들이 참여할 챌린지를 생성하고 관리하세요</p>
              </div>
              <Dialog open={isAddChallengeOpen} onOpenChange={setIsAddChallengeOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    챌린지 추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="z-50 bg-card">
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
                <Card key={challenge.id} className="shadow-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle className="text-lg">{challenge.name}</CardTitle>
                          <div className="flex items-center gap-1">
                            {challenge.is_active ? (
                              <ToggleRight className="w-5 h-5 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <CardDescription className="mt-2">{challenge.description}</CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditChallenge(challenge)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteChallenge(challenge.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
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
              <DialogContent className="z-50 bg-card">
                <DialogHeader>
                  <DialogTitle>챌린지 수정</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>챌린지 이름</Label>
                    <Input
                      value={challengeName}
                      onChange={(e) => setChallengeName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>설명</Label>
                    <Textarea
                      value={challengeDesc}
                      onChange={(e) => setChallengeDesc(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>트래커 타입</Label>
                    <Input
                      value={challengeType}
                      onChange={(e) => setChallengeType(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>목표값</Label>
                    <Input
                      type="number"
                      value={challengeTarget}
                      onChange={(e) => setChallengeTarget(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleUpdateChallenge} className="w-full">
                    수정 완료
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {challenges.length === 0 && (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">생성된 챌린지가 없습니다</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    첫 번째 챌린지를 만들어보세요
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">커뮤니티 인사이트</h3>
                <p className="text-sm text-muted-foreground">데이터 기반 인사이트를 커뮤니티에 공유하세요</p>
              </div>
              <Dialog open={isAddInsightOpen} onOpenChange={setIsAddInsightOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    인사이트 발행
                  </Button>
                </DialogTrigger>
                <DialogContent className="z-50 bg-card">
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
                    <Button onClick={handleAddInsight} className="w-full">
                      발행하기
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
              {insights.map((insight) => (
                <Card key={insight.id} className="shadow-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(insight.published_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditInsight(insight)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteInsight(insight.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-line">{insight.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Dialog open={isEditInsightOpen} onOpenChange={setIsEditInsightOpen}>
              <DialogContent className="z-50 bg-card">
                <DialogHeader>
                  <DialogTitle>인사이트 수정</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>제목</Label>
                    <Input
                      value={insightTitle}
                      onChange={(e) => setInsightTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>내용</Label>
                    <Textarea
                      value={insightContent}
                      rows={6}
                      onChange={(e) => setInsightContent(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleUpdateInsight} className="w-full">
                    수정 완료
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {insights.length === 0 && (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">발행된 인사이트가 없습니다</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    첫 번째 인사이트를 발행해보세요
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">회원 관리</h3>
                <p className="text-sm text-muted-foreground">등록된 회원 정보를 확인하고 관리하세요</p>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <p className="font-semibold">총 회원 수: {usersWithEmail.length}명</p>
              </div>
            </div>

            <Card className="shadow-card">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="이메일 또는 ID로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>이메일</TableHead>
                        <TableHead>가입일</TableHead>
                        <TableHead>마지막 로그인</TableHead>
                        <TableHead className="text-right">작업</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.email}</p>
                              <p className="text-xs text-muted-foreground font-mono">{user.id.slice(0, 8)}...</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(user.created_at).toLocaleDateString("ko-KR", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            {user.last_sign_in_at
                              ? new Date(user.last_sign_in_at).toLocaleDateString("ko-KR", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "없음"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteUserId(user.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <UserX className="w-4 h-4 mr-1" />
                              강퇴
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredUsers.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                    {searchTerm ? "검색 결과가 없습니다" : "등록된 회원이 없습니다"}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>사용자 강퇴</AlertDialogTitle>
                <AlertDialogDescription>
                  정말로 이 사용자를 삭제하시겠습니까? 이 작업은 되돌릴 수 없으며, 사용자의 모든 데이터가 삭제됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  삭제
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <TabsContent value="files" className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold">업로드된 파일</h3>
              <p className="text-sm text-muted-foreground">사용자들이 업로드한 사진을 확인하세요</p>
            </div>

            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  <p className="font-semibold">총 사진 수: {photos.length}개</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="space-y-2">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                          src={photo.photo_url || ""}
                          alt={`Photo from ${photo.log_date}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p className="truncate">날짜: {photo.log_date}</p>
                        <p className="truncate font-mono">사용자: {photo.user_id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  ))}
                </div>
                {photos.length === 0 && (
                  <div className="py-12 text-center">
                    <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg text-muted-foreground">업로드된 사진이 없습니다</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
