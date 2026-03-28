/**
 * Real academic standards database for Unbound.
 *
 * Contains actual standard codes from:
 *   - Common Core State Standards (CCSS) Math — grades 5-8
 *   - Common Core State Standards (CCSS) ELA-Literacy — grades 5-8
 *   - Next Generation Science Standards (NGSS) — middle school (6-8)
 *
 * Also provides state framework mapping and a lookup function
 * to find relevant standards for a given lesson.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StandardRef {
  code: string;
  description: string;
}

interface StateFramework {
  mathFramework: "CCSS" | "TEKS" | "SOL" | "CCSS-modified";
  elaFramework: "CCSS" | "TEKS" | "SOL" | "CCSS-modified";
  scienceFramework: "NGSS" | "state-specific";
  note?: string;
}

// ─── Common Core Math (CCSS.MATH) — Grades 5-8 ─────────────────────────────

const CCSS_MATH: Record<number, StandardRef[]> = {
  // ── Grade 5 ──────────────────────────────────────────────────────────────
  5: [
    // Operations & Algebraic Thinking (5.OA)
    { code: "5.OA.A.1", description: "Use parentheses, brackets, or braces in numerical expressions, and evaluate expressions with these symbols." },
    { code: "5.OA.A.2", description: "Write simple expressions that record calculations with numbers, and interpret numerical expressions without evaluating them." },
    { code: "5.OA.B.3", description: "Generate two numerical patterns using two given rules. Identify apparent relationships between corresponding terms." },

    // Number & Operations in Base Ten (5.NBT)
    { code: "5.NBT.A.1", description: "Recognize that in a multi-digit number, a digit in one place represents 10 times as much as it represents in the place to its right and 1/10 of what it represents in the place to its left." },
    { code: "5.NBT.A.3", description: "Read, write, and compare decimals to thousandths." },
    { code: "5.NBT.B.5", description: "Fluently multiply multi-digit whole numbers using the standard algorithm." },
    { code: "5.NBT.B.7", description: "Add, subtract, multiply, and divide decimals to hundredths using concrete models or drawings and strategies based on place value." },

    // Number & Operations - Fractions (5.NF)
    { code: "5.NF.A.1", description: "Add and subtract fractions with unlike denominators (including mixed numbers) by replacing given fractions with equivalent fractions." },
    { code: "5.NF.A.2", description: "Solve word problems involving addition and subtraction of fractions referring to the same whole." },
    { code: "5.NF.B.4", description: "Apply and extend previous understandings of multiplication to multiply a fraction or whole number by a fraction." },
    { code: "5.NF.B.6", description: "Solve real-world problems involving multiplication of fractions and mixed numbers." },

    // Measurement & Data (5.MD)
    { code: "5.MD.A.1", description: "Convert among different-sized standard measurement units within a given measurement system." },
    { code: "5.MD.C.3", description: "Recognize volume as an attribute of solid figures and understand concepts of volume measurement." },
    { code: "5.MD.C.5", description: "Relate volume to the operations of multiplication and addition and solve real-world problems involving volume." },

    // Geometry (5.G)
    { code: "5.G.A.1", description: "Use a pair of perpendicular number lines (axes) to define a coordinate system. Graph points in the first quadrant." },
    { code: "5.G.A.2", description: "Represent real-world and mathematical problems by graphing points in the first quadrant of the coordinate plane." },
    { code: "5.G.B.3", description: "Understand that attributes belonging to a category of two-dimensional figures also belong to all subcategories of that category." },
  ],

  // ── Grade 6 ──────────────────────────────────────────────────────────────
  6: [
    // Ratios & Proportional Relationships (6.RP)
    { code: "6.RP.A.1", description: "Understand the concept of a ratio and use ratio language to describe a ratio relationship between two quantities." },
    { code: "6.RP.A.2", description: "Understand the concept of a unit rate a/b associated with a ratio a:b with b not equal to 0, and use rate language." },
    { code: "6.RP.A.3", description: "Use ratio and rate reasoning to solve real-world and mathematical problems." },

    // The Number System (6.NS)
    { code: "6.NS.A.1", description: "Interpret and compute quotients of fractions, and solve word problems involving division of fractions by fractions." },
    { code: "6.NS.B.3", description: "Fluently add, subtract, multiply, and divide multi-digit decimals using the standard algorithm for each operation." },
    { code: "6.NS.C.5", description: "Understand that positive and negative numbers are used together to describe quantities having opposite directions or values." },
    { code: "6.NS.C.6", description: "Understand a rational number as a point on the number line." },

    // Expressions & Equations (6.EE)
    { code: "6.EE.A.1", description: "Write and evaluate numerical expressions involving whole-number exponents." },
    { code: "6.EE.A.2", description: "Write, read, and evaluate expressions in which letters stand for numbers." },
    { code: "6.EE.B.5", description: "Understand solving an equation or inequality as a process of answering a question." },
    { code: "6.EE.B.7", description: "Solve real-world and mathematical problems by writing and solving equations of the form x + p = q and px = q." },

    // Geometry (6.G)
    { code: "6.G.A.1", description: "Find the area of right triangles, other triangles, special quadrilaterals, and polygons by composing into rectangles or decomposing into triangles." },
    { code: "6.G.A.2", description: "Find the volume of a right rectangular prism with fractional edge lengths." },
    { code: "6.G.A.4", description: "Represent three-dimensional figures using nets made up of rectangles and triangles." },

    // Statistics & Probability (6.SP)
    { code: "6.SP.A.1", description: "Recognize a statistical question as one that anticipates variability in the data related to the question and accounts for it in the answers." },
    { code: "6.SP.A.2", description: "Understand that a set of data collected to answer a statistical question has a distribution which can be described by its center, spread, and overall shape." },
    { code: "6.SP.B.5", description: "Summarize numerical data sets in relation to their context." },
  ],

  // ── Grade 7 ──────────────────────────────────────────────────────────────
  7: [
    // Ratios & Proportional Relationships (7.RP)
    { code: "7.RP.A.1", description: "Compute unit rates associated with ratios of fractions, including ratios of lengths, areas, and other quantities measured in like or different units." },
    { code: "7.RP.A.2", description: "Recognize and represent proportional relationships between quantities." },
    { code: "7.RP.A.3", description: "Use proportional relationships to solve multistep ratio and percent problems." },

    // The Number System (7.NS)
    { code: "7.NS.A.1", description: "Apply and extend previous understandings of addition and subtraction to add and subtract rational numbers." },
    { code: "7.NS.A.2", description: "Apply and extend previous understandings of multiplication and division and of fractions to multiply and divide rational numbers." },
    { code: "7.NS.A.3", description: "Solve real-world and mathematical problems involving the four operations with rational numbers." },

    // Expressions & Equations (7.EE)
    { code: "7.EE.A.1", description: "Apply properties of operations as strategies to add, subtract, factor, and expand linear expressions with rational coefficients." },
    { code: "7.EE.A.2", description: "Understand that rewriting an expression in different forms in a problem context can shed light on the problem." },
    { code: "7.EE.B.3", description: "Solve multi-step real-life and mathematical problems posed with positive and negative rational numbers in any form." },
    { code: "7.EE.B.4", description: "Use variables to represent quantities in a real-world or mathematical problem, and construct simple equations and inequalities to solve problems." },

    // Geometry (7.G)
    { code: "7.G.A.1", description: "Solve problems involving scale drawings of geometric figures, including computing actual lengths and areas from a scale drawing." },
    { code: "7.G.A.2", description: "Draw geometric shapes with given conditions. Focus on constructing triangles from three measures of angles or sides." },
    { code: "7.G.B.4", description: "Know the formulas for the area and circumference of a circle and use them to solve problems." },
    { code: "7.G.B.6", description: "Solve real-world and mathematical problems involving area, volume, and surface area of two- and three-dimensional objects." },

    // Statistics & Probability (7.SP)
    { code: "7.SP.A.1", description: "Understand that statistics can be used to gain information about a population by examining a sample of the population." },
    { code: "7.SP.A.2", description: "Use data from a random sample to draw inferences about a population with an unknown characteristic of interest." },
    { code: "7.SP.C.5", description: "Understand that the probability of a chance event is a number between 0 and 1 that expresses the likelihood of the event occurring." },
    { code: "7.SP.C.7", description: "Develop a probability model and use it to find probabilities of events." },
  ],

  // ── Grade 8 ──────────────────────────────────────────────────────────────
  8: [
    // The Number System (8.NS)
    { code: "8.NS.A.1", description: "Know that numbers that are not rational are called irrational. Understand informally that every number has a decimal expansion." },
    { code: "8.NS.A.2", description: "Use rational approximations of irrational numbers to compare the size of irrational numbers." },

    // Expressions & Equations (8.EE)
    { code: "8.EE.A.1", description: "Know and apply the properties of integer exponents to generate equivalent numerical expressions." },
    { code: "8.EE.A.2", description: "Use square root and cube root symbols to represent solutions to equations of the form x^2 = p and x^3 = p." },
    { code: "8.EE.B.5", description: "Graph proportional relationships, interpreting the unit rate as the slope of the graph." },
    { code: "8.EE.B.6", description: "Use similar triangles to explain why the slope m is the same between any two distinct points on a non-vertical line in the coordinate plane." },
    { code: "8.EE.C.7", description: "Solve linear equations in one variable." },
    { code: "8.EE.C.8", description: "Analyze and solve pairs of simultaneous linear equations." },

    // Functions (8.F)
    { code: "8.F.A.1", description: "Understand that a function is a rule that assigns to each input exactly one output." },
    { code: "8.F.A.2", description: "Compare properties of two functions each represented in a different way (algebraically, graphically, numerically in tables, or by verbal descriptions)." },
    { code: "8.F.A.3", description: "Interpret the equation y = mx + b as defining a linear function whose graph is a straight line." },
    { code: "8.F.B.4", description: "Construct a function to model a linear relationship between two quantities." },
    { code: "8.F.B.5", description: "Describe qualitatively the functional relationship between two quantities by analyzing a graph." },

    // Geometry (8.G)
    { code: "8.G.A.1", description: "Verify experimentally the properties of rotations, reflections, and translations." },
    { code: "8.G.A.5", description: "Use informal arguments to establish facts about the angle sum and exterior angle of triangles." },
    { code: "8.G.B.6", description: "Explain a proof of the Pythagorean Theorem and its converse." },
    { code: "8.G.B.7", description: "Apply the Pythagorean Theorem to determine unknown side lengths in right triangles in real-world and mathematical problems." },
    { code: "8.G.B.8", description: "Apply the Pythagorean Theorem to find the distance between two points in a coordinate system." },

    // Statistics & Probability (8.SP)
    { code: "8.SP.A.1", description: "Construct and interpret scatter plots for bivariate measurement data to investigate patterns of association between two quantities." },
    { code: "8.SP.A.2", description: "Know that straight lines are widely used to model relationships between two quantitative variables." },
    { code: "8.SP.A.3", description: "Use the equation of a linear model to solve problems in the context of bivariate measurement data." },
  ],
};

// ─── Common Core ELA-Literacy (CCSS.ELA-LITERACY) — Grades 5-8 ─────────────

const CCSS_ELA: Record<number, StandardRef[]> = {
  // ── Grade 5 ──────────────────────────────────────────────────────────────
  5: [
    // Reading: Literature (RL)
    { code: "RL.5.1", description: "Quote accurately from a text and explain what the text says explicitly and when drawing inferences from the text." },
    { code: "RL.5.2", description: "Determine a theme of a story, drama, or poem from details in the text, including how characters respond to challenges." },
    { code: "RL.5.4", description: "Determine the meaning of words and phrases as they are used in a text, including figurative language such as metaphors and similes." },

    // Reading: Informational Text (RI)
    { code: "RI.5.1", description: "Quote accurately from a text and explain what the text says explicitly and when drawing inferences from the text." },
    { code: "RI.5.2", description: "Determine two or more main ideas of a text and explain how they are supported by key details; provide a summary of the text." },
    { code: "RI.5.8", description: "Explain how an author uses reasons and evidence to support particular points in a text." },

    // Writing (W)
    { code: "W.5.1", description: "Write opinion pieces on topics or texts, supporting a point of view with reasons and information." },
    { code: "W.5.2", description: "Write informative/explanatory texts to examine a topic and convey ideas and information clearly." },
    { code: "W.5.3", description: "Write narratives to develop real or imagined experiences or events using effective technique, descriptive details, and clear event sequences." },

    // Speaking & Listening (SL)
    { code: "SL.5.1", description: "Engage effectively in a range of collaborative discussions with diverse partners on grade 5 topics and texts." },
    { code: "SL.5.4", description: "Report on a topic or text or present an opinion, sequencing ideas logically and using appropriate facts and relevant, descriptive details." },

    // Language (L)
    { code: "L.5.1", description: "Demonstrate command of the conventions of standard English grammar and usage when writing or speaking." },
    { code: "L.5.4", description: "Determine or clarify the meaning of unknown and multiple-meaning words and phrases based on grade 5 reading and content." },
  ],

  // ── Grade 6 ──────────────────────────────────────────────────────────────
  6: [
    // Reading: Literature (RL)
    { code: "RL.6.1", description: "Cite textual evidence to support analysis of what the text says explicitly as well as inferences drawn from the text." },
    { code: "RL.6.2", description: "Determine a theme or central idea of a text and how it is conveyed through particular details; provide a summary." },
    { code: "RL.6.3", description: "Describe how a particular story's or drama's plot unfolds in a series of episodes as well as how the characters respond or change." },

    // Reading: Informational Text (RI)
    { code: "RI.6.1", description: "Cite textual evidence to support analysis of what the text says explicitly as well as inferences drawn from the text." },
    { code: "RI.6.2", description: "Determine a central idea of a text and how it is conveyed through particular details; provide a summary distinct from personal opinions." },

    // Writing (W)
    { code: "W.6.1", description: "Write arguments to support claims with clear reasons and relevant evidence." },
    { code: "W.6.2", description: "Write informative/explanatory texts to examine a topic and convey ideas, concepts, and information through the selection and organization of relevant content." },
    { code: "W.6.3", description: "Write narratives to develop real or imagined experiences or events using effective technique, relevant descriptive details, and well-structured event sequences." },

    // Speaking & Listening (SL)
    { code: "SL.6.1", description: "Engage effectively in a range of collaborative discussions with diverse partners on grade 6 topics, texts, and issues." },
    { code: "SL.6.4", description: "Present claims and findings, sequencing ideas logically and using pertinent descriptions, facts, and details to accentuate main ideas or themes." },

    // Language (L)
    { code: "L.6.1", description: "Demonstrate command of the conventions of standard English grammar and usage when writing or speaking." },
    { code: "L.6.4", description: "Determine or clarify the meaning of unknown and multiple-meaning words and phrases based on grade 6 reading and content." },
  ],

  // ── Grade 7 ──────────────────────────────────────────────────────────────
  7: [
    // Reading: Literature (RL)
    { code: "RL.7.1", description: "Cite several pieces of textual evidence to support analysis of what the text says explicitly as well as inferences drawn from the text." },
    { code: "RL.7.2", description: "Determine a theme or central idea of a text and analyze its development over the course of the text." },
    { code: "RL.7.3", description: "Analyze how particular elements of a story or drama interact (e.g., how setting shapes the characters or plot)." },

    // Reading: Informational Text (RI)
    { code: "RI.7.1", description: "Cite several pieces of textual evidence to support analysis of what the text says explicitly as well as inferences drawn from the text." },
    { code: "RI.7.2", description: "Determine two or more central ideas in a text and analyze their development over the course of the text." },

    // Writing (W)
    { code: "W.7.1", description: "Write arguments to support claims with clear reasons and relevant evidence." },
    { code: "W.7.2", description: "Write informative/explanatory texts to examine a topic and convey ideas, concepts, and information through the selection and organization of relevant content." },

    // Speaking & Listening (SL)
    { code: "SL.7.1", description: "Engage effectively in a range of collaborative discussions with diverse partners on grade 7 topics, texts, and issues." },
    { code: "SL.7.4", description: "Present claims and findings, emphasizing salient points in a focused, coherent manner with pertinent descriptions, facts, details, and examples." },

    // Language (L)
    { code: "L.7.1", description: "Demonstrate command of the conventions of standard English grammar and usage when writing or speaking." },
    { code: "L.7.4", description: "Determine or clarify the meaning of unknown and multiple-meaning words and phrases based on grade 7 reading and content." },
  ],

  // ── Grade 8 ──────────────────────────────────────────────────────────────
  8: [
    // Reading: Literature (RL)
    { code: "RL.8.1", description: "Cite the textual evidence that most strongly supports an analysis of what the text says explicitly as well as inferences drawn from the text." },
    { code: "RL.8.2", description: "Determine a theme or central idea of a text and analyze its development over the course of the text, including its relationship to the characters, setting, and plot." },

    // Reading: Informational Text (RI)
    { code: "RI.8.1", description: "Cite the textual evidence that most strongly supports an analysis of what the text says explicitly as well as inferences drawn from the text." },
    { code: "RI.8.2", description: "Determine a central idea of a text and analyze its development over the course of the text, including its relationship to supporting ideas." },
    { code: "RI.8.8", description: "Delineate and evaluate the argument and specific claims in a text, assessing whether the reasoning is sound and the evidence is relevant and sufficient." },

    // Writing (W)
    { code: "W.8.1", description: "Write arguments to support claims with clear reasons and relevant evidence." },
    { code: "W.8.2", description: "Write informative/explanatory texts to examine a topic and convey ideas, concepts, and information through the selection and organization of relevant content." },

    // Speaking & Listening (SL)
    { code: "SL.8.1", description: "Engage effectively in a range of collaborative discussions with diverse partners on grade 8 topics, texts, and issues." },
    { code: "SL.8.4", description: "Present claims and findings, emphasizing salient points in a focused, coherent manner with relevant evidence, sound valid reasoning, and well-chosen details." },

    // Language (L)
    { code: "L.8.1", description: "Demonstrate command of the conventions of standard English grammar and usage when writing or speaking." },
    { code: "L.8.4", description: "Determine or clarify the meaning of unknown and multiple-meaning words and phrases based on grade 8 reading and content." },
  ],
};

// ─── NGSS Science — Middle School (6-8) ─────────────────────────────────────

const NGSS_MS: StandardRef[] = [
  // Physical Science: PS1 - Matter and Its Interactions
  { code: "MS-PS1-1", description: "Develop models to describe the atomic composition of simple molecules and extended structures." },
  { code: "MS-PS1-2", description: "Analyze and interpret data on the properties of substances before and after the substances interact to determine if a chemical reaction has occurred." },

  // Physical Science: PS2 - Motion and Stability: Forces and Interactions
  { code: "MS-PS2-1", description: "Apply Newton's Third Law to design a solution to a problem involving the motion of two colliding objects." },
  { code: "MS-PS2-2", description: "Plan an investigation to provide evidence that the change in an object's motion depends on the sum of the forces acting on the object and the mass of the object." },

  // Physical Science: PS3 - Energy
  { code: "MS-PS3-1", description: "Construct and interpret graphical displays of data to describe the relationships of kinetic energy to the mass of an object and to the speed of an object." },
  { code: "MS-PS3-3", description: "Apply scientific principles to design, construct, and test a device that either minimizes or maximizes thermal energy transfer." },

  // Physical Science: PS4 - Waves and Their Applications
  { code: "MS-PS4-1", description: "Use mathematical representations to describe a simple model for waves that includes how the amplitude of a wave is related to the energy in a wave." },
  { code: "MS-PS4-2", description: "Develop and use a model to describe that waves are reflected, absorbed, or transmitted through various materials." },

  // Life Science: LS1 - From Molecules to Organisms: Structures and Processes
  { code: "MS-LS1-1", description: "Conduct an investigation to provide evidence that living things are made of cells; either one cell or many different numbers and types of cells." },
  { code: "MS-LS1-2", description: "Develop and use a model to describe the function of a cell as a whole and ways the parts of cells contribute to the function." },

  // Life Science: LS2 - Ecosystems: Interactions, Energy, and Dynamics
  { code: "MS-LS2-1", description: "Analyze and interpret data to provide evidence for the effects of resource availability on organisms and populations of organisms in an ecosystem." },
  { code: "MS-LS2-2", description: "Construct an explanation that predicts patterns of interactions among organisms across multiple ecosystems." },

  // Life Science: LS3 - Heredity: Inheritance and Variation of Traits
  { code: "MS-LS3-1", description: "Develop and use a model to describe why structural changes to genes (mutations) located on chromosomes may affect proteins and may result in harmful, beneficial, or neutral effects to the structure and function of the organism." },
  { code: "MS-LS3-2", description: "Develop and use a model to describe why asexual reproduction results in offspring with identical genetic information and sexual reproduction results in offspring with genetic variation." },

  // Life Science: LS4 - Biological Evolution: Unity and Diversity
  { code: "MS-LS4-1", description: "Analyze and interpret data for patterns in the fossil record that document the existence, diversity, extinction, and change of life forms throughout the history of life on Earth." },
  { code: "MS-LS4-2", description: "Apply scientific ideas to construct an explanation for the anatomical similarities and differences among modern organisms and between modern and fossil organisms." },

  // Earth Science: ESS1 - Earth's Place in the Universe
  { code: "MS-ESS1-1", description: "Develop and use a model of the Earth-sun-moon system to describe the cyclic patterns of lunar phases, eclipses of the sun and moon, and seasons." },
  { code: "MS-ESS1-4", description: "Construct a scientific explanation based on evidence from rock strata for how the geologic time scale is used to organize Earth's 4.6-billion-year-old history." },

  // Earth Science: ESS2 - Earth's Systems
  { code: "MS-ESS2-1", description: "Develop a model to describe the cycling of Earth's materials and the flow of energy that drives this process." },
  { code: "MS-ESS2-2", description: "Construct an explanation based on evidence for how geoscience processes have changed Earth's surface at varying time and spatial scales." },

  // Earth Science: ESS3 - Earth and Human Activity
  { code: "MS-ESS3-3", description: "Apply scientific principles to design a method for monitoring and minimizing a human impact on the environment." },
  { code: "MS-ESS3-5", description: "Ask questions to clarify evidence of the factors that have caused the rise in global temperatures over the past century." },
];

// ─── State Framework Mapping ────────────────────────────────────────────────

export function getStateFramework(state: string): StateFramework {
  const normalized = state.trim();

  if (normalized === "Texas") {
    return {
      mathFramework: "TEKS",
      elaFramework: "TEKS",
      scienceFramework: "state-specific",
      note: "Texas uses its own standards framework (TEKS). Standards cited are approximate TEKS alignments based on Common Core equivalents.",
    };
  }

  if (normalized === "Virginia") {
    return {
      mathFramework: "SOL",
      elaFramework: "SOL",
      scienceFramework: "state-specific",
      note: "Virginia uses its own standards framework (SOL). Standards cited are approximate SOL alignments based on Common Core equivalents.",
    };
  }

  // Minnesota adopted CCSS for ELA but not Math
  if (normalized === "Minnesota") {
    return {
      mathFramework: "CCSS-modified",
      elaFramework: "CCSS",
      scienceFramework: "NGSS",
      note: "Minnesota uses its own math standards closely aligned with CCSS. ELA standards follow CCSS.",
    };
  }

  // All other states (41+ states adopted CCSS)
  return {
    mathFramework: "CCSS",
    elaFramework: "CCSS",
    scienceFramework: "NGSS",
  };
}

// ─── Standards Lookup ───────────────────────────────────────────────────────

type Subject = "Math" | "Language Arts" | "Science" | "History" | "Other";

interface StandardsResult {
  standards: StandardRef[];
  framework: string;
  note?: string;
}

/**
 * Returns 2-4 relevant standards for a given state, grade, subject, and optional topic.
 * For History/Other, returns an empty array since those standards vary heavily by state.
 */
