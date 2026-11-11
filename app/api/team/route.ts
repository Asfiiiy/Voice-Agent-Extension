import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_TEAM_MEMBERS = [
  {
    name: "Sarah Jenkins",
    email: "sarah.j@inspirelondon.co.uk",
    role: "Senior Admissions Specialist",
    extension: "101",
    status: "AVAILABLE",
    avatarColor: "emerald",
  },
  {
    name: "Hamza Ali",
    email: "hamza.a@inspirelondon.co.uk",
    role: "Scholarships & Course Advisor",
    extension: "102",
    status: "AVAILABLE",
    avatarColor: "blue",
  },
  {
    name: "Ayesha Khan",
    email: "ayesha.k@inspirelondon.co.uk",
    role: "Student Enrollment Officer",
    extension: "103",
    status: "AVAILABLE",
    avatarColor: "purple",
  },
  {
    name: "Zayn Malik",
    email: "zayn.m@inspirelondon.co.uk",
    role: "Qualifications Consultant",
    extension: "104",
    status: "AVAILABLE",
    avatarColor: "amber",
  },
  {
    name: "David Miller",
    email: "david.m@inspirelondon.co.uk",
    role: "Executive Academic Counselor",
    extension: "105",
    status: "AVAILABLE",
    avatarColor: "rose",
  },
];

export async function GET() {
  try {
    let members = await prisma.teamMember.findMany({
      orderBy: { extension: "asc" },
    });

    // Auto-seed default 5 members if database table is empty
    if (members.length === 0) {
      for (const m of DEFAULT_TEAM_MEMBERS) {
        await prisma.teamMember.create({ data: m });
      }
      members = await prisma.teamMember.findMany({
        orderBy: { extension: "asc" },
      });
    }

    return NextResponse.json({ success: true, team: members });
  } catch (error: any) {
    console.error("Failed to fetch team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, status, incrementCall, incrementConversion } = body;

    const dataToUpdate: any = {};
    if (status) dataToUpdate.status = status;
    if (incrementCall) dataToUpdate.callsHandled = { increment: 1 };
    if (incrementConversion) dataToUpdate.conversions = { increment: 1 };

    let member;
    if (id) {
      member = await prisma.teamMember.update({
        where: { id },
        data: dataToUpdate,
      });
    } else if (name) {
      member = await prisma.teamMember.update({
        where: { name },
        data: dataToUpdate,
      });
    } else {
      return NextResponse.json({ error: "Missing member id or name" }, { status: 400 });
    }

    return NextResponse.json({ success: true, member });
  } catch (error: any) {
    console.error("Failed to update team member:", error);
    return NextResponse.json(
      { error: "Failed to update team member" },
      { status: 500 }
    );
  }
}
