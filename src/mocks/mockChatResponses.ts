import type { ChatResponse } from "../shared/types/timeline";

export const mockResponses: Record<string, ChatResponse> = {
  start: {
    assistantMessage:
      "הבנתי. יצרתי אירוע ראשון בטיימליין, כולל מקורות מוצעים. אתה יכול לפתוח Sources ולאמת.",
    actions: [
      {
        type: "ADD_EVENT",
        event: {
          id: "evt_1",
          title: "התחלת פרויקט Timeline עם צ׳אט",
          dateLabel: "2025-12-24",
          confidence: "high",
          summary:
            "PoC שמתרגם שיחה טבעית לרשימת אירועים בטיימליין אנכי, כולל מקורות ואפשרות לתיקון.",
          sources: [
            {
              title: "שיחת המשתמש (internal)",
              url: "about:conversation",
              kind: "primary",
              confidence: "high",
              note: "נובע מהשיחה עצמה.",
            },
            {
              title: "Claude Artifacts (inspiration)",
              url: "https://www.anthropic.com",
              kind: "secondary",
              confidence: "medium",
              note: "דוגמה ל-UI שמציג תוצר בצד בזמן צ׳אט.",
            },
          ],
          createdAt: new Date().toISOString(),
          lastUpdatedAt: new Date().toISOString(),
        },
      },
    ],
  },

  correct_date: {
    assistantMessage: "עדכנתי את התאריך, והאירוע יזוז במידת הצורך לפי סדר כרונולוגי.",
    actions: [
      {
        type: "UPDATE_EVENT",
        id: "evt_1",
        patch: {
          dateLabel: "2025-12-25",
          confidence: "medium",
          summary: "עודכן תאריך האירוע בעקבות תיקון משתמש. שים לב לסימן ביטחון בינוני.",
        },
      },
    ],
  },
};
