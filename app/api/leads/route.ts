import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// Initial seed dataset covering all 16 business statuses
const INITIAL_SEED_LEADS = [
  // IN_PROGRESS
  {
    name: "Tariq Mahmood",
    phoneNumber: "+44 7711 223344",
    email: "tariq.m@gmail.com",
    course: "Qualifi Level 4 Diploma in Cyber Security",
    status: "IN_PROGRESS",
    leadScore: 82,
    assignedToMember: "Sarah Jenkins",
    attemptsCount: 2,
    notes: "Discussing £128 deposit and 2-month installment plan. Highly interested in network security modules.",
    humanNotes: "[Call #1 • Oct 7 • Sarah Jenkins]: Inquired about evening study. | [Call #2 • Oct 8 • Sarah Jenkins]: Reviewing payment plan.",
    createdAt: new Date(Date.now() - 3600000 * 4),
  },
  {
    name: "Emma Watson",
    phoneNumber: "+44 7822 991122",
    email: "emma.watson@yahoo.co.uk",
    course: "Focus Awards Level 3 Award in Education and Training (AET)",
    status: "IN_PROGRESS",
    leadScore: 78,
    assignedToMember: "Hamza Ali",
    attemptsCount: 1,
    notes: "Needs microteach guidance for college teaching role. Call currently in progress.",
    humanNotes: "[Call #1 • Oct 8 • Hamza Ali]: Explained written assignments and online observation.",
    createdAt: new Date(Date.now() - 3600000 * 6),
  },
  {
    name: "Khurram Shahzad",
    phoneNumber: "+44 7900 112244",
    email: "khurram.s@outlook.com",
    course: "OTHM Level 7 Diploma in Strategic Management & Leadership",
    status: "IN_PROGRESS",
    leadScore: 88,
    assignedToMember: "David Miller",
    attemptsCount: 2,
    notes: "Executive candidate checking MBA top-up progression at UK universities.",
    humanNotes: "[Call #1 • Oct 7 • David Miller]: Discussed 120 credits for university top-up.",
    createdAt: new Date(Date.now() - 3600000 * 8),
  },

  // LATE_CALL (Overdue Callbacks)
  {
    name: "Marcus Vance",
    phoneNumber: "+44 7799 445566",
    email: "marcus.v@corporate-tech.co.uk",
    course: "Qualifi Level 5 Diploma in Cyber Security",
    status: "LATE_CALL",
    leadScore: 75,
    assignedToMember: "Sarah Jenkins",
    attemptsCount: 3,
    scheduledCallback: new Date(Date.now() - 3600000 * 2), // 2 hours overdue!
    notes: "Callback scheduled for 2 hours ago. Advisor was on another call. Priority callback needed.",
    humanNotes: "[Call #1 • Oct 6]: Customer asked for callback today at 2 PM.",
    createdAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    name: "Hannah Phillips",
    phoneNumber: "+44 7844 556677",
    email: "hannah.p@hotmail.co.uk",
    course: "Level 3 Certificate in Phlebotomy Training (London)",
    status: "LATE_CALL",
    leadScore: 70,
    assignedToMember: "Ayesha Khan",
    attemptsCount: 2,
    scheduledCallback: new Date(Date.now() - 3600000 * 5),
    notes: "Requested London Saturday date confirmation. Callback overdue.",
    humanNotes: "[Call #1 • Oct 7 • Ayesha Khan]: Wants live blood training slot for next Saturday.",
    createdAt: new Date(Date.now() - 86400000),
  },

  // SCHEDULED_CALL (Upcoming Callbacks)
  {
    name: "Bilal Rehman",
    phoneNumber: "+44 7700 900123",
    email: "bilal.rehman@hotmail.com",
    course: "OTHM Level 7 Diploma in Strategic Marketing",
    status: "SCHEDULED_CALL",
    leadScore: 74,
    assignedToMember: "Ayesha Khan",
    attemptsCount: 1,
    scheduledCallback: new Date(Date.now() + 3600000 * 24), // Tomorrow
    notes: "Caller was driving. Inquired about 8-month installment plan (£70.50/mo). Requested callback tomorrow afternoon.",
    humanNotes: "[Call #1 • Oct 8 • Ayesha Khan]: Caller requested 3 PM callback tomorrow.",
    createdAt: new Date(Date.now() - 3600000 * 10),
  },
  {
    name: "Chloe Richardson",
    phoneNumber: "+44 7911 332211",
    email: "chloe.r@icloud.com",
    course: "Level 3 Certificate in Phlebotomy Training (London)",
    status: "SCHEDULED_CALL",
    leadScore: 68,
    assignedToMember: "Zayn Malik",
    attemptsCount: 2,
    scheduledCallback: new Date(Date.now() + 3600000 * 3), // Today later
    notes: "Asked for upcoming Saturday classroom dates in London. Callback scheduled for 4:30 PM.",
    humanNotes: "[Call #1 • Oct 8 • Zayn Malik]: Checking diary with mentor.",
    createdAt: new Date(Date.now() - 3600000 * 12),
  },

  // NEW
  {
    name: "Amina Begum",
    phoneNumber: "+44 7722 119988",
    email: "amina.b@gmail.com",
    course: "Qualifi Level 4 Diploma in Cyber Security",
    status: "NEW",
    leadScore: 60,
    assignedToMember: "Sarah Jenkins",
    attemptsCount: 0,
    notes: "Uncalled lead from website contact form inquiry. Fresh lead.",
    createdAt: new Date(Date.now() - 3600000 * 2),
  },
  {
    name: "Oliver Smith",
    phoneNumber: "+44 7855 667788",
    email: "oliver.smith@example.com",
    course: "Level 5 Diploma in Education and Training (DET)",
    status: "NEW",
    leadScore: 55,
    assignedToMember: "Hamza Ali",
    attemptsCount: 0,
    notes: "Looking for Qualified Teacher Status (QTLS) progression route.",
    createdAt: new Date(Date.now() - 3600000 * 3),
  },
  {
    name: "Fatima Al-Mansoor",
    phoneNumber: "+44 7899 334455",
    email: "fatima.m@edu.ae",
    course: "OTHM Level 3 Foundation Diploma in Accountancy",
    status: "NEW",
    leadScore: 65,
    assignedToMember: "Zayn Malik",
    attemptsCount: 0,
    notes: "Inquired through live chat widget on pricing.",
    createdAt: new Date(Date.now() - 3600000 * 5),
  },

  // RECEIVED_CALL
  {
    name: "Liam O'Connor",
    phoneNumber: "+44 7733 445566",
    email: "liam.oc@dublin-care.ie",
    course: "Qualifi Level 3 Diploma in Health and Social Care",
    status: "RECEIVED_CALL",
    leadScore: 72,
    assignedToMember: "Sarah Jenkins",
    attemptsCount: 1,
    notes: "Call answered. Discussed care home supervisor requirements.",
    humanNotes: "[Call #1 • Oct 8 • Sarah Jenkins]: Spoke for 4 mins. Very positive.",
    createdAt: new Date(Date.now() - 86400000),
  },
  {
    name: "Sophie Bennett",
    phoneNumber: "+44 7811 889900",
    email: "sophie.b@brighton.ac.uk",
    course: "Level 3 CAVA Certificate in Assessing Vocational Achievement",
    status: "RECEIVED_CALL",
    leadScore: 76,
    assignedToMember: "Hamza Ali",
    attemptsCount: 1,
    notes: "Spoke with advisor regarding vocational assessor portfolio.",
    humanNotes: "[Call #1 • Oct 7 • Hamza Ali]: Answered questions about finding trainee assessors.",
    createdAt: new Date(Date.now() - 86400000 * 2),
  },

  // NOT_RECEIVED_CALL
  {
    name: "James Thornton",
    phoneNumber: "+44 7744 556677",
    email: "j.thornton@gmail.com",
    course: "Qualifi Level 2 Diploma in Business Beginners in Cyber Security",
    status: "NOT_RECEIVED_CALL",
    leadScore: 40,
    assignedToMember: "David Miller",
    attemptsCount: 2,
    notes: "Call rang full 45s without answer. Scheduled retry in cadence.",
    humanNotes: "[Call #1 • Oct 6]: No answer. | [Call #2 • Oct 7]: Voicemail left.",
    createdAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    name: "Rebecca Shaw",
    phoneNumber: "+44 7833 221100",
    email: "rshaw@sky.com",
    course: "iCQ Level 2 Diploma in Care",
    status: "NOT_RECEIVED_CALL",
    assignedToMember: "Ayesha Khan",
    attemptsCount: 1,
    notes: "Dialed by Sonia AI - phone busy tone. Re-queued for retry.",
    createdAt: new Date(Date.now() - 3600000 * 18),
  },

  // CONVERTED
  {
    name: "Kirsty MacLeod",
    phoneNumber: "+44 7890 123456",
    email: "kirsty.macleod@nhs.scot",
    course: "Level 3 Certificate in Phlebotomy Training (London)",
    status: "CONVERTED",
    leadScore: 99,
    assignedToMember: "Sarah Jenkins",
    attemptsCount: 2,
    notes: "Enrolled in London Saturday Practical session. Paid £350 in full.",
    humanNotes: "[Call #1 • Oct 6 • Sarah Jenkins]: Sent booking link. | [Call #2 • Oct 7 • Sarah Jenkins]: Enrollment complete. Welcome pack sent.",
    createdAt: new Date(Date.now() - 86400000 * 3),
  },
  {
    name: "Arjun Patel",
    phoneNumber: "+44 7701 889977",
    email: "arjun.patel@techsolutions.com",
    course: "Qualifi Level 4 Diploma in Cyber Security",
    status: "CONVERTED",
    leadScore: 98,
    assignedToMember: "David Miller",
    attemptsCount: 1,
    notes: "Paid £128 initial deposit. Tutor assigned in student portal.",
    humanNotes: "[Call #1 • Oct 8 • David Miller]: Paid £128 on Stripe. Order #117822 confirmed.",
    createdAt: new Date(Date.now() - 3600000 * 20),
  },

  // NOT_CONVERTED
  {
    name: "Daniel Walker",
    phoneNumber: "+44 7811 556677",
    email: "dwalker@yahoo.co.uk",
    course: "OTHM Level 3 Foundation Diploma in Accountancy",
    status: "NOT_CONVERTED",
    leadScore: 25,
    assignedToMember: "Zayn Malik",
    attemptsCount: 2,
    notes: "Caller enrolled at a local college last week. Tagged as not interested.",
    humanNotes: "[Call #1 • Oct 6 • Zayn Malik]: Started apprenticeship elsewhere.",
    createdAt: new Date(Date.now() - 86400000 * 3),
  },

  // CLOSED_NO_RESPONSE
  {
    name: "Gary Robinson",
    phoneNumber: "+44 7788 990011",
    email: "g.robinson@btinternet.com",
    course: "Qualifi Level 5 Extended Diploma in Business Management",
    status: "CLOSED_NO_RESPONSE",
    leadScore: 15,
    assignedToMember: "Hamza Ali",
    attemptsCount: 5,
    notes: "5 consecutive attempts without response over 7 days. Closed as unreachable.",
    humanNotes: "[Attempts 1-5]: No answer, no response to SMS.",
    createdAt: new Date(Date.now() - 86400000 * 7),
  },

  // MAX_ATTEMPTS_REACHED
  {
    name: "Nathaniel Cooper",
    phoneNumber: "+44 7766 554433",
    email: "n.cooper@virginmedia.com",
    course: "OTHM Level 7 Diploma in Project Management",
    status: "MAX_ATTEMPTS_REACHED",
    leadScore: 10,
    assignedToMember: "David Miller",
    attemptsCount: 7,
    notes: "Completed full 7-attempt cadence. Moved to dormant marketing list.",
    humanNotes: "[Cadence Complete]: 7 dial attempts made.",
    createdAt: new Date(Date.now() - 86400000 * 10),
  },

  // EMAIL_SHARED
  {
    name: "Rachel Green",
    phoneNumber: "+44 7877 665544",
    email: "rachel.green@fashionhouse.co.uk",
    course: "OTHM Level 7 Diploma in Strategic Marketing",
    status: "EMAIL_SHARED",
    leadScore: 72,
    assignedToMember: "Sarah Jenkins",
    attemptsCount: 1,
    notes: "Emailed full PDF course syllabus and 6 unit modules specification.",
    humanNotes: "[Call #1 • Oct 8 • Sarah Jenkins]: Sent syllabus to rachel.green@fashionhouse.co.uk.",
    createdAt: new Date(Date.now() - 3600000 * 8),
  },
  {
    name: "Pooja Sharma",
    phoneNumber: "+44 7933 445566",
    email: "pooja.s@nhs.net",
    course: "Qualifi Level 5 Diploma in Health and Social Care",
    status: "EMAIL_SHARED",
    leadScore: 68,
    assignedToMember: "Ayesha Khan",
    attemptsCount: 1,
    notes: "Emailed corporate funding guide and invoice breakdown.",
    humanNotes: "[Call #1 • Oct 7 • Ayesha Khan]: Sent NHS workplace funding pack.",
    createdAt: new Date(Date.now() - 86400000 * 2),
  },

  // WHATSAPP_SHARED
  {
    name: "Zainab Ali",
    phoneNumber: "+44 7911 990011",
    email: "zainab.ali@gmail.com",
    course: "Qualifi Level 5 Cyber Security",
    status: "WHATSAPP_SHARED",
    leadScore: 85,
    assignedToMember: "Hamza Ali",
    attemptsCount: 2,
    notes: "Sent course overview brochure and 25% discount voucher via WhatsApp.",
    humanNotes: "[Call #1 • Oct 8 • Hamza Ali]: Sent WhatsApp message. Student confirmed receipt.",
    createdAt: new Date(Date.now() - 3600000 * 6),
  },
  {
    name: "Hassan Raza",
    phoneNumber: "+44 7855 443322",
    email: "hassan.r@gmail.com",
    course: "Focus Awards Level 3 Award in Education and Training",
    status: "WHATSAPP_SHARED",
    leadScore: 80,
    assignedToMember: "Zayn Malik",
    attemptsCount: 1,
    notes: "Shared tutor observation guide on WhatsApp. Follow up scheduled.",
    humanNotes: "[Call #1 • Oct 8 • Zayn Malik]: WhatsApp link sent.",
    createdAt: new Date(Date.now() - 3600000 * 14),
  },

  // INTERNATIONAL_CALLS
  {
    name: "Ahmed Al-Hashimi",
    phoneNumber: "+971 50 123 4567",
    email: "ahmed.hashimi@dubaiholding.ae",
    course: "OTHM Level 7 Diploma in International Business Law",
    status: "INTERNATIONAL_CALLS",
    leadScore: 84,
    assignedToMember: "David Miller",
    attemptsCount: 1,
    notes: "UAE International Inquiry. Looking for online UK diploma with worldwide attestation.",
    humanNotes: "[Call #1 • Oct 7 • David Miller]: Clarified UK embassy legalization and FCDO apostille.",
    createdAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    name: "Chukwudi Okafor",
    phoneNumber: "+234 803 123 4567",
    email: "c.okafor@lagos-consulting.ng",
    course: "OTHM Level 7 Diploma in Risk Management",
    status: "INTERNATIONAL_CALLS",
    leadScore: 79,
    assignedToMember: "Sarah Jenkins",
    attemptsCount: 1,
    notes: "Nigeria International Inquiry. Flexible payment in USD/GBP requested.",
    humanNotes: "[Call #1 • Oct 8 • Sarah Jenkins]: Discussed international debit card and PayPal.",
    createdAt: new Date(Date.now() - 3600000 * 16),
  },

  // PAYMENT_LINK_SHARED
  {
    name: "Sarah Connors",
    phoneNumber: "+44 7899 112233",
    email: "sconnors@outlook.com",
    course: "Focus Awards Level 3 Award in Education and Training",
    status: "PAYMENT_LINK_SHARED",
    leadScore: 92,
    assignedToMember: "Sarah Jenkins",
    attemptsCount: 2,
    notes: "Sent £128 initial deposit payment link via SMS and Email. Awaiting payment completion.",
    humanNotes: "[Call #1 • Oct 8 • Sarah Jenkins]: Customer agreed to 25% discount offer. Stripe link sent.",
    createdAt: new Date(Date.now() - 3600000 * 4),
  },
  {
    name: "Mohammed Farooq",
    phoneNumber: "+44 7711 778899",
    email: "m.farooq@birmingham.co.uk",
    course: "Qualifi Level 4 Diploma in Cyber Security",
    status: "PAYMENT_LINK_SHARED",
    leadScore: 91,
    assignedToMember: "Hamza Ali",
    attemptsCount: 1,
    notes: "Generated £128 monthly installment plan link. Customer promised payment this evening.",
    humanNotes: "[Call #1 • Oct 8 • Hamza Ali]: Deposit link sent on WhatsApp.",
    createdAt: new Date(Date.now() - 3600000 * 5),
  },

  // DUPLICATE_LEAD
  {
    name: "Amina Begum (Duplicate)",
    phoneNumber: "+44 7722 119988",
    email: "amina.b@gmail.com",
    course: "Qualifi Level 4 Diploma in Cyber Security",
    status: "DUPLICATE_LEAD",
    leadScore: 20,
    assignedToMember: "Sarah Jenkins",
    attemptsCount: 0,
    notes: "Duplicate form submission detected from identical phone and email within 10 minutes.",
    createdAt: new Date(Date.now() - 3600000 * 2),
  },

  // ALREADY_CONVERTED
  {
    name: "Victoria Adams",
    phoneNumber: "+44 7922 443322",
    email: "victoria.a@adams-group.co.uk",
    course: "OTHM Level 7 Diploma in Strategic Management",
    status: "ALREADY_CONVERTED",
    leadScore: 95,
    assignedToMember: "David Miller",
    attemptsCount: 1,
    notes: "Already enrolled in Batch 2026 under Order #114920. Inquiry was for additional unit.",
    humanNotes: "[Call #1 • Oct 7 • David Miller]: Confirmed active student status.",
    createdAt: new Date(Date.now() - 86400000 * 4),
  },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const assignedTo = searchParams.get("assignedTo");
    const search = searchParams.get("search");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const isArchived = searchParams.get("archived") === "true";

    // 1. Auto-seed realistic demo leads if table is empty
    const count = await prisma.lead.count();
    if (count === 0) {
      await prisma.lead.createMany({
        data: INITIAL_SEED_LEADS.map((l) => ({
          name: l.name,
          phoneNumber: l.phoneNumber,
          email: l.email,
          course: l.course,
          status: l.status,
          leadScore: l.leadScore,
          notes: l.notes,
          humanNotes: (l as any).humanNotes || null,
          assignedToMember: l.assignedToMember,
          attemptsCount: l.attemptsCount,
          maxAttempts: 7,
          scheduledCallback: (l as any).scheduledCallback || null,
          createdAt: l.createdAt,
        })),
      });
    }

    // 2. Build where filter
    const where: any = {};

    if (status && status.toUpperCase() !== "ALL") {
      where.status = status.toUpperCase();
    }

    if (assignedTo && assignedTo.toLowerCase() !== "all" && assignedTo.toLowerCase() !== "all assignees") {
      where.assignedToMember = assignedTo;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { course: { contains: search, mode: "insensitive" } },
      ];
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // 3. Compute real-time status counts across all leads for pill badges
    const allLeads = await prisma.lead.findMany({
      select: { status: true, assignedToMember: true },
    });

    const statusCounts: Record<string, number> = {
      ALL: allLeads.length,
      LATE_CALL: 0,
      SCHEDULED_CALL: 0,
      RECEIVED_CALL: 0,
      NOT_RECEIVED_CALL: 0,
      NEW: 0,
      IN_PROGRESS: 0,
      CONVERTED: 0,
      NOT_CONVERTED: 0,
      CLOSED_NO_RESPONSE: 0,
      MAX_ATTEMPTS_REACHED: 0,
      EMAIL_SHARED: 0,
      WHATSAPP_SHARED: 0,
      INTERNATIONAL_CALLS: 0,
      PAYMENT_LINK_SHARED: 0,
      DUPLICATE_LEAD: 0,
      ALREADY_CONVERTED: 0,
    };

    allLeads.forEach((l) => {
      const s = (l.status || "").toUpperCase();
      if (statusCounts[s] !== undefined) {
        statusCounts[s]++;
      }
    });

    return NextResponse.json({
      success: true,
      leads,
      statusCounts,
      totalCount: allLeads.length,
    });
  } catch (error) {
    console.error("Failed to fetch leads:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || !body.phoneNumber) {
      return NextResponse.json(
        { error: "Name and Phone Number are required" },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        name: body.name.trim(),
        phoneNumber: body.phoneNumber.trim(),
        email: body.email ? body.email.trim() : null,
        course: body.course ? body.course.trim() : "Inspire London College Qualification",
        status: (body.status || "NEW").toUpperCase(),
        leadScore: typeof body.leadScore === "number" ? body.leadScore : 65,
        notes: body.notes ? body.notes.trim() : null,
        assignedToMember: body.assignedToMember || "Sarah Jenkins",
        attemptsCount: typeof body.attemptsCount === "number" ? body.attemptsCount : 0,
        maxAttempts: 7,
        scheduledCallback: body.scheduledCallback ? new Date(body.scheduledCallback) : null,
        humanNotes: body.notes ? `[Manual Entry]: ${body.notes}` : null,
      },
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error("Failed to create lead:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

function parseFlexibleDate(val?: string | null): Date | null {
  if (!val) return null;
  const direct = new Date(val);
  if (!isNaN(direct.getTime())) return direct;

  const lower = val.toLowerCase();
  const target = new Date();

  if (lower.includes("tomorrow")) {
    target.setDate(target.getDate() + 1);
  } else if (lower.includes("day after tomorrow")) {
    target.setDate(target.getDate() + 2);
  }

  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridian = timeMatch[3];
    if (meridian === "pm" && hour < 12) hour += 12;
    if (meridian === "am" && hour === 12) hour = 0;
    target.setHours(hour, minute, 0, 0);
  } else {
    target.setHours(17, 0, 0, 0);
  }

  return isNaN(target.getTime()) ? new Date(Date.now() + 86400000) : target;
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      phoneNumber,
      status,
      disposition,
      assignedToMember,
      incrementAttempt,
      attemptsCount,
      humanDisposition,
      humanNotes,
      notes,
      scheduledCallback,
    } = body;

    const data: any = {};
    if (status) data.status = status.toUpperCase();
    if (disposition) data.disposition = disposition;
    if (assignedToMember) data.assignedToMember = assignedToMember;
    if (humanDisposition) data.humanDisposition = humanDisposition;
    if (humanNotes) data.humanNotes = humanNotes;
    if (notes) data.notes = notes;
    if (scheduledCallback !== undefined) {
      data.scheduledCallback = parseFlexibleDate(scheduledCallback);
    }
    if (incrementAttempt) {
      data.attemptsCount = { increment: 1 };
      data.lastAttemptAt = new Date();
    } else if (typeof attemptsCount === "number") {
      data.attemptsCount = attemptsCount;
    }

    let updated;
    if (id) {
      updated = await prisma.lead.update({ where: { id }, data });
    } else if (phoneNumber) {
      updated = await prisma.lead.updateMany({ where: { phoneNumber }, data });
    } else {
      return NextResponse.json({ error: "Missing lead id or phoneNumber" }, { status: 400 });
    }

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    console.error("Failed to update lead:", error);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing lead id" }, { status: 400 });
    }

    await prisma.lead.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Lead deleted successfully" });
  } catch (error: any) {
    console.error("Failed to delete lead:", error);
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
