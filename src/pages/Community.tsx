import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Users, TrendingUp, Calendar as CalendarIcon, LogOut, Sparkles, ListTodo, Store, FileText, BarChart3, Target, Settings as SettingsIcon } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { User } from "@supabase/supabase-js";

interface Challenge {
  id: number;
  name: string;
  description: string;
  tracker_type: string;
  target_value: number;
  frequency: string;
  created_at: string;
}

interface ChallengeStats {
  totalParticipants: number;
  todaySuccessRate: number;
}

interface CommunityInsight {
  id: number;
  title: string;
  content: string;
  published_at: string;
  insight_data: any;
}

const Community = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [myChallenges, setMyChallenges] = useState<number[]>([]);
  const [challengeStats, setChallengeStats] = useState<Record<number, ChallengeStats>>({});
  const [insights, setInsights] = useState<CommunityInsight[]>([]);

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
      loadChallenges();
      loadMyChallenges();
      loadInsights();
    }
  }, [user]);

  const loadChallenges = async () => {
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading challenges:", error);
      return;
    }

    setChallenges(data || []);

    // Load stats for each challenge
    if (data) {
      for (const challenge of data) {
        await loadChallengeStats(challenge.id);
      }
    }
  };

  const loadMyChallenges = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("challenge_participants")
      .select("challenge_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("Error loading my challenges:", error);
      return;
    }

    setMyChallenges(data?.map(p => p.challenge_id) || []);
  };

  const loadChallengeStats = async (challengeId: number) => {
    // Get total participants
    const { count: totalCount } = await supabase
      .from("challenge_participants")
      .select("*", { count: "exact", head: true })
      .eq("challenge_id", challengeId);

    // For demo purposes, generate random success rate
    const todaySuccessRate = Math.floor(Math.random() * 40) + 60; // 60-100%

    setChallengeStats(prev => ({
      ...prev,
      [challengeId]: {
        totalParticipants: totalCount || 0,
        todaySuccessRate
      }
    }));
  };

  const loadInsights = async () => {
    const { data, error } = await supabase
      .from("community_insights")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error loading insights:", error);
      return;
    }

    setInsights(data || []);
  };

  const handleJoinChallenge = async (challengeId: number) => {
    if (!user) return;

    const { error } = await supabase
      .from("challenge_participants")
      .insert({
        challenge_id: challengeId,
        user_id: user.id
      });

    if (error) {
      toast.error("챌린지 참여 실패: " + error.message);
      return;
    }

    toast.success("챌린지에 참여했습니다!");
    loadMyChallenges();
    loadChallengeStats(challengeId);
  };

  const handleLeaveChallenge = async (challengeId: number) => {
    if (!user) return;

    const { error } = await supabase
      .from("challenge_participants")
      .delete()
      .eq("challenge_id", challengeId)
      .eq("user_id", user.id);

    if (error) {
      toast.error("챌린지 탈퇴 실패: " + error.message);
      return;
    }

    toast.success("챌린지에서 탈퇴했습니다");
    loadMyChallenges();
    loadChallengeStats(challengeId);
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
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-8 h-8 text-primary" />
          <h2 className="text-3xl font-bold">커뮤니티</h2>
        </div>

        <Tabs defaultValue="challenges" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="challenges">인기 챌린지</TabsTrigger>
            <TabsTrigger value="my-challenges">내 챌린지</TabsTrigger>
            <TabsTrigger value="insights">인사이트</TabsTrigger>
          </TabsList>

          <TabsContent value="challenges" className="space-y-4">
            {challenges.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">
                    아직 진행 중인 챌린지가 없습니다
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {challenges.map((challenge) => {
                  const stats = challengeStats[challenge.id];
                  const isJoined = myChallenges.includes(challenge.id);

                  return (
                    <Card key={challenge.id} className="shadow-card">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">{challenge.name}</CardTitle>
                            <CardDescription>{challenge.description}</CardDescription>
                          </div>
                          {isJoined && (
                            <Badge className="bg-primary">참여중</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {stats && (
                          <>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">참여자</span>
                              <span className="font-semibold">{stats.totalParticipants}명</span>
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-muted-foreground">오늘 성공률</span>
                                <span className="font-semibold">{stats.todaySuccessRate}%</span>
                              </div>
                              <Progress value={stats.todaySuccessRate} className="h-2" />
                            </div>
                          </>
                        )}
                        <Button
                          className="w-full"
                          variant={isJoined ? "outline" : "default"}
                          onClick={() => isJoined ? handleLeaveChallenge(challenge.id) : handleJoinChallenge(challenge.id)}
                        >
                          {isJoined ? "챌린지 탈퇴" : "챌린지 참여하기"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-challenges" className="space-y-4">
            {myChallenges.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground mb-4">
                    참여 중인 챌린지가 없습니다
                  </p>
                  <p className="text-sm text-muted-foreground">
                    '인기 챌린지' 탭에서 새로운 챌린지에 참여해보세요
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {challenges
                  .filter(c => myChallenges.includes(c.id))
                  .map((challenge) => {
                    const stats = challengeStats[challenge.id];

                    return (
                      <Card key={challenge.id} className="shadow-card">
                        <CardHeader>
                          <CardTitle className="text-xl flex items-center justify-between">
                            {challenge.name}
                            <Badge className="bg-primary">참여중</Badge>
                          </CardTitle>
                          <CardDescription>{challenge.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {stats && (
                            <>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">함께하는 사람들</span>
                                <span className="font-semibold">{stats.totalParticipants}명</span>
                              </div>
                              <div>
                                <div className="flex items-center justify-between text-sm mb-2">
                                  <span className="text-muted-foreground">오늘 그룹 성공률</span>
                                  <span className="font-semibold">{stats.todaySuccessRate}%</span>
                                </div>
                                <Progress value={stats.todaySuccessRate} className="h-2" />
                              </div>
                            </>
                          )}
                          <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => handleLeaveChallenge(challenge.id)}
                          >
                            챌린지 탈퇴
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            {insights.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg text-muted-foreground">
                    아직 공개된 인사이트가 없습니다
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    매월 초, 커뮤니티 전체 데이터를 분석한 인사이트가 발행됩니다
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {insights.map((insight) => (
                  <Card key={insight.id} className="shadow-card">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-xl">{insight.title}</CardTitle>
                        <Badge variant="outline">
                          {format(new Date(insight.published_at), "yyyy년 M월 d일", { locale: ko })}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-line">
                        {insight.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Community;
