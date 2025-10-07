import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, BarChart3, Calendar, Coffee } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        navigate("/today");
      }
    };
    checkUser();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="text-center max-w-3xl">
        <div className="flex items-center justify-center mb-6">
          <Sparkles className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-in">
          라이프 캔버스
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-8">인생의 한 페이지를 모아 당신만의 책으로</p>

        <div className="flex flex-wrap justify-center gap-6 mb-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-5 h-5 text-primary" />
            <span>일상 기록</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <BarChart3 className="w-5 h-5 text-accent" />
            <span>데이터 분석</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coffee className="w-5 h-5 text-primary" />
            <span>패턴 발견</span>
          </div>
        </div>

        <Button
          onClick={() => navigate("/auth")}
          size="lg"
          className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-elevated"
        >
          시작하기
        </Button>
      </div>
    </div>
  );
};

export default Index;