export function getStandardsForLesson(
  state: string,
  grade: number,
  subject: string,
  topic?: string
): StandardsResult {
  const framework = getStateFramework(state);

  // Normalize subject to our known types
  const normalizedSubject = normalizeSubject(subject);

  if (normalizedSubject === "History" || normalizedSubject === "Other") {
    return {
      standards: [],
      framework: "varies",
      note: "History and social studies standards vary significantly by state and are not included in the built-in database.",
    };
  }

  if (normalizedSubject === "Math") {
    return getMathStandards(grade, framework, topic);
  }

  if (normalizedSubject === "Language Arts") {
    return getElaStandards(grade, framework, topic);
  }

  if (normalizedSubject === "Science") {
    return getScienceStandards(grade, framework, topic);
  }

  return { standards: [], framework: "unknown" };
}

function normalizeSubject(subject: string): Subject {
  const lower = subject.toLowerCase();
  if (lower.includes("math")) return "Math";
  if (lower.includes("language") || lower.includes("reading") || lower.includes("ela") || lower.includes("writing") || lower.includes("english")) return "Language Arts";
  if (lower.includes("science")) return "Science";
  if (lower.includes("history") || lower.includes("social")) return "History";
  return "Other";
}

function getMathStandards(grade: number, framework: StateFramework, topic?: string): StandardsResult {
  // Clamp to our supported range
  const effectiveGrade = Math.max(5, Math.min(8, grade));
  const allStandards = CCSS_MATH[effectiveGrade] ?? [];

  const frameworkLabel = framework.mathFramework === "CCSS"
    ? "Common Core (CCSS)"
    : framework.mathFramework === "TEKS"
    ? "TEKS (Texas)"
    : framework.mathFramework === "SOL"
    ? "SOL (Virginia)"
    : "CCSS-aligned";

  // If a topic is provided, try to find relevant standards by keyword matching
  const selected = topic
    ? filterByTopic(allStandards, topic, 4)
    : pickRepresentative(allStandards, 3);

  return {
    standards: selected,
    framework: frameworkLabel,
    note: framework.note,
  };
}

