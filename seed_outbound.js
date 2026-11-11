const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding realistic outbound calls into PostgreSQL...");

  const existingOutbound = await prisma.call.count({
    where: { direction: 'OUTBOUND' }
  });

  if (existingOutbound > 0) {
    console.log(`Already have ${existingOutbound} outbound calls in DB.`);
    return;
  }

  const outboundCalls = [
    {
      phoneNumber: "+44 7911 123456",
      customerName: "Johnathan Miller",
      courseInquired: "Qualifi Level 5 Diploma in Education and Training (DET)",
      status: "ANSWERED",
      direction: "OUTBOUND",
      disposition: "TRANSFERRED",
      leadScore: 95,
      durationSec: 194,
      transferredTo: "Sarah Jenkins (Ext 101)",
      summary: "Johnathan answered during morning business hours. Confirmed he submitted the website form for Level 5 DET to teach in further education colleges. He asked about online tutor support and previous credit transfers. Sonia confirmed Ofqual regulation, 100% online self-paced study, and £60/month installment plan. Caller requested to finalize admission with a human advisor, so Sonia transferred the live call directly to Sarah Jenkins on Ext 101.",
      transcript: "Sonia: Good morning! Am I speaking with Johnathan?\nJohnathan: Yes, this is Johnathan speaking.\nSonia: Wonderful! This is Sonia calling from Inspire London College regarding your inquiry for the Level 5 DET. Do you have a quick 2 minutes to speak?\nJohnathan: Yes sure, I've got a couple of minutes.\nSonia: Fantastic! Our Level 5 DET is fully Ofqual-accredited, 100% online self-paced over 6 to 12 months, with dedicated 1-on-1 tutor support and monthly installments starting from £60. Are you looking to teach in colleges or corporate training?\nJohnathan: Colleges. Can someone check my previous Level 3 certificate for credit transfer?\nSonia: Absolutely! Our Senior Admissions Advisor Sarah Jenkins is available right now. Let me connect you directly to finalize that.\nJohnathan: Perfect, please connect me."
    },
    {
      phoneNumber: "+44 7822 654321",
      customerName: "Amna Tariq",
      courseInquired: "OTHM Level 7 Diploma in Strategic Marketing",
      status: "ANSWERED",
      direction: "OUTBOUND",
      disposition: "CALLBACK_SCHEDULED",
      leadScore: 78,
      durationSec: 85,
      scheduledCallback: new Date(Date.now() + 24 * 60 * 60 * 1000),
      summary: "Amna answered during afternoon business hours. She was in an office client meeting but confirmed strong interest in the OTHM Level 7 Strategic Marketing Postgraduate Diploma. She requested a follow-up callback. Sonia confirmed tomorrow at 3:00 PM UK time and reserved the slot in the queue.",
      transcript: "Sonia: Good afternoon! Am I speaking with Amna?\nAmna: Yes, hello. Who is this?\nSonia: This is Sonia calling from Inspire London College regarding your inquiry for the OTHM Level 7 Strategic Marketing Diploma. Do you have a quick 2 minutes to speak?\nAmna: Oh yes! Look, I'm currently in a meeting with a client, but I am very interested in that diploma.\nSonia: No worries at all, Amna! What day and time would suit you best for our team to give you a quick callback?\nAmna: Tomorrow around 3 PM would be ideal.\nSonia: Perfect! I've reserved tomorrow at 3:00 PM for our senior advisor to call you back with full syllabus details. Have a wonderful day!\nAmna: Thank you so much, bye."
    },
    {
      phoneNumber: "+44 7700 900123",
      customerName: "Michael Davies",
      courseInquired: "Focus Awards Level 3 Award in Education and Training (AET)",
      status: "ANSWERED",
      direction: "OUTBOUND",
      disposition: "ENROLLED",
      leadScore: 98,
      durationSec: 242,
      summary: "Michael confirmed career switch into vocational teaching. Sonia explained Focus Awards Level 3 AET, 3 core units with home video microteaching, £128 initial deposit, and verified digital certificate. Michael confirmed immediate enrollment readiness.",
      transcript: "Sonia: Good morning! Am I speaking with Michael?\nMichael: Yes, Michael here.\nSonia: Wonderful! This is Sonia calling from Inspire London College regarding your inquiry for the Level 3 Award in Education and Training. Do you have a quick 2 minutes to speak?\nMichael: Yes, I do.\nSonia: Fantastic! The Level 3 AET is an introductory teaching qualification regulated by Ofqual under Focus Awards. It covers 3 core units including roles, responsibilities, and assessment practices. Microteaching can be recorded from home. The course fee has a 25% discount with a £128 initial deposit. Would you like to go ahead with enrollment today?\nMichael: Yes, that sounds great. Please send me the link to complete my deposit."
    },
    {
      phoneNumber: "+44 7450 112233",
      customerName: "Robert Chen",
      courseInquired: "Level 3 Health & Social Care",
      status: "ANSWERED",
      direction: "OUTBOUND",
      disposition: "NOT_INTERESTED",
      leadScore: 20,
      durationSec: 42,
      summary: "Robert answered and stated he had already completed the training through his employer last week and does not need another course. Sonia politely thanked him for his time and marked the lead cold to prevent subsequent calls.",
      transcript: "Sonia: Good afternoon! Am I speaking with Robert?\nRobert: Yes, speaking.\nSonia: Hi Robert, this is Sonia calling from Inspire London College regarding your recent inquiry for Level 3 Health & Social Care. Do you have a quick 2 minutes to speak?\nRobert: Actually, I don't need it. My hospital just funded my certificate last week, so I'm already sorted.\nSonia: No problem at all, Robert! Congratulations on getting certified, and thank you so much for your time. Have a wonderful day ahead!\nRobert: Thanks, you too."
    }
  ];

  for (const c of outboundCalls) {
    await prisma.call.create({ data: c });
  }

  console.log("Seeded 4 outbound calls successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
