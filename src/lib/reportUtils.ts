import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { ko } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export interface WeeklyReportData {
  weekLabel: string;
  summary: {
    streakHabit: {
      name: string;
      successCount: number;
      totalDays: number;
      successRate: number;
    } | null;
    avgMood: number | null;
    avgSleep: number | null;
  };
  deepAnalysis: {
    habitName: string;
    successDayAvg: {
      mood: number | null;
      sleep: number | null;
      coffee: number | null;
    };
    failureDayAvg: {
      mood: number | null;
      sleep: number | null;
      coffee: number | null;
    };
  } | null;
  interestingFinding: {
    text: string;
  } | null;
}

export const generateWeeklyReport = async (
  userId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyReportData> => {
  // Get user's streak tracker
  const { data: profile } = await supabase
    .from("profiles")
    .select("streak_tracker_id")
    .eq("id", userId)
    .single();

  let streakTracker = null;
  if (profile?.streak_tracker_id) {
    const { data } = await supabase
      .from("trackers")
      .select("*")
      .eq("id", profile.streak_tracker_id)
      .single();
    streakTracker = data;
  }

  // Get all daily logs for the week
  const { data: logs } = await supabase
    .from("daily_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("log_date", format(weekStart, "yyyy-MM-dd"))
    .lte("log_date", format(weekEnd, "yyyy-MM-dd"))
    .order("log_date");

  if (!logs || logs.length === 0) {
    return {
      weekLabel: format(weekStart, "yyyy년 M월 wo주", { locale: ko }),
      summary: {
        streakHabit: null,
        avgMood: null,
        avgSleep: null,
      },
      deepAnalysis: null,
      interestingFinding: null,
    };
  }

  // Calculate summary
  let streakSuccessCount = 0;
  let totalMood = 0;
  let moodCount = 0;
  let totalSleep = 0;
  let sleepCount = 0;

  const logIds = logs.map((log) => log.id);
  const { data: customLogs } = await supabase
    .from("custom_logs")
    .select("*")
    .in("log_id", logIds);

  // Analyze each day
  const successDays: any[] = [];
  const failureDays: any[] = [];

  for (const log of logs) {
    if (log.mood_score) {
      totalMood += log.mood_score;
      moodCount++;
    }
    if (log.sleep_hours) {
      totalSleep += log.sleep_hours;
      sleepCount++;
    }

    // Check streak habit success
    if (streakTracker) {
      const customLog = customLogs?.find(
        (cl) => cl.log_id === log.id && cl.tracker_id === streakTracker.id
      );

      let success = false;
      if (customLog) {
        if (streakTracker.type === "boolean") {
          success = customLog.value === "true";
        } else {
          const numValue = parseFloat(customLog.value);
          success = !isNaN(numValue) && numValue > 0;
        }
      }

      if (success) {
        streakSuccessCount++;
        successDays.push(log);
      } else {
        failureDays.push(log);
      }
    }
  }

  const avgMood = moodCount > 0 ? totalMood / moodCount : null;
  const avgSleep = sleepCount > 0 ? totalSleep / sleepCount : null;

  // Deep analysis
  let deepAnalysis = null;
  if (streakTracker && successDays.length > 0 && failureDays.length > 0) {
    const calcAvg = (days: any[], field: string) => {
      const values = days.map((d) => d[field]).filter((v) => v !== null);
      return values.length > 0
        ? values.reduce((a, b) => a + b, 0) / values.length
        : null;
    };

    deepAnalysis = {
      habitName: streakTracker.name,
      successDayAvg: {
        mood: calcAvg(successDays, "mood_score"),
        sleep: calcAvg(successDays, "sleep_hours"),
        coffee: calcAvg(successDays, "coffee_cups"),
      },
      failureDayAvg: {
        mood: calcAvg(failureDays, "mood_score"),
        sleep: calcAvg(failureDays, "sleep_hours"),
        coffee: calcAvg(failureDays, "coffee_cups"),
      },
    };
  }

  // Find interesting correlation
  let interestingFinding = null;
  
  // Correlation: Coffee vs Sleep
  const coffeeSleepData = logs
    .filter((log) => log.coffee_cups !== null && log.sleep_hours !== null)
    .map((log) => ({ coffee: log.coffee_cups, sleep: log.sleep_hours }));

  if (coffeeSleepData.length >= 3) {
    const highCoffeeDays = coffeeSleepData.filter((d) => d.coffee >= 2);
    const lowCoffeeDays = coffeeSleepData.filter((d) => d.coffee < 2);

    if (highCoffeeDays.length > 0 && lowCoffeeDays.length > 0) {
      const highCoffeeAvgSleep =
        highCoffeeDays.reduce((sum, d) => sum + d.sleep, 0) /
        highCoffeeDays.length;
      const lowCoffeeAvgSleep =
        lowCoffeeDays.reduce((sum, d) => sum + d.sleep, 0) / lowCoffeeDays.length;
      const diff = Math.abs(highCoffeeAvgSleep - lowCoffeeAvgSleep);

      if (diff >= 0.5) {
        if (highCoffeeAvgSleep < lowCoffeeAvgSleep) {
          interestingFinding = {
            text: `혹시 알고 계셨나요? 지난주, 커피를 2잔 이상 마신 날은 평균 수면 시간이 ${diff.toFixed(
              0
            )}시간 ${Math.round((diff % 1) * 60)}분 더 짧았습니다.`,
          };
        } else {
          interestingFinding = {
            text: `흥미로운 발견! 커피를 2잔 이상 마신 날에 오히려 ${diff.toFixed(
              0
            )}시간 ${Math.round((diff % 1) * 60)}분 더 많이 주무셨네요.`,
          };
        }
      }
    }
  }

  // If no coffee-sleep correlation, try mood-exercise
  if (!interestingFinding) {
    const exerciseData = logs.filter(
      (log) => log.mood_score !== null && log.exercised !== null
    );
    if (exerciseData.length >= 3) {
      const exercisedDays = exerciseData.filter((d) => d.exercised);
      const notExercisedDays = exerciseData.filter((d) => !d.exercised);

      if (exercisedDays.length > 0 && notExercisedDays.length > 0) {
        const exercisedAvgMood =
          exercisedDays.reduce((sum, d) => sum + (d.mood_score || 0), 0) /
          exercisedDays.length;
        const notExercisedAvgMood =
          notExercisedDays.reduce((sum, d) => sum + (d.mood_score || 0), 0) /
          notExercisedDays.length;
        const diff = Math.abs(exercisedAvgMood - notExercisedAvgMood);

        if (diff >= 0.5) {
          if (exercisedAvgMood > notExercisedAvgMood) {
            interestingFinding = {
              text: `운동을 한 날의 평균 기분 점수는 ${exercisedAvgMood.toFixed(
                1
              )}점으로, 운동을 하지 않은 날(${notExercisedAvgMood.toFixed(
                1
              )}점)보다 ${diff.toFixed(1)}점 높았어요!`,
            };
          }
        }
      }
    }
  }

  return {
    weekLabel: format(weekStart, "yyyy년 M월 wo주", { locale: ko }),
    summary: {
      streakHabit: streakTracker
        ? {
            name: streakTracker.name,
            successCount: streakSuccessCount,
            totalDays: logs.length,
            successRate: Math.round((streakSuccessCount / logs.length) * 100),
          }
        : null,
      avgMood: avgMood ? Math.round(avgMood * 10) / 10 : null,
      avgSleep: avgSleep ? Math.round(avgSleep * 10) / 10 : null,
    },
    deepAnalysis,
    interestingFinding,
  };
};

export const getWeekRange = (weeksAgo: number = 0): { start: Date; end: Date } => {
  const today = new Date();
  const targetDate = subWeeks(today, weeksAgo);
  return {
    start: startOfWeek(targetDate, { weekStartsOn: 1 }),
    end: endOfWeek(targetDate, { weekStartsOn: 1 }),
  };
};
