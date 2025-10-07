import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get last 7 days of logs
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: recentLogs, error: logsError } = await supabaseClient
      .from('daily_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', sevenDaysAgoStr)
      .order('log_date', { ascending: false });

    if (logsError) throw logsError;

    const insights: string[] = [];

    if (recentLogs && recentLogs.length >= 3) {
      // Check for mood trend (3 consecutive days of improvement)
      const last3Moods = recentLogs.slice(0, 3)
        .map(log => log.mood_score)
        .filter(score => score !== null);
      
      if (last3Moods.length === 3) {
        const increasing = last3Moods[0]! > last3Moods[1]! && last3Moods[1]! > last3Moods[2]!;
        if (increasing) {
          insights.push("최근 3일 연속으로 기분 점수가 계속 오르고 있어요! 멋진 일이 있으신가요? 🎉");
        }
      }

      // Check for low sleep
      const avgSleep = recentLogs
        .filter(log => log.sleep_hours !== null)
        .reduce((sum, log) => sum + (log.sleep_hours || 0), 0) / recentLogs.length;
      
      if (avgSleep < 6) {
        insights.push("최근 평균 수면 시간이 6시간 미만이에요. 충분한 휴식이 필요할 것 같아요 😴");
      }

      // Check for coffee consumption
      const avgCoffee = recentLogs
        .reduce((sum, log) => sum + log.coffee_cups, 0) / recentLogs.length;
      
      if (avgCoffee >= 3) {
        insights.push("최근 일주일간 평균적으로 커피를 많이 드셨네요. 카페인 섭취량을 조금 줄여보는 건 어떨까요? ☕");
      }

      // Check for exercise consistency
      const exerciseDays = recentLogs.filter(log => log.exercised).length;
      if (exerciseDays >= 5) {
        insights.push("최근 일주일 중 5일 이상 운동하셨어요! 정말 대단해요! 💪");
      } else if (exerciseDays === 0) {
        insights.push("최근 일주일간 운동 기록이 없네요. 오늘부터 가볍게 시작해보시는 건 어떨까요?");
      }
    }

    // Check if user logged today
    const today = new Date().toISOString().split('T')[0];
    const todayLog = recentLogs?.find(log => log.log_date === today);
    
    if (!todayLog) {
      insights.push("오늘의 소중한 기록을 잊지 않으셨나요? 하루를 마무리하며 당신의 오늘을 남겨주세요 📝");
    }

    return new Response(
      JSON.stringify({ insights, hasData: recentLogs && recentLogs.length > 0 }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error analyzing insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
