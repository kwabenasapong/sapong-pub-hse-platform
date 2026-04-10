/**
 * Seed: creates the Graceway Fountain Ministries client,
 * Dr. Kusi-Boadum as author, and the 40-book programme skeleton.
 * Run with: npx ts-node prisma/seed.ts
 */
import "dotenv/config";
import { PrismaClient, Translation, SizeCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const BOOKS: Array<{
  number: number;
  title: string;
  translation: Translation;
  referenceAuthor: string;
  sizeCategory: SizeCategory;
  targetWordCountMin: number;
  targetWordCountMax: number;
}> = [
  { number: 1,  title: "GO — The Believer's Mandate to Reach the Lost",           translation: "KJV",    referenceAuthor: "Oyedepo",              sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 2,  title: "SOULS — The Currency of the Kingdom",                     translation: "KJV",    referenceAuthor: "Oyedepo + Ashimolowo", sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 3,  title: "THE KINGDOM — Living Under God's Royal Rule",             translation: "PASSION",referenceAuthor: "Munroe",               sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 4,  title: "FAITH: THE MASTER KEY — What It Is and How It Works",     translation: "KJV",    referenceAuthor: "Oyedepo",              sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 5,  title: "FAITH IN ACTION — From Belief to Breakthrough",           translation: "KJV",    referenceAuthor: "Oyedepo",              sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 6,  title: "THE SCHOOL OF PRAYER — Back to the Basics",               translation: "KJV",    referenceAuthor: "Oyedepo",              sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 7,  title: "THE ENTERPRISE OF PRAYER — Advanced School of Prayer",    translation: "KJV",    referenceAuthor: "Oyedepo",              sizeCategory: "MEDIUM_FULL", targetWordCountMin: 1500, targetWordCountMax: 2200 },
  { number: 8,  title: "THE FASTED LIFE — The Power of Denial and Devotion",      translation: "NLT",    referenceAuthor: "Ashimolowo",           sizeCategory: "SHORT",       targetWordCountMin: 800,  targetWordCountMax: 1500 },
  { number: 9,  title: "LIFTING HOLY HANDS — The Power of Praise and Worship",    translation: "KJV",    referenceAuthor: "Oyedepo",              sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 10, title: "THE TESTIMONY LIFE — Your Story Is a Weapon",             translation: "NLT",    referenceAuthor: "Adeyemi",              sizeCategory: "SHORT",       targetWordCountMin: 800,  targetWordCountMax: 1500 },
  { number: 11, title: "THE HAMMER AND THE FIRE — The Power of God's Word",       translation: "KJV",    referenceAuthor: "Oyedepo",              sizeCategory: "MEDIUM_FULL", targetWordCountMin: 1500, targetWordCountMax: 2200 },
  { number: 12, title: "WHAT YOU SAY IS WHAT YOU GET — The Power of Confession",  translation: "KJV",    referenceAuthor: "Oyedepo",              sizeCategory: "SHORT",       targetWordCountMin: 800,  targetWordCountMax: 1500 },
  { number: 13, title: "THE COVENANT — Understanding God's System of Blessing",   translation: "KJV",    referenceAuthor: "Ashimolowo",           sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 14, title: "THE COVENANT OF PROVISION — Tithing, Offerings, and Honour", translation: "KJV", referenceAuthor: "Ashimolowo",          sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 15, title: "THE MIRACLE SEED — Sowing Your Way Into the Harvest",     translation: "KJV",    referenceAuthor: "Ashimolowo",           sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 16, title: "KEYS TO SUPERNATURAL FINANCIAL BLESSINGS",                translation: "KJV",    referenceAuthor: "Ashimolowo",           sizeCategory: "MEDIUM_FULL", targetWordCountMin: 1500, targetWordCountMax: 2200 },
  { number: 17, title: "THE X FACTOR — 21 Days to Uncovering What God Hid Inside You", translation: "PASSION", referenceAuthor: "Adeyemi + Munroe", sizeCategory: "FULL",    targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 18, title: "SHAPED FOR THIS — Gifts, Talents, and the Mission God Gave You", translation: "PASSION", referenceAuthor: "Adeyemi",      sizeCategory: "MEDIUM_FULL", targetWordCountMin: 1500, targetWordCountMax: 2200 },
  { number: 19, title: "THE KING'S SEARCH — How to Find What God Has Hidden for You", translation: "PASSION", referenceAuthor: "Munroe",           sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 20, title: "THE MAKING OF A MINISTER — God's Blueprint for Those He Sends", translation: "NLT", referenceAuthor: "Munroe",            sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 21, title: "SCHOOL OF THE MINISTRY — Seven Foundations Every Minister Must Know", translation: "NLT", referenceAuthor: "Munroe",      sizeCategory: "MEDIUM_FULL", targetWordCountMin: 1500, targetWordCountMax: 2200 },
  { number: 22, title: "SET ME ON FIRE — Mastering the Flesh and Building Intimacy with Jesus", translation: "NLT", referenceAuthor: "Munroe",   sizeCategory: "MEDIUM_FULL", targetWordCountMin: 1500, targetWordCountMax: 2200 },
  { number: 23, title: "THE THIRD PERSON — Walking with the Holy Spirit",          translation: "NLT",    referenceAuthor: "Adeyemi",              sizeCategory: "MEDIUM",      targetWordCountMin: 1200, targetWordCountMax: 2000 },
  { number: 24, title: "THE EXCHANGE — What the Cross Cost and What It Bought for You", translation: "NLT", referenceAuthor: "Ashimolowo",        sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 25, title: "THE TABLE — What Happens When You Take Communion",         translation: "NLT",    referenceAuthor: "Ashimolowo",           sizeCategory: "MEDIUM",      targetWordCountMin: 1200, targetWordCountMax: 2000 },
  { number: 26, title: "THE GOD WHO HEALS — Divine Health and Healing as Your Covenant Right", translation: "NLT", referenceAuthor: "Ashimolowo", sizeCategory: "MEDIUM",    targetWordCountMin: 1200, targetWordCountMax: 2000 },
  { number: 27, title: "KNOW YOUR ENEMY — Satan, Darkness, and the Believer's Authority", translation: "KJV", referenceAuthor: "Oyedepo",         sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 28, title: "BREAKING INVISIBLE BARRIERS — Pulling Down Altars That Block Your Destiny", translation: "KJV", referenceAuthor: "Oyedepo", sizeCategory: "FULL",   targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 29, title: "THE LOVE THAT WOULD NOT LET GO — Understanding the Love of God", translation: "PASSION", referenceAuthor: "Adeyemi",      sizeCategory: "MEDIUM_FULL", targetWordCountMin: 1500, targetWordCountMax: 2200 },
  { number: 30, title: "HOLY — The Treasure Most Believers Have Abandoned",        translation: "KJV",    referenceAuthor: "Oyedepo",              sizeCategory: "MEDIUM",      targetWordCountMin: 1200, targetWordCountMax: 2000 },
  { number: 31, title: "GROWING UP — The Believer's Journey from Milk to Meat",   translation: "NLT",    referenceAuthor: "Adeyemi",              sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 32, title: "THE SERVANT KING — The Glory of Serving God Faithfully",  translation: "NLT",    referenceAuthor: "Munroe",               sizeCategory: "MEDIUM_FULL", targetWordCountMin: 1500, targetWordCountMax: 2200 },
  { number: 33, title: "DOMINION — Walking in the Supernatural Power of God",     translation: "KJV",    referenceAuthor: "Oyedepo",              sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 34, title: "THE REALM OF ALL POSSIBILITIES — Entering Where Nothing Is Impossible", translation: "KJV", referenceAuthor: "Oyedepo",  sizeCategory: "SHORT",       targetWordCountMin: 800,  targetWordCountMax: 1500 },
  { number: 35, title: "THE NAME ABOVE ALL NAMES — The Power in the Name of Jesus", translation: "KJV",  referenceAuthor: "Oyedepo",              sizeCategory: "SHORT",       targetWordCountMin: 800,  targetWordCountMax: 1500 },
  { number: 36, title: "WISDOM: THE KEY TO GREATNESS — Kingdom Intelligence for Every Area of Life", translation: "PASSION", referenceAuthor: "Munroe", sizeCategory: "FULL", targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 37, title: "KINGDOM STRATEGIES — Tactics for Victorious Living",      translation: "PASSION",referenceAuthor: "Munroe",               sizeCategory: "MEDIUM_FULL", targetWordCountMin: 1500, targetWordCountMax: 2200 },
  { number: 38, title: "THE FAMILY GOD DESIGNED — Blueprint for Marriage, Roles, and the Home", translation: "NLT", referenceAuthor: "Adeyemi",   sizeCategory: "FULL",        targetWordCountMin: 1800, targetWordCountMax: 2500 },
  { number: 39, title: "THE CHURCH — What It Is, What It Must Do, and Who It Is Called to Be", translation: "NLT", referenceAuthor: "Munroe",      sizeCategory: "MEDIUM",      targetWordCountMin: 1200, targetWordCountMax: 2000 },
  { number: 40, title: "BLESSED — The Beatitudes and the Secret to Kingdom Life", translation: "NLT",    referenceAuthor: "Adeyemi",              sizeCategory: "SHORT",       targetWordCountMin: 800,  targetWordCountMax: 1500 },
];

const WORKFLOW_STEPS = [
  { stepNumber: 1, stepName: "Intake" },
  { stepNumber: 2, stepName: "Analysis Report" },
  { stepNumber: 3, stepName: "Chapter Outline" },
  { stepNumber: 4, stepName: "Chapter Drafts" },
  { stepNumber: 5, stepName: "Front & Back Matter" },
];

async function main() {
  console.log("🌱  Seeding Sapong Publishing House Platform…");

  // Ministry
  const ministry = await prisma.ministry.upsert({
    where: { slug: "graceway-fountain" },
    update: {},
    create: {
      name: "Graceway Fountain Ministries",
      slug: "graceway-fountain",
      logoUrl: null,
    },
  });
  console.log(`   ✅  Ministry: ${ministry.name}`);

  // Author
  const AUTHOR_VOICE = {
    tone: [
      "Bold and declarative",
      "Pastoral and personal",
      "Theologically grounded",
      "Culturally rooted",
      "Direct when necessary",
    ],
    style: "Heavy Scripture anchoring with multiple cross-references. No hedging. Repetition used for emphasis — edit into one powerful statement, never remove entirely.",
    keyThemes: ["Soul winning", "Faith", "Prayer", "Covenant", "Dominion", "Ministry"],
    illustrationStyle: "Personal stories from banking career, family life in Ghana, hosting people, ministry experiences at Graceway Fountain Ministries",
  };
  const AUTHOR_CULTURE = {
    background: "Former banker · Managing Director, PrecisionWorks Engineering Ltd · Previously Republic Investments Ltd · President, Apostolic Revival Network · Doctoral fellow of AIPA · Advisory boards incl. Chamber of Small-Scale Mining Ghana",
    nationality: "Ghanaian",
    markers: ["Ghana cedis", "Tema branch", "Walewale, northern Ghana"],
    ministry: "Graceway Fountain Ministries, Accra, Ghana",
  };
  const author = await prisma.author.upsert({
    where: { id: "author-kwame-seed" },
    update: { voiceProfile: AUTHOR_VOICE, culturalContext: AUTHOR_CULTURE },
    create: {
      id: "author-kwame-seed",
      ministryId: ministry.id,
      name: "Dr. Kusi-Boadum Kwame",
      credentials: "DTh, DPA (Hon. Causa), MBA Finance, BSc Maths, CPA, CMP",
      voiceProfile: AUTHOR_VOICE,
      culturalContext: AUTHOR_CULTURE,
      bioText:
        "Rev. Dr. Kwame Kusi-Boadum is the Founder and Senior Pastor of Graceway Fountain Ministries, Ghana. He holds a DTh, DPA (Hon. Causa), MBA Finance, BSc Mathematics, CPA, and CMP. He serves as Managing Director of PrecisionWorks Engineering Ltd, is President of the Apostolic Revival Network, a Doctoral Fellow of AIPA, and sits on several advisory boards including the Chamber of Small-Scale Mining Ghana. He is married to Lady Pastor Rose Kusi-Boadum, and they have three children.",
    },
  });
  console.log(`   ✅  Author: ${author.name}`);

  // Programme
  const PROGRAMME_MASTER_INSTRUCTIONS = {
    authorTitle: "Founder and Senior Pastor",
    neverUseTitle: "Head Pastor",
    placeCorrections: [
      { wrong: "Taifa",   correct: "Tema branch" },
      { wrong: "Walwali", correct: "Walewale, northern Ghana" },
    ],
    ministryContacts: {
      address:   "Accra, Ghana",
      website:   "https://gracewayfountain.org",
      email:     "info@gracewayfountain.org",
      phone:     "(+233) 0241654472",
      facebook:  "https://www.facebook.com/gwfgh",
      instagram: "https://www.instagram.com/gracewayfountainministries",
      youtube:   "https://youtube.com/@gracewayfountainministries",
      tiktok:    "https://www.tiktok.com/@dr.kusiboadum",
    },
    standingCorrections: [
      "Use 'Prayer' not 'Prayer of Activation' throughout",
      "Never refer to the ministry as 'this church' — always 'Graceway Fountain Ministries'",
      "Author title is always 'Founder and Senior Pastor' — never 'Head Pastor'",
    ],
    familyContext: "Married to Lady Pastor Rose Kusi-Boadum; three children",
    professionalContext: "Managing Director of PrecisionWorks Engineering Ltd; previously Republic Investments Ltd; President of the Apostolic Revival Network; Doctoral Fellow of AIPA; sits on advisory boards including the Chamber of Small-Scale Mining Ghana",
  };
  const programme = await prisma.publishingProgramme.upsert({
    where: { id: "prog-graceway-40-seed" },
    update: { masterInstructions: PROGRAMME_MASTER_INSTRUCTIONS },
    create: {
      id: "prog-graceway-40-seed",
      ministryId: ministry.id,
      authorId: author.id,
      title: "Graceway 40-Book Publishing Programme",
      defaultTranslation: "KJV",
      defaultReferenceAuthor: "Oyedepo",
      status: "ACTIVE",
      masterInstructions: PROGRAMME_MASTER_INSTRUCTIONS,
    },
  });
  console.log(`   ✅  Programme: ${programme.title}`);

  // Books + workflow steps
  let bookCount = 0;
  for (const b of BOOKS) {
    const book = await prisma.book.upsert({
      where: { programmeId_number: { programmeId: programme.id, number: b.number } },
      update: {},
      create: {
        programmeId: programme.id,
        authorId: author.id,
        number: b.number,
        title: b.title,
        translation: b.translation,
        referenceAuthor: b.referenceAuthor,
        sizeCategory: b.sizeCategory,
        status: "NOT_STARTED",
        targetWordCountMin: b.targetWordCountMin,
        targetWordCountMax: b.targetWordCountMax,
      },
    });

    for (const step of WORKFLOW_STEPS) {
      await prisma.workflowStep.upsert({
        where: { bookId_stepNumber: { bookId: book.id, stepNumber: step.stepNumber } },
        update: {},
        create: {
          bookId: book.id,
          stepNumber: step.stepNumber,
          stepName: step.stepName,
          status: "PENDING",
        },
      });
    }
    bookCount++;
  }
  console.log(`   ✅  Books seeded: ${bookCount} (each with 5 workflow steps)`);
  // ── Reference authors ─────────────────────────────────────────────────────
  const REF_AUTHORS = ["Oyedepo", "Adeyemi", "Munroe", "Ashimolowo"];
  for (const name of REF_AUTHORS) {
    await prisma.referenceAuthor.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`   ✅  Reference authors seeded: ${REF_AUTHORS.join(", ")}`);

  // ── Default platform config ───────────────────────────────────────────────
  const DEFAULT_CONFIG = [
    { key: "anthropicModel",    value: "claude-sonnet-4-6" },
    { key: "exportFont",        value: "Georgia" },
    { key: "exportPageSize",    value: "letter" },
    { key: "exchangeRateGHS",   value: "15.5" },
    { key: "usageLogRetention", value: "12" },
  ];
  for (const cfg of DEFAULT_CONFIG) {
    await prisma.platformConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg,
    });
  }
  console.log("   ✅  Default platform config seeded");
  console.log("\n🎉  Seed complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
