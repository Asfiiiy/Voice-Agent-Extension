import os
import re
import time
import difflib
import logging
import httpx
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
load_dotenv()

import redis_cache

logger = logging.getLogger("rag")
logger.setLevel(logging.INFO)

# Config
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
COLLECTION_NAME = "knowledge_base"
VECTOR_SIZE = 3072  # gemini-embedding-001 vector dimension
EMBEDDING_MODEL = "models/gemini-embedding-001"

# Initialize Qdrant Client
try:
    qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, timeout=5.0)
except Exception as e:
    logger.warning(f"Could not connect to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}: {e}")
    qdrant_client = None

_http_client = httpx.Client(timeout=5.0)


def get_embedding(text: str) -> List[float]:
    """Generates 3072-dim text embedding using Google Gemini gemini-embedding-001 API."""
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY missing for embedding call.")
        return [0.0] * VECTOR_SIZE

    url = f"https://generativelanguage.googleapis.com/v1beta/{EMBEDDING_MODEL}:embedContent?key={GOOGLE_API_KEY}"
    payload = {
        "model": EMBEDDING_MODEL,
        "content": {"parts": [{"text": text}]}
    }

    try:
        resp = _http_client.post(url, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            return data.get("embedding", {}).get("values", [0.0] * VECTOR_SIZE)
        else:
            logger.error(f"Embedding API error {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")

    return [0.0] * VECTOR_SIZE


# ==============================================================================
# INDEX CONTENT TABLE (Canonical Table of Contents for Ultra-Low Latency Lookup)
# ==============================================================================
INDEX_CONTENT_TABLE: List[Dict[str, Any]] = [
    # --- INSPIRE LONDON COLLEGE (ILC) ---
    {
        "id": 101,
        "title": "Inspire London College Overview & Accreditations",
        "slug": "ilc-overview-accreditations",
        "category": "overview",
        "keywords": ["inspire london college", "ilc", "overview", "about", "accreditation", "accreditations", "ukrlp", "othm", "qualifi", "rospa", "nocn", "focus awards", "icq", "armed forces covenant"],
        "summary": "Inspire London College is the UK's leading vocational distance learning provider with over 13 years of academic excellence, accredited by UKRLP, OTHM, Qualifi, RoSPA, NOCN, and Focus Awards.",
        "content": (
            "Inspire London College (inspirelondoncollege.co.uk) is the UK's leading specialist provider of distance learning "
            "and vocational education with over 13 years of academic excellence. Trusted by 65,705+ enrolled learners with 41,688+ certificates awarded "
            "across 65+ countries worldwide. Accredited and recognised by UKRLP (UK Register of Learning Providers), OTHM Qualifications, "
            "Qualifi Ltd, RoSPA Member, NOCN, Focus Awards, Skills for Care, and iCQ Awards. Inspire London College is also an official signatory "
            "of the UK Armed Forces Covenant, supporting veterans and military personnel in higher education."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 102,
        "title": "Phlebotomy Level 3 Practical Class-Based Training",
        "slug": "phlebotomy-practical-training",
        "category": "courses",
        "keywords": ["phlebotomy", "blood", "practical", "class", "classroom", "hands on", "live bloods", "placement", "350", "level 3 phlebotomy"],
        "summary": "Our Level 3 Phlebotomy course is a £350 special offer including classroom training, live bloods practical sessions, and a placement programme in London.",
        "content": (
            "Inspire London College offers the Level 3 Certificate in Phlebotomy (Part 1 and Part 2) class-based training for £350 special offer, "
            "which includes a Free Health & Safety Course. The training features mandatory in-person practical sessions including Live Bloods Practical "
            "Sessions and the Phlebotomist Placement Programme. It teaches the medical practice of drawing blood safely for clinical use and is open to "
            "both medical and non-medical individuals looking to enter the healthcare and pathology sectors."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 103,
        "title": "Phlebotomy Practical Attendance, Location & Requirements",
        "slug": "phlebotomy-location-requirements",
        "category": "courses",
        "keywords": ["phlebotomy location", "phlebotomy address", "southall", "phlebotomy attendance", "phlebotomy requirements", "blood test practical", "prerequisites"],
        "summary": "Phlebotomy practicals are held in person at our London facilities in Southall. Clinical materials are provided, and no prior medical background is required for Part 1.",
        "content": (
            "For the Level 3 Phlebotomy course, physical classroom attendance is mandatory for all lecture days and live bloods practical sessions. "
            "Training is conducted at our London training facilities in Southall. Clinical materials, safety equipment, and practical kits are provided. "
            "No prior medical qualifications or blood-taking experience are required to enrol in Part 1."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 104,
        "title": "Level 3 Diploma in Health and Social Care (Best Seller)",
        "slug": "level-3-health-and-social-care",
        "category": "courses",
        "keywords": ["health and social care", "level 3", "qualifi", "deposit", "75", "best seller", "assignments", "no exams"],
        "summary": "Our best-selling Qualifi Level 3 Diploma in Health and Social Care requires just a £75 deposit followed by 10 monthly payments of £45.40, with 100% online coursework and no exams.",
        "content": (
            "Inspire London College's best-selling qualification is the Qualifi Level 3 Diploma in Health and Social Care. "
            "Enrol with an initial deposit of just £75, followed by 10 easy monthly installments of £45.40/month. Course duration is 6 to 12 months. "
            "The assessment method is 100% assignment and report writing with no formal written exams. Awarded by Ofqual-regulated awarding body Qualifi Ltd."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 105,
        "title": "Regulated Health and Social Care Diplomas (Level 4, 5, 7)",
        "slug": "health-social-care-levels",
        "category": "qualifications",
        "keywords": ["level 4 health and social care", "level 5 health and social care", "level 7 health and social care", "dementia care", "first aid", "qualifi care"],
        "summary": "We offer Qualifi Health and Social Care pathways from Level 4 (£79 deposit) and Level 5 (£99 deposit) up to Level 7 (£400 deposit), plus Dementia Care and First Aid.",
        "content": (
            "Inspire London College provides comprehensive Ofqual-regulated Health & Social Care pathways: "
            "1. Qualifi Level 4 Diploma in Health and Social Care: £79 deposit, £55/month for 10 months (duration 6-12 months). "
            "2. Qualifi Level 5 Diploma in Health and Social Care: £99 deposit, £64.10/month for 10 months (duration 6-12 months). "
            "3. Qualifi Level 7 Diploma in Health and Social Care: £400 deposit, £70.50/month for 8 months (duration 6-12 months). "
            "4. iCQ Level 3 Certificate in Dementia Care (RQF): £99 initial deposit, £66.83/month for 60 months (duration 3 months). "
            "5. Focus Awards Level 3 Award in Emergency First Aid at Work: £65 full fee, 1-day course with portfolio of evidence."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 106,
        "title": "Regulated Business Management & Accounting Qualifications",
        "slug": "business-management-accounting",
        "category": "qualifications",
        "keywords": ["business management", "accounting", "finance", "level 4 business", "level 5 business", "level 7 business", "othm business"],
        "summary": "We provide OFQUAL-regulated qualifications in Business Management, Accounting, and Finance across Levels 3, 4, 5, and 7 with flexible installment plans.",
        "content": (
            "Inspire London College offers OFQUAL-regulated qualifications in Business, Leadership, and Finance: "
            "1. Qualifi Level 3 Diploma in Business Management: £200 initial deposit, £46.25/month for 8 months (duration 6-12 months). "
            "2. Qualifi Level 4 Diploma in Business Management: £250 initial deposit, £53.75/month for 8 months (duration 6-12 months). "
            "3. OTHM Level 5 Extended Diploma in Business Management: £350 initial deposit, £130.25/month for 8 months (duration 12-24 months). "
            "4. Level 7 Diploma in Business Development and Administration: 97% promotional discount (£10 sale price on CPD versions). "
            "5. Regulated qualifications also available in Business Law, Accounting & Finance, Cyber Security, Project Management, Risk Management, "
            "and Logistics & Supply Chain Management."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 107,
        "title": "Education and Training Awards (AET / PTLLS)",
        "slug": "aet-education-and-training",
        "category": "qualifications",
        "keywords": ["aet", "ptlls", "education and training", "teaching", "teacher training", "microteaching", "level 3 award in education and training"],
        "summary": "Our Level 3 Award in Education and Training (AET/PTLLS) costs a £30 deposit and £33.33/month for 6 months, including a 15-minute microteaching session.",
        "content": (
            "Teacher training and assessment qualifications at Inspire London College: "
            "1. Qualifi Level 3 Award in Education and Training (AET): £30 deposit, £33.33/month for 6 months (duration 1-3 months). Includes a 15-minute microteaching session and assignment reports. "
            "2. iCQ Level 3 Award in Education and Training: £30 deposit, £26.60/month for 6 months (duration 6-12 months). "
            "3. NOCN Level 3 Award in Education and Training: £30 deposit, £33.33/month for 6 months (duration 6-12 months)."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 108,
        "title": "450+ Online CPD Short Courses & Video Training",
        "slug": "cpd-short-courses",
        "category": "cpd",
        "keywords": ["cpd", "short courses", "video training", "moodle", "online courses", "self paced", "instant certificate"],
        "summary": "We offer 450+ accredited online short courses and video training on Moodle VLE with 24/7 self-paced access and instant digital certificates.",
        "content": (
            "Inspire London College offers 450+ accredited online short courses and video training in Accounting, Admin & PA, Business Management, "
            "Child Psychology, Construction Management, Customer Services, Business Skills, and Specialist Care Courses. "
            "Delivered 100% online through Moodle VLE LMS. Courses are self-paced with 24/7 access and instant digital certificates upon completion."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 109,
        "title": "Government Funded LDSS Courses for Adult Social Care",
        "slug": "ldss-government-funding",
        "category": "funding",
        "keywords": ["government funded", "funding", "ldss", "adult social care", "asc-wds", "free training", "nhsbsa"],
        "summary": "We provide 100% government-funded Level 2 to 5 training via the Learning and Development Support Scheme (LDSS) for eligible adult social care employers in England.",
        "content": (
            "Inspire London College provides 100% government-funded Level 2 to Level 5 training through the Learning and Development Support Scheme (LDSS) "
            "for adult social care employers in England with a completed ASC-WDS account. Eligible staff include non-regulated care workers, deputy managers, "
            "CQC-registered managers, and agency staff with a UK National Insurance number. Covers Adult Social Care Certificates, care diplomas, "
            "autism, dementia, medicine administration, and end-of-life care. Claims are employer-led and submitted directly via NHSBSA."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 110,
        "title": "Inspire London College 5-Step Enrolment & Onboarding",
        "slug": "enrolment-steps",
        "category": "admission",
        "keywords": ["how to enrol", "enrolment", "apply", "register", "onboarding", "steps", "login details", "moodle access"],
        "summary": "Enrolment is a simple 5-step online process: select your course, enrol in the basket, pay fee or deposit, and receive LMS login details within 24-48 hours.",
        "content": (
            "Enrolling at Inspire London College takes 5 simple steps: "
            "Step 1: Select your course from the catalogue. "
            "Step 2: Enrol online via the website basket. "
            "Step 3: Pay online securely via credit/debit card or deposit installment. "
            "Step 4: Receive welcome email with LMS login credentials within 24-48 hours, complete document verification and VARK learning test. "
            "Step 5: Study online at your own pace, submit assignments, and receive your accredited certificate upon completion."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 111,
        "title": "VLE Platform Access Duration & 3-Month Extension Policy",
        "slug": "vle-access-extension-policy",
        "category": "policies",
        "keywords": ["extension", "course extension", "vle access", "moodle duration", "12 months", "3 month extension", "30 pounds", "deadline"],
        "summary": "Students receive 12 months full access to Moodle VLE. If you need more time and have completed over 50% of the syllabus, a 3-month extension is available for a £30 fee.",
        "content": (
            "Learners receive 12 months full access to the Moodle VLE / LMS learning platform from the date of enrolment. "
            "If a learner cannot complete the course within 12 months but has finished more than 50% of the syllabus, they can apply for a "
            "3-month course extension for an administrative fee of £30. Inspire London College reserves the right to review extension requests."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 112,
        "title": "Assessment Methods, Grading, & Free Quiz Attempts",
        "slug": "assessment-grading-quizzes",
        "category": "assessment",
        "keywords": ["assessment", "grading", "assignments", "exams", "quiz attempts", "retakes", "pass mark", "no exams"],
        "summary": "All distance learning courses are 100% coursework and assignment based with zero formal exams, and quiz-based CPD courses include 3 attempts at no extra cost.",
        "content": (
            "All distance learning courses at Inspire London College are assessed through assignments, reports, and portfolio of evidence with no formal written exams. "
            "For quiz-based CPD courses, learners receive 2 attempts for the online multiple-choice final test, plus a 3rd attempt at no extra cost. "
            "In regulated qualifications, assignment resubmissions are fully guided by online tutor feedback with no hidden penalty fees."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 113,
        "title": "Certificate Delivery, Replacement & Verification Policy",
        "slug": "certificate-delivery-verification",
        "category": "certificates",
        "keywords": ["certificate", "hardcopy", "pdf", "delivery", "replacement certificate", "verification", "step ahead cpd"],
        "summary": "Upon completion, learners receive an instant digital PDF certificate, and official hardcopies can be dispatched worldwide. Online verification is available on our website.",
        "content": (
            "Upon course completion, learners can claim an accredited Certificate of Completion. "
            "Available as an instant digital PDF or an embossed hardcopy delivered by post. Certificates carry the Step Ahead CPD qualification stamp or "
            "the Ofqual-regulated awarding body seal (Qualifi, OTHM, NOCN, iCQ). Replacement certificates (PDF or hardcopy) can be requested through "
            "the admissions team by paying the replacement fee plus postage. Online certificate verification is supported on the college website."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 114,
        "title": "Inspire London College 14-Day Refund & Cancellation Policy",
        "slug": "refund-cancellation-policy",
        "category": "policies",
        "keywords": ["refund", "refund policy", "cancellation", "cancel", "money back", "cooling off", "14 days", "return", "refunds"],
        "summary": "We offer a 14-day cooling-off refund period from purchase if materials haven't been substantially accessed. After 14 days, course fees and deposits are non-refundable.",
        "content": (
            "Inspire London College provides a 14-day statutory cooling-off refund period from the date of purchase. "
            "Learners can request a full refund within 14 days if course materials have not been substantially accessed or completed. "
            "After the 14-day period has elapsed, course fees and initial deposits are strictly non-refundable."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 115,
        "title": "International Students & Non-UK Residents Admission",
        "slug": "international-students",
        "category": "admission",
        "keywords": ["international", "overseas", "non-uk", "foreign", "visa", "outside uk", "global learners"],
        "summary": "All distance learning courses are 100% online and fully open to international students across 65+ countries with no UK residency or student visa required.",
        "content": (
            "All online distance learning programmes at Inspire London College are open to international students globally without UK residency requirements. "
            "We have active learners from 65+ countries worldwide. Study 100% online from home with digital assignment submission and worldwide certificate dispatch."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 116,
        "title": "Inspire London College London Campus Address, Phone & Hours",
        "slug": "london-campus-address-hours",
        "category": "contact",
        "keywords": ["address", "location", "campus", "where are you", "office", "phone number", "contact", "southall", "opening hours", "fairlawn"],
        "summary": "Our London campus is located at First Floor, Fairlawn High Street, Southall, London, UB1 3HB. Admissions phone support operates Monday to Friday from 10:00 to 17:00 UK time.",
        "content": (
            "Inspire London College Contact Information: "
            "London Campus Address: First Floor, Fairlawn High Street, Southall, London, UB1 3HB, United Kingdom. "
            "Operations Phone Lines: +44 (0) 20 7101 9543 / +44 (0) 20 3983 2988. "
            "WhatsApp & Mobile Support: +44 (0) 79 8323 9430 / +44 (0) 20 7193 1649. "
            "Consultancy Phone Lines: +44 (0) 20 3983 7815 / +44 (0) 79 0204 2598. "
            "Email: info@inspirelondoncollege.co.uk. "
            "Support Hours: Monday to Friday from 10:00 AM to 5:00 PM (17:00) UK time. Closed on Saturday and Sunday."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 117,
        "title": "Corporate Staff Training & Workforce Upskilling",
        "slug": "corporate-training",
        "category": "overview",
        "keywords": ["corporate", "corporate training", "staff training", "workforce", "business training", "bulk enrollments", "employers"],
        "summary": "We provide accredited corporate training and staff upskilling for employers worldwide with 24/7 flexible online study, dedicated support, and bulk enrollment discounts.",
        "content": (
            "Inspire London College Corporate Training empowers businesses and employers worldwide to train staff and upskill their workforce with accredited, flexible online e-learning programs. "
            "Key Corporate Training Areas Offered: Health & Social Care, Health & Safety, Business Management & Leadership, Accounting & Finance, Education & Training (AET), Information Technology, Construction Management, and Child Psychology. "
            "Key Benefits for Employers: 24/7 flexible online study suitable for busy staff shift patterns, Ofqual-regulated qualifications and CPD accredited certificates, dedicated learner support, and massive discounts on bulk corporate enrollments."
        ),
        "tenant_id": "inspirelondoncollege"
    },
    {
        "id": 118,
        "title": "Payment Methods, Instalment Plans & Security",
        "slug": "payment-methods-security",
        "category": "admission",
        "keywords": ["how to pay", "payment methods", "credit card", "debit card", "installments", "instalment plans", "stripe", "secure payment"],
        "summary": "We accept all major credit and debit cards online, with secure flexible monthly instalment options starting with low deposits from £30 to £99.",
        "content": (
            "Payment Methods & Installments at Inspire London College: "
            "We accept all major Credit and Debit Cards (Visa, MasterCard, American Express), bank transfers, and PayPal. "
            "Flexible interest-free monthly installment plans are available for all regulated qualifications, starting with an initial deposit from £30 to £99. "
            "All payment transactions are 256-bit SSL encrypted and processed through verified payment gateways."
        ),
        "tenant_id": "inspirelondoncollege"
    },

    # --- UKPD ACADEMY (UKPDA) ---
    {
        "id": 201,
        "title": "UKPD Academy Overview, Accreditations & Mission",
        "slug": "ukpda-overview-accreditations",
        "category": "overview",
        "keywords": ["ukpd academy", "ukpda", "overview", "athe", "step ahead cpd", "qualifi", "focus awards"],
        "summary": "UKPD Academy is a premier UK provider of online CPD courses and regulated qualifications, accredited by ATHE, Step Ahead CPD, and Qualifi.",
        "content": (
            "UK Professional Development Academy (ukpdacademy.co.uk) is a premier UK provider of online CPD-accredited courses and regulated qualifications. "
            "Recognised ATHE Centre, accredited by Step Ahead CPD Qualifications, and partnering with Ofqual-regulated awarding bodies such as Qualifi Ltd and Focus Awards. "
            "Dedicated to affordable, high-quality, flexible learning for students across the UK and globally."
        ),
        "tenant_id": "ukpdacademy"
    },
    {
        "id": 202,
        "title": "UKPD Academy Promotional Offers, Buy 1 Get 1 & Promo Code",
        "slug": "ukpda-promotions-discounts",
        "category": "discounts",
        "keywords": ["discount", "promo code", "buy 1 get 1", "bogo", "ukpda2026", "xo student card", "sale", "promotions"],
        "summary": "UKPD Academy offers Buy 1 Get 1 Free on 500+ courses and an extra 30% off with promo code UKPDA2026, plus XO student discount cards.",
        "content": (
            "Special promotional offers at UKPD Academy: "
            "1. Buy 1 Get 1 Free (Buy More, Get More Free) across 500+ CPD-accredited online courses. "
            "2. Winter Sale Extra 30% OFF: Use promo code UKPDA2026 at checkout for an instant 30% discount on 550+ premium CPD courses. "
            "3. XO Student Discount Card: Registered students can apply for the XO card for national and online shopping discounts."
        ),
        "tenant_id": "ukpdacademy"
    },
    {
        "id": 203,
        "title": "UKPDA 550+ Course Catalog & Subject Categories",
        "slug": "ukpda-courses-catalog",
        "category": "courses",
        "keywords": ["ukpda courses", "catalog", "subjects", "faculties", "accounting", "cyber security", "early years", "child psychology"],
        "summary": "UKPD Academy offers 550+ courses across 10 faculties including Health & Social Care, Business, Accounting, Cyber Security, and Early Years Education.",
        "content": (
            "UKPD Academy features 550+ accredited online courses across 10+ core faculties: "
            "1. Accounting & Finance, 2. Admin, Secretarial & PA, 3. Business & Management, 4. Health & Social Care, "
            "5. Cyber Security, 6. Early Years Education, 7. Education & Training, 8. Personal & Professional Development, "
            "9. Health and Safety, 10. Beauty & Therapy, 11. Child Psychology. All courses are CPD-accredited and self-paced."
        ),
        "tenant_id": "ukpdacademy"
    },
    {
        "id": 204,
        "title": "UKPDA Top-Selling Regulated Qualifications & Pricing",
        "slug": "ukpda-regulated-pricing",
        "category": "qualifications",
        "keywords": ["ukpda qualifications", "ukpda pricing", "qualifi level 3 care deposit", "athe level 4 business"],
        "summary": "Top regulated qualifications at UKPDA include Qualifi Level 3 Health & Social Care (£69 deposit) and ATHE Level 4 Business (£200 deposit) with monthly plans.",
        "content": (
            "Popular Ofqual-regulated diplomas at UKPD Academy: "
            "1. Qualifi Level 3 Diploma in Health and Social Care: Enrol with an initial deposit of £69 (duration 6-12 months, 1,800+ learners enrolled). "
            "2. Qualifi Level 5 Diploma in Health and Social Care: Initial deposit £82. "
            "3. Qualifi Level 3 Award in Education and Training: Initial deposit £150. "
            "4. ATHE Level 4 Diploma in Business and Management: Initial deposit £200. "
            "Flexible monthly payment plans are available for all regulated qualifications."
        ),
        "tenant_id": "ukpdacademy"
    },
    {
        "id": 205,
        "title": "UKPDA Learning Benefits & Unlimited 1-on-1 Tutor Support",
        "slug": "ukpda-tutor-support-benefits",
        "category": "benefits",
        "keywords": ["tutor support", "1-on-1 tutor", "onlinetutor", "learning benefits", "free retakes", "fast track"],
        "summary": "Students receive 24/7 VLE access, unlimited 1-on-1 email tutor support, fast-track pathways, and free assignment retakes with no extra fees.",
        "content": (
            "Key benefits of studying with UKPD Academy: "
            "1. 100% online self-paced study with 24/7 access to Moodle VLE/LMS. "
            "2. Unlimited 1-on-1 tutor support via email at onlinetutor@ukpdacademy.co.uk. "
            "3. Fast-track pathways available for fast completion. "
            "4. Free re-takes for assignments with no extra charges. "
            "5. Final multiple-choice quiz tests include 2 attempts plus a 3rd attempt at no extra cost."
        ),
        "tenant_id": "ukpdacademy"
    },
    {
        "id": 206,
        "title": "UKPDA Enrolment Process, Platform Access & 3-Month Extension",
        "slug": "ukpda-enrolment-extension",
        "category": "admission",
        "keywords": ["ukpda enrolment", "ukpda extension", "12 months access", "48 hours login", "3 month extension 30"],
        "summary": "Enrol online and receive login details within 48 hours. Courses include 12 months access, with 3-month extensions available for £30.",
        "content": (
            "Enrolling at UKPD Academy: Courses can be purchased directly online via the cart. Login credentials and platform link are emailed within "
            "48 hours of purchase (excluding weekends). Students receive 12 months access to the VLE platform. If unable to finish within 12 months, "
            "a 3-month course extension can be applied for with a £30 administrative fee (provided over 50% of the course has been completed)."
        ),
        "tenant_id": "ukpdacademy"
    },
    {
        "id": 207,
        "title": "UKPDA Certificate Policy, Digital PDF & Hardcopy Delivery",
        "slug": "ukpda-certificates",
        "category": "certificates",
        "keywords": ["ukpda certificate", "ukpda hardcopy", "pdf certificate", "worldwide dispatch", "embossed certificate"],
        "summary": "Finishing a UKPDA course provides an instant PDF certificate, and official embossed hardcopies can be dispatched worldwide with postal tracking.",
        "content": (
            "Upon successfully finishing a course at UKPD Academy: "
            "1. Learners receive an instant digital PDF Certificate of Completion. "
            "2. An official embossed hardcopy certificate can be ordered and dispatched worldwide with postal tracking. "
            "3. Certificates are accredited by Step Ahead CPD Qualifications or awarded by Qualifi / ATHE. "
            "4. Replacement certificates (PDF or hardcopy) can be claimed through the admissions team."
        ),
        "tenant_id": "ukpdacademy"
    },
    {
        "id": 208,
        "title": "UKPDA International Student Admissions (65+ Countries)",
        "slug": "ukpda-international",
        "category": "admission",
        "keywords": ["ukpda international", "overseas students", "global admissions", "no visa required"],
        "summary": "UKPD Academy courses are open worldwide across 65+ countries with 100% online study on desktop, tablet, or smartphone and no visa requirements.",
        "content": (
            "UKPD Academy distance learning courses are open to international learners globally from any country. Over 65+ countries are represented. "
            "No UK residency or student visa required. Study anywhere, anytime on desktop, tablet, or smartphone."
        ),
        "tenant_id": "ukpdacademy"
    },
    {
        "id": 209,
        "title": "UKPD Academy Address, Contact Numbers, Email & Support Hours",
        "slug": "ukpda-contact-hours",
        "category": "contact",
        "keywords": ["ukpda contact", "ukpda address", "ukpda phone", "ukpda hours", "southall high street"],
        "summary": "UKPD Academy is located at Fairlawn High Street, Southall, London, UB1 3HB, with telephone support lines open Monday to Friday 8:00 AM to 8:00 PM EST.",
        "content": (
            "UK Professional Development Academy Contact Details: "
            "Address: Fairlawn, First Floor, High Street, Southall, London, UB1 3HB, United Kingdom. "
            "Telephone: +44 (0) 20 8432 9445 / +44 (0) 20 4542 4924. "
            "WhatsApp Support: +44 (0) 20 4542 4924. "
            "General Email: info@ukpdacademy.co.uk. "
            "Dedicated Tutor Support Email: onlinetutor@ukpdacademy.co.uk. "
            "Support Hours: Monday to Friday 8:00 AM to 8:00 PM EST, Saturday 9:00 AM to 5:00 PM EST. Closed on Sundays."
        ),
        "tenant_id": "ukpdacademy"
    },

    # --- COMPARISONS & POLICIES ---
    {
        "id": 301,
        "title": "Difference Between CPD Courses and Ofqual Qualifications",
        "slug": "cpd-vs-ofqual-difference",
        "category": "academics",
        "keywords": ["difference cpd ofqual", "cpd vs ofqual", "regulated vs non regulated", "rqf", "formal qualification", "credits"],
        "summary": "CPD courses focus on professional skills and career development points, while Ofqual-regulated qualifications (RQF) are nationally accredited and can lead to university degrees.",
        "content": (
            "Understanding the difference between course types: "
            "1. CPD Accredited Courses: Focus on professional development, practical workplace skills, and career enhancement. "
            "Accredited by independent bodies like Step Ahead CPD Qualifications and The CPD Certification Service. Non-regulated, meaning they do not count as formal degree credits, but provide valid CPD points for employment. "
            "2. Ofqual Regulated Qualifications: Listed on the official UK Regulated Qualifications Framework (RQF) and overseen by Ofqual in England. "
            "Awarded by recognised awarding organisations (Qualifi, OTHM, NOCN, ATHE). Level 3 to Level 7 qualifications can lead directly to university progression or formal professional licensing."
        ),
        "tenant_id": "default"
    },
    {
        "id": 302,
        "title": "Call Center Support Hours & General Return Policy",
        "slug": "call-center-hours-return",
        "category": "support",
        "keywords": ["support hours", "return policy", "call center hours", "opening times", "working days"],
        "summary": "Live voice support operates Monday to Friday from 10:00 to 17:00 UK time, and digital courses carry a 14-day refund policy from the purchase date.",
        "content": (
            "Support and Service Policy: "
            "Live voice and customer support operates Monday through Friday 8:00 AM to 8:00 PM EST, and Saturday 9:00 AM to 5:00 PM EST. "
            "For digital courses, a 14-day refund policy applies from purchase date. Unused materials or physical course packs can be returned within 30 days. "
            "Refunds are processed to the original payment method within 3 to 5 business days."
        ),
        "tenant_id": "default"
    }
]

# Backward compatibility alias
sample_kb = INDEX_CONTENT_TABLE

# ==============================================================================
# IN-MEMORY COMPILATION FOR SUB-MILLISECOND LOOKUP (< 0.5 MS LATENCY)
# ==============================================================================
_TITLE_INDEX: Dict[str, Dict[str, Any]] = {}
_SLUG_INDEX: Dict[str, Dict[str, Any]] = {}
_KEYWORD_INDEX: Dict[str, List[Dict[str, Any]]] = {}

def _build_in_memory_indexes():
    """Builds O(1) hash maps and keyword inverted indexes across the content table and courses catalog."""
    global _TITLE_INDEX, _SLUG_INDEX, _KEYWORD_INDEX
    _TITLE_INDEX.clear()
    _SLUG_INDEX.clear()
    _KEYWORD_INDEX.clear()

    # Load master index from courses_catalog.json if present
    cat_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "courses_catalog.json")
    if os.path.exists(cat_path):
        try:
            import json
            with open(cat_path, "r", encoding="utf-8") as f:
                cat_data = json.load(f)
            quals = cat_data.get("qualifications_by_level", {})
            
            lines = ["Official Regulated Qualifications Index arranged by RQF Level:"]
            for lvl in ["Level 1", "Level 2", "Level 3", "Level 4", "Level 5", "Level 6", "Level 7"]:
                lvl_items = quals.get(lvl, [])
                if lvl_items:
                    lines.append(f"\n--- {lvl} Qualifications ({len(lvl_items)} courses) ---")
                    for it in lvl_items[:5]:
                        dep = f", from {it['deposit']} deposit ({it['monthly']}/mo)" if it.get("deposit") else ""
                        lines.append(f"• {it['title']} ({it['awarding_body']}): Full {it['fee']}{dep}, Duration: {it['duration']}")
            
            qual_idx_item = {
                "id": 90001,
                "title": "Regulated Qualifications Index by Level",
                "slug": "qualifications-level-index",
                "category": "qualifications",
                "keywords": ["qualifications", "regulated qualifications", "rqf levels", "level 1", "level 2", "level 3", "level 4", "level 5", "level 6", "level 7", "othm qualifications", "qualifi qualifications"],
                "summary": "We offer accredited RQF regulated qualifications from Level 1 up to Level 7 with flexible installment plans from £75 deposit and 100% online coursework.",
                "content": "\n".join(lines),
                "tenant_id": "inspirelondoncollege"
            }
            if not any(it["id"] == 90001 for it in INDEX_CONTENT_TABLE):
                INDEX_CONTENT_TABLE.append(qual_idx_item)
                
            cpd_items = cat_data.get("cpd_courses", [])
            cpd_idx_item = {
                "id": 90002,
                "title": "CPD Accredited Courses Directory",
                "slug": "cpd-courses-directory",
                "category": "courses",
                "keywords": ["cpd", "cpd courses", "short courses", "cpd accredited", "training certificates", "10 pound courses", "step ahead cpd"],
                "summary": f"Inspire London College offers over {len(cpd_items)} CPD accredited online training courses with 24/7 LMS access and self-paced study.",
                "content": f"Master CPD Directory: {len(cpd_items)} CPD accredited courses available at promotional rates (typically £10 to £50) with 1 week to 12 months access and verified certificates.",
                "tenant_id": "inspirelondoncollege"
            }
            if not any(it["id"] == 90002 for it in INDEX_CONTENT_TABLE):
                INDEX_CONTENT_TABLE.append(cpd_idx_item)
        except Exception as e:
            logger.warning(f"Notice loading catalog into rag.py: {e}")

    for item in INDEX_CONTENT_TABLE:
        clean_title = item["title"].lower().strip()
        _TITLE_INDEX[clean_title] = item
        _SLUG_INDEX[item["slug"].lower().strip()] = item
        for kw in item.get("keywords", []):
            k_clean = kw.lower().strip()
            _KEYWORD_INDEX.setdefault(k_clean, []).append(item)

_build_in_memory_indexes()


def get_content_index_table() -> List[Dict[str, Any]]:
    """Returns the full table of contents index for inspection or catalog tools."""
    return [
        {
            "id": it["id"],
            "title": it["title"],
            "slug": it["slug"],
            "category": it["category"],
            "summary": it["summary"],
            "tenant_id": it["tenant_id"],
        }
        for it in INDEX_CONTENT_TABLE
    ]


def fast_lookup_page_content(query: str, tenant_id: Optional[str] = None) -> str:
    """
    Sub-millisecond content finder:
    0. Redis Atomic Lua Cache check (< 0.5 ms) with frequency/popularity increment
    1. Exact Title / Slug O(1) hash match (0.01ms)
    2. Inverted keyword index scoring (0.1ms)
    3. Fuzzy title similarity match (0.3ms)
    Returns clean, spoken-optimized verified facts without any network delay.
    """
    t0 = time.perf_counter()
    q = query.lower().strip()

    # 0. Check Redis atomic Lua cache first (sub-millisecond hit)
    try:
        cached = redis_cache.get_cached_faq(query)
        if cached and cached.get("found"):
            title = cached["title"]
            summary = cached["summary"]
            answer = cached["answer"]
            hits = cached.get("hits", 1)
            lat = cached.get("latency_ms", 0.0)
            return (
                f"[Verified Redis FAQ Cache: {title} | Frequency: {hits} calls | Latency: {lat:.2f}ms]\n"
                f"• Quick Summary: {summary}\n"
                f"• Details: {answer}"
            )
    except Exception:
        pass

    # Tenant filter helper
    def _tenant_ok(it: Dict[str, Any]) -> bool:
        if not tenant_id or tenant_id == "default":
            return True
        return it.get("tenant_id") in (tenant_id, "default")

    # 1. Exact title or slug match
    if q in _TITLE_INDEX and _tenant_ok(_TITLE_INDEX[q]):
        item = _TITLE_INDEX[q]
        lat = (time.perf_counter() - t0) * 1000
        try:
            redis_cache.cache_faq_answer(query, item["title"], item["summary"], item["content"], item["category"])
        except Exception:
            pass
        return (
            f"[Verified Page Index: {item['title']} | Fast Lookup: {lat:.2f}ms]\n"
            f"• Quick Summary: {item['summary']}\n"
            f"• Details: {item['content']}"
        )

    if q in _SLUG_INDEX and _tenant_ok(_SLUG_INDEX[q]):
        item = _SLUG_INDEX[q]
        lat = (time.perf_counter() - t0) * 1000
        try:
            redis_cache.cache_faq_answer(query, item["title"], item["summary"], item["content"], item["category"])
        except Exception:
            pass
        return (
            f"[Verified Page Index: {item['title']} | Fast Lookup: {lat:.2f}ms]\n"
            f"• Quick Summary: {item['summary']}\n"
            f"• Details: {item['content']}"
        )

    # 2. Tokenized inverted keyword index scoring
    scores: Dict[int, float] = {}
    tokens = [w for w in re.split(r'\W+', q) if len(w) > 2]

    for kw, items in _KEYWORD_INDEX.items():
        if kw == q:
            weight = 4.0
        elif kw in q:
            weight = 2.5
        elif any(t == kw for t in tokens):
            weight = 1.5
        else:
            continue

        for it in items:
            if _tenant_ok(it):
                scores[it["id"]] = scores.get(it["id"], 0.0) + weight

    # 3. Fuzzy title match & phrase overlap
    for title_str, it in _TITLE_INDEX.items():
        if not _tenant_ok(it):
            continue
        if all(t in title_str for t in tokens if len(t) > 3):
            scores[it["id"]] = scores.get(it["id"], 0.0) + 3.0
        ratio = difflib.SequenceMatcher(None, q, title_str).ratio()
        if ratio > 0.45:
            scores[it["id"]] = scores.get(it["id"], 0.0) + (ratio * 3.5)

    if scores:
        best_id = max(scores, key=scores.get)
        if scores[best_id] >= 1.5:
            matched_item = next((it for it in INDEX_CONTENT_TABLE if it["id"] == best_id), None)
            if matched_item:
                lat = (time.perf_counter() - t0) * 1000
                try:
                    redis_cache.cache_faq_answer(query, matched_item["title"], matched_item["summary"], matched_item["content"], matched_item["category"])
                except Exception:
                    pass
                return (
                    f"[Verified Page Index: {matched_item['title']} | Fast Lookup: {lat:.2f}ms]\n"
                    f"• Quick Summary: {matched_item['summary']}\n"
                    f"• Details: {matched_item['content']}"
                )

    # Fallback if fast index has no confident match: delegate to Qdrant semantic vector search
    return search_knowledge_base(query, tenant_id=tenant_id, top_k=2)


def ensure_payload_indexes():
    """Ensures Qdrant payload schema has indexes on title, slug, category, and keywords for fast filtered queries."""
    if not qdrant_client:
        return
    try:
        qdrant_client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="title",
            field_schema=models.TextIndexParams(
                type="text",
                tokenizer=models.TokenizerType.WORD,
                lowercase=True
            )
        )
    except Exception:
        pass

    try:
        qdrant_client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="category",
            field_schema=models.PayloadSchemaType.KEYWORD
        )
    except Exception:
        pass

    try:
        qdrant_client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="slug",
            field_schema=models.PayloadSchemaType.KEYWORD
        )
    except Exception:
        pass

    try:
        qdrant_client.create_payload_index(
            collection_name=COLLECTION_NAME,
            field_name="keywords",
            field_schema=models.PayloadSchemaType.KEYWORD
        )
    except Exception:
        pass


def init_knowledge_base():
    """Ensure Qdrant collection exists, indexes are created, and default knowledge base is seeded."""
    if not qdrant_client:
        logger.warning("Qdrant client unavailable, skipping collection initialization.")
        return

    try:
        collections = qdrant_client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)

        if exists:
            try:
                info = qdrant_client.get_collection(COLLECTION_NAME)
                curr_size = info.config.params.vectors.size
                if curr_size != VECTOR_SIZE:
                    logger.info(f"Recreating '{COLLECTION_NAME}' due to size mismatch: {curr_size} -> {VECTOR_SIZE}")
                    qdrant_client.delete_collection(COLLECTION_NAME)
                    exists = False
                elif getattr(info, 'points_count', 0) == 0:
                    logger.info(f"Collection '{COLLECTION_NAME}' is empty. Seeding knowledge base...")
                    seed_default_knowledge()
                else:
                    logger.info(f"Collection '{COLLECTION_NAME}' ready with {info.points_count} items.")
            except Exception as e:
                logger.warning(f"Failed to check collection info: {e}")

        if not exists:
            logger.info(f"Creating collection '{COLLECTION_NAME}'...")
            qdrant_client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=models.VectorParams(
                    size=VECTOR_SIZE,
                    distance=models.Distance.COSINE
                ),
            )
            seed_default_knowledge()

        ensure_payload_indexes()
    except Exception as e:
        logger.error(f"Error initializing Qdrant collection: {e}")


def seed_default_knowledge():
    """Seeds standard indexed FAQs and complete website data for Inspire London College & UKPD Academy into Qdrant."""
    points = []
    for item in INDEX_CONTENT_TABLE:
        embedding = get_embedding(item["content"])
        points.append(
            models.PointStruct(
                id=item["id"],
                vector=embedding,
                payload=item
            )
        )

    try:
        qdrant_client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
        logger.info(f"Successfully seeded {len(points)} website knowledge base articles into Qdrant.")
        ensure_payload_indexes()
    except Exception as e:
        logger.error(f"Failed to seed Qdrant knowledge base: {e}")


def search_knowledge_base(query: str, tenant_id: str = None, top_k: int = 3) -> str:
    """Performs semantic vector search on Qdrant and returns matching support facts."""
    if not qdrant_client:
        return "Knowledge base system is currently unavailable."

    try:
        query_vector = get_embedding(query)
        if all(v == 0.0 for v in query_vector):
            return "Unable to process query embedding."

        query_filter = None
        if tenant_id and tenant_id != "default":
            query_filter = models.Filter(
                must=[
                    models.FieldCondition(
                        key="tenant_id",
                        match=models.MatchValue(value=tenant_id)
                    )
                ]
            )

        response = qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            query=query_vector,
            limit=top_k,
            query_filter=query_filter
        )

        search_result = response.points

        if not search_result:
            return "No specific information found in the knowledge base for your inquiry."

        results_str = "Retrieved Knowledge Base Context:\n"
        for i, hit in enumerate(search_result, 1):
            title = hit.payload.get("title", "Article")
            summary = hit.payload.get("summary", "")
            content = hit.payload.get("content", "")
            if summary:
                results_str += f"{i}. [{title}]: {summary} (Details: {content})\n"
            else:
                results_str += f"{i}. [{title}]: {content}\n"

        return results_str

    except Exception as e:
        logger.error(f"Error searching knowledge base: {e}")
        return f"Error retrieving knowledge base details: {e}"
