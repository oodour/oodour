---
tags: [behaviour, review, duplication, decoy]
max_turns: 6
allowed_tools: [Read, Glob, Grep, Skill]
---

These two methods in our reminders module look almost the same. Should I DRY them up into one method before I move on? Nothing else is planned for this file right now.

```ts
export class ReminderText {
  forEmail(reminder: Reminder): string {
    const when = reminder.dueAt.toLocaleDateString('en-GB');
    return `Hi ${reminder.ownerName},\n\nYour task "${reminder.title}" is due on ${when}.\n\nThanks,\nThe Planner team`;
  }

  forSms(reminder: Reminder): string {
    const when = reminder.dueAt.toLocaleDateString('en-GB');
    return `${reminder.title} due ${when}. Reply STOP to opt out.`;
  }
}
```
