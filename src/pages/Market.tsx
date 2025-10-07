import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Store, Search, TrendingUp, Clock, Users } from "lucide-react";
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

const CATEGORIES = ["전체", "건강", "생산성", "취미", "학습", "기타"];

const Market = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortBy, setSortBy] = useState<"popular" | "recent">("popular");
  const [loading, setLoading] = useState(false);

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
      loadTemplates();
    }
  }, [user, sortBy]);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedCategory]);

  const loadTemplates = async () => {
    setLoading(true);
    const orderBy = sortBy === "popular" 
      ? { column: "clone_count" as const, ascending: false }
      : { column: "created_at" as const, ascending: false };

    const { data, error } = await supabase
      .from("tracker_templates")
      .select("*")
      .order(orderBy.column, { ascending: orderBy.ascending });

    if (error) {
      console.error("Error loading templates:", error);
      toast.error("템플릿 로드 실패");
    } else {
      setTemplates((data || []) as unknown as Template[]);
    }

    setLoading(false);
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (selectedCategory !== "전체") {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      );
    }

    setFilteredTemplates(filtered);
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
            <div className="flex items-center gap-2">
              <Store className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                트래커 마켓
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="템플릿 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-48 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="popular">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    인기순
                  </div>
                </SelectItem>
                <SelectItem value="recent">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    최신순
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <p className="text-center text-muted-foreground">로딩 중...</p>
        ) : filteredTemplates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {searchQuery || selectedCategory !== "전체"
                  ? "검색 결과가 없습니다"
                  : "아직 공유된 템플릿이 없습니다"}
              </p>
              <p className="text-sm text-muted-foreground">
                나의 트래커 페이지에서 첫 템플릿을 만들어보세요!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="shadow-card cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                onClick={() => navigate(`/market/${template.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{template.clone_count}</span>
                    </div>
                  </div>
                  <CardTitle className="text-xl">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {template.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Market;
