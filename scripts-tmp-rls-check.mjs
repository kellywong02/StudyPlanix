import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const password = "SmokeTest123!";
const emailA = `kellylouvyu+rls-a-${Date.now()}@gmail.com`;
const emailB = `kellylouvyu+rls-b-${Date.now()}@gmail.com`;

const { data: userA } = await admin.auth.admin.createUser({ email: emailA, password, email_confirm: true });
const { data: userB } = await admin.auth.admin.createUser({ email: emailB, password, email_confirm: true });

// separate anon clients, one per "browser session"
const clientA = createClient(URL, ANON_KEY);
const clientB = createClient(URL, ANON_KEY);

await clientA.auth.signInWithPassword({ email: emailA, password });
await clientB.auth.signInWithPassword({ email: emailB, password });

const results = {};

// --- set up data as User A ---
const { data: course } = await clientA.from("courses").insert({
  user_id: userA.user.id, name: "RLS Test Course",
}).select().single();

const { data: group } = await clientA.from("course_groups").insert({
  user_id: userA.user.id, course_id: course.id, name: "RLS Group",
}).select().single();

const { data: session } = await clientA.from("class_sessions").insert({
  user_id: userA.user.id, course_id: course.id, group_id: group.id,
  session_type: "lecture", start_time: "09:00", end_time: "10:00",
  is_recurring: false, specific_dates: ["2026-08-01"], source: "manual",
}).select().single();

const { data: assignment } = await clientA.from("assignments").insert({
  user_id: userA.user.id, course_id: course.id, title: "RLS Test Assignment",
  due_date: new Date(Date.now() + 86400000).toISOString(), status: "not_started",
}).select().single();

// a notification for user A, inserted via service role (only the cron job can do this)
const { data: notif } = await admin.from("notifications").insert({
  user_id: userA.user.id, type: "system", title: "RLS test notif",
}).select().single();

// --- User B tries to read User A's data ---
results.courseVisibleToB = (await clientB.from("courses").select("*").eq("id", course.id)).data;
results.groupVisibleToB = (await clientB.from("course_groups").select("*").eq("id", group.id)).data;
results.sessionVisibleToB = (await clientB.from("class_sessions").select("*").eq("id", session.id)).data;
results.assignmentVisibleToB = (await clientB.from("assignments").select("*").eq("id", assignment.id)).data;
results.notificationVisibleToB = (await clientB.from("notifications").select("*").eq("id", notif.id)).data;

// --- User B tries to modify/delete User A's data ---
results.bUpdateCourseResult = await clientB.from("courses").update({ name: "Hacked" }).eq("id", course.id).select();
results.bDeleteAssignmentResult = await clientB.from("assignments").delete().eq("id", assignment.id).select();

// --- User B tries to insert a row claiming User A's user_id ---
results.bSpoofInsertResult = await clientB.from("courses").insert({
  user_id: userA.user.id, name: "Spoofed course",
}).select();

// --- User B tries to insert directly into notifications (should be denied — only service role may) ---
results.bInsertNotificationResult = await clientB.from("notifications").insert({
  user_id: userB.user.id, type: "system", title: "self-inserted",
}).select();

// --- confirm User A can still see their own data (sanity check RLS isn't over-blocking) ---
results.courseVisibleToA = (await clientA.from("courses").select("*").eq("id", course.id)).data;
results.notificationVisibleToA = (await clientA.from("notifications").select("*").eq("id", notif.id)).data;

console.log(JSON.stringify(results, null, 2));

// cleanup
await admin.from("notifications").delete().eq("user_id", userA.user.id);
await admin.from("assignments").delete().eq("user_id", userA.user.id);
await admin.from("class_sessions").delete().eq("user_id", userA.user.id);
await admin.from("course_groups").delete().eq("user_id", userA.user.id);
await admin.from("courses").delete().eq("user_id", userA.user.id);
await admin.auth.admin.deleteUser(userA.user.id);
await admin.auth.admin.deleteUser(userB.user.id);