function getElaStandards(grade: number, framework: StateFramework, topic?: string): StandardsResult {
  const effectiveGrade = Math.max(5, Math.min(8, grade));
  const allStandards = CCSS_ELA[effectiveGrade] ?? [];

  const frameworkLabel = framework.elaFramework === "CCSS"
    ? "Common Core (CCSS)"
    : framework.elaFramework === "TEKS"
    ? "TEKS (Texas)"
    : framework.elaFramework === "SOL"
    ? "SOL (Virginia)"
    : "CCSS-aligned";

  const selected = topic
    ? filterByTopic(allStandards, topic, 3)
    : pickRepresentative(allStandards, 3);

  return {
    standards: selected,
    framework: frameworkLabel,
    note: framework.note,
  };
}

function getScienceStandards(grade: number, framework: StateFramework, topic?: string): StandardsResult {
  // NGSS middle school standards apply to grades 6-8
  // For grade 5, we still return them as they're the closest available
  const frameworkLabel = framework.scienceFramework === "NGSS"
    ? "Next Generation Science Standards (NGSS)"
    : "State-specific (NGSS-aligned)";

  const selected = topic
    ? filterByTopic(NGSS_MS, topic, 3)
    : pickRepresentative(NGSS_MS, 3);

  return {
    standards: selected,
    framework: frameworkLabel,
    note: framework.note,
  };
}

