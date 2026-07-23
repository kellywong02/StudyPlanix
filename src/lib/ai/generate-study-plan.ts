import "server-only"
import { zodResponseFormat } from "openai/helpers/zod"

import { getOpenAIClient } from "@/lib/ai/openai"
import {
  aiStudyPlanSchema,
  STUDY_TYPE_LABELS,
  type AiStudyPlan,
  type STUDY_TYPES,
} from "@/lib/validators/study-plan"

export type StudyPlanCourseContext = {
  id: string
  name: string
}

export type StudyPlanAssignmentContext = {
  id: string
  title: string
  courseId: string
  dueDate: string
  priority: string | null
}

export type StudyPlanExamContext = {
  courseId: string
  title: string
  dates: string[]
  startTime: string
  endTime: string
}

export type StudyPlanBusyBlock = {
  dayOfWeek: number
  startTime: string
  endTime: string
  title: string
}

export async function generateStudyPlan(input: {
  studyType: (typeof STUDY_TYPES)[number]
  studyAvailability: string | null
  today: string
  courses: StudyPlanCourseContext[]
  assignments: StudyPlanAssignmentContext[]
  exams: StudyPlanExamContext[]
  busyBlocks: StudyPlanBusyBlock[]
}): Promise<AiStudyPlan> {
  const client = getOpenAIClient()

  const system = `You are a study-planning assistant for a university student. Propose a set of \
concrete study sessions that help the student finish their assignments on time and prepare for \
exams, while respecting how much free time they realistically have.

The student's situation: ${STUDY_TYPE_LABELS[input.studyType]}.
${
  input.studyAvailability
    ? `Their stated availability/constraints: ${input.studyAvailability}`
    : "They have not given specific availability constraints — use sensible defaults for their situation (e.g. a student with a full-time job likely only has evenings after 6pm and weekends free; a full-time student has most weekday daytime hours free outside class)."
}

Rules:
- Only schedule sessions on or after ${input.today}.
- Never schedule a session that overlaps one of the student's recurring weekly class times (given below as day-of-week + time ranges, 0=Sunday).
- Prioritize assignments closer to their due date and higher priority; leave headroom before each due date, don't schedule a session on the exact due date.
- Prioritize exam prep in the days leading up to each exam date.
- Only use assignmentId/courseId values from the lists provided — never invent an id. Use null for a session that is general exam-prep review not tied to one assignment.
- Keep individual sessions between 45 and 120 minutes.
- Do not overload any single day — respect the student's realistic capacity given their situation.`

  const assignmentLines = input.assignments
    .map((a) => `- id=${a.id} "${a.title}" (course ${a.courseId}, due ${a.dueDate}, priority ${a.priority ?? "none"})`)
    .join("\n")
  const examLines = input.exams
    .map((e) => `- course ${e.courseId} "${e.title}" on ${e.dates.join(", ")} ${e.startTime}-${e.endTime}`)
    .join("\n")
  const busyLines = input.busyBlocks
    .map((b) => `- day ${b.dayOfWeek}: ${b.startTime}-${b.endTime} (${b.title})`)
    .join("\n")
  const courseLines = input.courses.map((c) => `- id=${c.id} "${c.name}"`).join("\n")

  const userMessage = `Courses:\n${courseLines || "(none)"}\n\nOutstanding assignments:\n${assignmentLines || "(none)"}\n\nUpcoming exams:\n${examLines || "(none)"}\n\nRecurring weekly class times (busy, do not schedule over these):\n${busyLines || "(none)"}\n\nGenerate the study plan.`

  const completion = await client.chat.completions.parse({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMessage },
    ],
    response_format: zodResponseFormat(aiStudyPlanSchema, "study_plan"),
  })

  const parsed = completion.choices[0]?.message.parsed
  if (!parsed) {
    throw new Error("The AI did not return a usable study plan. Please try again.")
  }

  return parsed
}
