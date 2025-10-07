import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, Star, StarOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface Template {
  id: number;
  name: string;
  description: string;
  category: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean;
  created_at: string;
  clone_count: number;
}

interface TemplateApprovalProps {
  templates: Template[];
  onTemplateUpdated: () => void;
}

export const TemplateApprovalTable = ({ templates, onTemplateUpdated }: TemplateApprovalProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = async (templateId: number) => {
    const { error } = await supabase
      .from("tracker_templates")
      .update({
        approval_status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", templateId);

    if (error) {
      toast.error("승인 실패");
      return;
    }

    toast.success("템플릿이 승인되었습니다");
    onTemplateUpdated();
  };

  const handleReject = async () => {
    if (!selectedTemplate || !rejectionReason) {
      toast.error("반려 사유를 입력해주세요");
      return;
    }

    const { error } = await supabase
      .from("tracker_templates")
      .update({
        approval_status: 'rejected',
        rejection_reason: rejectionReason,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selectedTemplate);

    if (error) {
      toast.error("반려 실패");
      return;
    }

    toast.success("템플릿이 반려되었습니다");
    setShowRejectDialog(false);
    setSelectedTemplate(null);
    setRejectionReason("");
    onTemplateUpdated();
  };

  const handleToggleFeatured = async (templateId: number, currentStatus: boolean) => {
    const { error } = await supabase
      .from("tracker_templates")
      .update({ is_featured: !currentStatus })
      .eq("id", templateId);

    if (error) {
      toast.error("추천 상태 변경 실패");
      return;
    }

    toast.success(currentStatus ? "추천이 해제되었습니다" : "추천 템플릿으로 설정되었습니다");
    onTemplateUpdated();
  };

  const pendingTemplates = templates.filter(t => t.approval_status === 'pending');
  const approvedTemplates = templates.filter(t => t.approval_status === 'approved');

  return (
    <>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">승인 대기중 ({pendingTemplates.length})</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>템플릿명</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>설명</TableHead>
                <TableHead>등록일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.category}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{template.description}</TableCell>
                  <TableCell>{new Date(template.created_at).toLocaleDateString("ko-KR")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(template.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        승인
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          setShowRejectDialog(true);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        반려
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {pendingTemplates.length === 0 && (
            <p className="text-center text-muted-foreground py-8">승인 대기중인 템플릿이 없습니다</p>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">승인된 템플릿 ({approvedTemplates.length})</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>템플릿명</TableHead>
                <TableHead>카테고리</TableHead>
                <TableHead>복사 횟수</TableHead>
                <TableHead>추천</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvedTemplates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{template.category}</Badge>
                  </TableCell>
                  <TableCell>{template.clone_count}회</TableCell>
                  <TableCell>
                    {template.is_featured && <Badge className="bg-amber-500">추천</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleFeatured(template.id, template.is_featured)}
                    >
                      {template.is_featured ? (
                        <><StarOff className="w-4 h-4 mr-1" />추천 해제</>
                      ) : (
                        <><Star className="w-4 h-4 mr-1" />추천</>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>템플릿 반려</DialogTitle>
            <DialogDescription>
              템플릿을 반려하는 사유를 입력해주세요. 이 내용은 제작자에게 전달됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>반려 사유</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="예: 템플릿 설명이 부족합니다, 카테고리가 적절하지 않습니다"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>취소</Button>
            <Button variant="destructive" onClick={handleReject}>반려</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