/**
 * Filter standards by matching topic keywords against the description.
 * Falls back to representative picks if no matches found.
 */
function filterByTopic(standards: StandardRef[], topic: string, count: number): StandardRef[] {
  const keywords = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const scored = standards.map((s) => {
    const desc = s.description.toLowerCase();
    const code = s.code.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (desc.includes(kw)) score += 1;
      if (code.includes(kw)) score += 2;
    }
    return { standard: s, score };
  });

  const matches = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => s.standard);

  return matches.length > 0 ? matches : pickRepresentative(standards, count);
}

/**
 * Pick a representative sample across different domains within a grade.
 * Distributes picks across different code prefixes to cover breadth.
 */
function pickRepresentative(standards: StandardRef[], count: number): StandardRef[] {
  if (standards.length <= count) return [...standards];

  // Group by domain prefix (e.g., "6.RP", "RL.6", "MS-PS1")
  const groups = new Map<string, StandardRef[]>();
  for (const s of standards) {
    const prefix = getDomainPrefix(s.code);
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(s);
  }

  // Round-robin pick one from each group
  const result: StandardRef[] = [];
  const groupKeys = Array.from(groups.keys());
  let groupIdx = 0;
  while (result.length < count && result.length < standards.length) {
    const key = groupKeys[groupIdx % groupKeys.length];
    const group = groups.get(key)!;
    const picked = group.shift();
    if (picked) {
      result.push(picked);
    }
    if (group.length === 0) {
      groupKeys.splice(groupIdx % groupKeys.length, 1);
      if (groupKeys.length === 0) break;
    } else {
      groupIdx++;
    }
  }

  return result;
}

function getDomainPrefix(code: string): string {
  // "6.RP.A.1" -> "6.RP"
  // "RL.5.1" -> "RL"
  // "MS-PS1-1" -> "MS-PS1"
  if (code.startsWith("MS-")) {
    const parts = code.split("-");
    return parts.slice(0, 2).join("-");
  }
  if (/^\d/.test(code)) {
    // Math: "6.RP.A.1" -> "6.RP"
    const parts = code.split(".");
    return parts.slice(0, 2).join(".");
  }
  // ELA: "RL.5.1" -> "RL"
  return code.split(".")[0];
}
