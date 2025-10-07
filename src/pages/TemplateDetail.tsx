import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Download, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { User } from "@supabase/supabase-js";

interface Template {
  id: number;
  creator_id: string;
  name: string;
  description: string;
  category: string;
  clone_count: number;
  created_at: string;
}

interface TemplateItem {
  id: number;
  template_id: number;
  item_name: string;
  item_type: "boolean" | "number" | "scale";
}

const TemplateDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(false);

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
    if (user && id) {
      loadTemplate();
    }
  }, [user, id]);

  const loadTemplate = async () => {
    if (!id) return;

    setLoading(true);

    // Load template
    const { data: templateData, error: templateError } = await supabase
      .from("tracker_templates")
      .select("*")
      .eq("id", parseInt(id))
      .single();

    if (templateError) {
      console.error("Error loading template:", templateError);
      toast.error("템플릿을 불러올 수 없습니다");
      navigate("/market");
      return;
    }

    setTemplate(templateData as unknown as Template);

    // Load template items
    const { data: itemsData, error: itemsError } = await supabase
      .from("template_items")
      .select("*")
      .eq("template_id", parseInt(id));

    if (itemsError) {
      console.error("Error loading items:", itemsError);
    } else {
      setItems((itemsData || []) as unknown as TemplateItem[]);
    }

    setLoading(false);
  };

  const handleClone = async () => {
    if (!user || !template) return;

    setCloning(true);

    try {
      // Create trackers from template items
      const trackersToInsert = items.map((item) => ({
        user_id: user.id,
        name: item.item_name,
        type: item.item_type,
      }));

      const { error: insertError } = await supabase
        .from("trackers")
        .insert(trackersToInsert);

      if (insertError) {
        toast.error("트래커 추가 실패: " + insertError.message);
        setCloning(false);
        return;
      }

      // Increment clone count
      const { error: updateError } = await supabase
        .from("tracker_templates")
        .update({ clone_count: template.clone_count + 1 })
        .eq("id", template.id);

      if (updateError) {
        console.error("Error updating clone count:", updateError);
      }

      toast.success("템플릿이 내 캔버스에 추가되었습니다!");
      navigate("/trackers");
    } catch (error) {
      console.error("Error cloning template:", error);
      toast.error("템플릿 추가 중 오류가 발생했습니다");
    }

    setCloning(false);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "boolean": return "참/거짓";
      case "number": return "숫자";
      case "scale": return "척도";
      default: return type;
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "건강": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      "생산성": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      "취미": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      "학습": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      "기타": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    };
    return colors[category] || colors["기타"];
  };

  if (loading || !template) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            onClick={() => navigate("/market")}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleClone}
            disabled={cloning}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent"
          >
            <Download className="w-4 h-4" />
            {cloning ? "추가 중..." : "내 캔버스에 추가하기"}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Template Header */}
        <Card className="mb-6 shadow-card">
          <CardHeader>
            <div className="flex items-start justify-between mb-4">
              <Badge className={getCategoryColor(template.category)}>
                {template.category}
              </Badge>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{template.clone_count}명이 사용 중</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(template.created_at), "yyyy년 M월 d일", {
                      locale: ko,
                    })}
                  </span>
                </div>
              </div>
            </div>
            <CardTitle className="text-3xl mb-4">{template.name}</CardTitle>
            <p className="text-base text-muted-foreground">
              {template.description}
            </p>
          </CardHeader>
        </Card>

        {/* Template Items */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">포함된 트래커 ({items.length}개)</h2>
          <div className="grid gap-3">
            {items.map((item, index) => (
              <Card key={item.id} className="shadow-card">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{item.item_name}</p>
                        <p className="text-sm text-muted-foreground">
                          타입: {getTypeLabel(item.item_type)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Clone Button (Bottom) */}
        <Button
          onClick={handleClone}
          disabled={cloning}
          className="w-full py-6 text-lg bg-gradient-to-r from-primary to-accent"
        >
          <Download className="w-5 h-5 mr-2" />
          {cloning ? "추가 중..." : "내 캔버스에 추가하기"}
        </Button>
      </main>
    </div>
  );
};

export default TemplateDetail;
