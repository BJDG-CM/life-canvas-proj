import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SupportTicket {
  id: number;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_response: string | null;
  created_at: string;
}

interface SupportTicketManagerProps {
  tickets: SupportTicket[];
  onTicketUpdated: () => void;
}

export const SupportTicketManager = ({ tickets, onTicketUpdated }: SupportTicketManagerProps) => {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [response, setResponse] = useState("");

  const handleStatusChange = async (ticketId: number, newStatus: string) => {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: newStatus })
      .eq("id", ticketId);

    if (error) {
      toast.error("상태 변경 실패");
      return;
    }

    toast.success("상태가 변경되었습니다");
    onTicketUpdated();
  };

  const handleSendResponse = async () => {
    if (!selectedTicket || !response) {
      toast.error("답변을 입력해주세요");
      return;
    }

    const { error } = await supabase
      .from("support_tickets")
      .update({
        admin_response: response,
        responded_by: (await supabase.auth.getUser()).data.user?.id,
        responded_at: new Date().toISOString(),
        status: 'resolved',
      })
      .eq("id", selectedTicket.id);

    if (error) {
      toast.error("답변 전송 실패");
      return;
    }

    toast.success("답변이 전송되었습니다");
    setSelectedTicket(null);
    setResponse("");
    onTicketUpdated();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'default';
      case 'in_progress': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">고객 문의 관리</h3>

        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                      <Badge variant={getPriorityColor(ticket.priority)}>
                        {ticket.priority === 'urgent' ? '긴급' : 
                         ticket.priority === 'high' ? '높음' : '보통'}
                      </Badge>
                      <Badge variant={getStatusColor(ticket.status)}>
                        {ticket.status === 'open' ? '대기' :
                         ticket.status === 'in_progress' ? '진행중' :
                         ticket.status === 'resolved' ? '해결' : '종료'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={ticket.status}
                      onValueChange={(value) => handleStatusChange(ticket.id, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">대기</SelectItem>
                        <SelectItem value="in_progress">진행중</SelectItem>
                        <SelectItem value="resolved">해결</SelectItem>
                        <SelectItem value="closed">종료</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      답변
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">문의 내용:</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{ticket.message}</p>
                  </div>
                  {ticket.admin_response && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-1">관리자 답변:</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{ticket.admin_response}</p>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground font-mono">
                    사용자 ID: {ticket.user_id.slice(0, 8)}...
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {tickets.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              등록된 문의가 없습니다
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>답변 작성</DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium mb-1">제목:</p>
                <p className="text-sm">{selectedTicket.subject}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">문의 내용:</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{selectedTicket.message}</p>
              </div>
              <div className="space-y-2">
                <Label>답변</Label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="답변을 입력하세요"
                  rows={6}
                />
              </div>
              <Button onClick={handleSendResponse} className="w-full">
                <Send className="w-4 h-4 mr-2" />
                답변 전송
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
