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
import { Shield, Plus, Trash2, LogOut, Sparkles, Users, Target, TrendingUp } from "lucide-react";
import type { User } from "@supabase/supabase-js";

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

const Admin = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [insights, setInsights] = useState<CommunityInsight[]>([]);

  // Challenge form
  const [isAddChallengeOpen, setIsAddChallengeOpen] = useState(false);
  const [challengeName, setChallengeName] = useState("");
  const [challengeDesc, setChallengeDesc] = useState("");
  const [challengeType, setChallengeType] = useState("");
  const [challengeTarget, setChallengeTarget] = useState("");

  // Insight form
  const [isAddInsightOpen, setIsAddInsightOpen] = useState(false);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="challenges">챌린지 관리</TabsTrigger>
            <TabsTrigger value="insights">인사이트 관리</TabsTrigger>
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
                      <div>
                        <CardTitle className="text-lg">{challenge.name}</CardTitle>
                        <CardDescription className="mt-2">{challenge.description}</CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteChallenge(challenge.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>타입: {challenge.tracker_type}</p>
                      <p>목표: {challenge.target_value}</p>
                      <p>상태: {challenge.is_active ? "활성" : "비활성"}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

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
                      <div>
                        <CardTitle className="text-lg">{insight.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(insight.published_at).toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteInsight(insight.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-line">{insight.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

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
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
