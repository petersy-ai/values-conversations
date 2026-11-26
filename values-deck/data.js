/* Card content for the Values Deck.
 *
 * Value cards: names and definitions from the Personal Values Card Sort
 * (W. R. Miller, J. C'de Baca, D. B. Matthews & P. L. Wilbourne, University of
 * New Mexico, 2001). The PVCS is in the public domain and may be copied or
 * adapted without further permission. "Genuiness" is spelled correctly here.
 *
 * Each value card is tagged to Schwartz's refined theory of basic values
 * (Schwartz et al. 2012) and its four higher-order groups:
 *   OC = Openness to change, SE = Self-enhancement,
 *   CO = Conservation, ST = Self-transcendence.
 * The tags are this app's own mapping. The cards are not a validated
 * Schwartz measure; the circle view is a talking point only.
 *
 * Life-domain cards and discussion prompts are original wording, informed by
 * the content areas of PREPARE/ENRICH, FOCCUS, RELATE and the Valued Living
 * Questionnaire. No item text from those instruments is used.
 */
window.VD = window.VD || {};

VD.HO = {
  OC: { name: 'Openness to change', short: 'Openness' },
  SE: { name: 'Self-enhancement', short: 'Self-enhancement' },
  CO: { name: 'Conservation', short: 'Conservation' },
  ST: { name: 'Self-transcendence', short: 'Self-transcendence' }
};
// Circle order used by the radial chart.
VD.HO_ORDER = ['OC', 'SE', 'CO', 'ST'];

VD.VALUES = [
  // Self-enhancement
  { id: 'v01', name: 'Achievement', def: 'to have important accomplishments', schwartz: 'Achievement', ho: 'SE' },
  { id: 'v02', name: 'Fame', def: 'to be known and recognised', schwartz: 'Face / Power–resources', ho: 'SE' },
  { id: 'v03', name: 'Wealth', def: 'to have plenty of money', schwartz: 'Power–resources', ho: 'SE' },
  { id: 'v04', name: 'Authority', def: 'to be in charge of and responsible for others', schwartz: 'Power–dominance', ho: 'SE' },
  { id: 'v12', name: 'Comfort', def: 'to have a pleasant and comfortable life', schwartz: 'Hedonism', ho: 'SE' },
  // Openness to change
  { id: 'v05', name: 'Adventure', def: 'to have new and exciting experiences', schwartz: 'Stimulation', ho: 'OC' },
  { id: 'v06', name: 'Knowledge', def: 'to learn and contribute valuable knowledge', schwartz: 'Self-direction–thought', ho: 'OC' },
  { id: 'v07', name: 'Creativity', def: 'to have new and original ideas', schwartz: 'Self-direction–thought', ho: 'OC' },
  { id: 'v08', name: 'Autonomy', def: 'to be self-determined and independent', schwartz: 'Self-direction–action', ho: 'OC' },
  { id: 'v09', name: 'Non-conformity', def: 'to question or challenge authority and norms', schwartz: 'Self-direction–action', ho: 'OC' },
  { id: 'v10', name: 'Solitude', def: 'to have time and space where I can be apart from others', schwartz: 'Self-direction–action', ho: 'OC' },
  { id: 'v11', name: 'Fun', def: 'to play and have fun', schwartz: 'Hedonism', ho: 'OC' },
  { id: 'v13', name: 'Growth', def: 'to keep changing and growing', schwartz: 'Self-direction / Stimulation', ho: 'OC' },
  // Conservation
  { id: 'v14', name: 'Safety', def: 'to be safe and secure', schwartz: 'Security–personal', ho: 'CO' },
  { id: 'v15', name: 'Stability', def: 'to have a life that stays fairly consistent', schwartz: 'Security–personal', ho: 'CO' },
  { id: 'v16', name: 'Health', def: 'to be physically well and healthy', schwartz: 'Security–personal', ho: 'CO' },
  { id: 'v34', name: 'Order', def: 'to have a life that is well-ordered and organised', schwartz: 'Security / Conformity–rules', ho: 'CO' },
  { id: 'v17', name: 'Tradition', def: 'to follow respected patterns of the past', schwartz: 'Tradition', ho: 'CO' },
  { id: 'v18', name: "God's will", def: 'to seek and obey the will of God', schwartz: 'Tradition', ho: 'CO' },
  { id: 'v20', name: 'Courtesy', def: 'to be considerate and polite toward others', schwartz: 'Conformity–interpersonal', ho: 'CO' },
  { id: 'v21', name: 'Humility', def: 'to be modest and unassuming', schwartz: 'Humility', ho: 'CO' },
  // Self-transcendence
  { id: 'v22', name: 'Family', def: 'to have a happy, loving family', schwartz: 'Benevolence–caring', ho: 'ST' },
  { id: 'v23', name: 'Honesty', def: 'to be honest and truthful', schwartz: 'Benevolence–dependability', ho: 'ST' },
  { id: 'v24', name: 'Responsibility', def: 'to make and carry out responsible decisions', schwartz: 'Benevolence–dependability', ho: 'ST' },
  { id: 'v25', name: 'Commitment', def: 'to make enduring, meaningful commitments', schwartz: 'Benevolence–dependability', ho: 'ST' },
  { id: 'v35', name: 'Faithfulness', def: 'to be loyal and true in relationships', schwartz: 'Benevolence–dependability', ho: 'ST' },
  { id: 'v26', name: 'Caring', def: 'to take care of others', schwartz: 'Benevolence–caring', ho: 'ST' },
  { id: 'v36', name: 'Friendship', def: 'to have close, supportive friends', schwartz: 'Benevolence–caring', ho: 'ST' },
  { id: 'v27', name: 'Generosity', def: 'to give what I have to others', schwartz: 'Benevolence–caring', ho: 'ST' },
  { id: 'v28', name: 'Forgiveness', def: 'to be forgiving of others', schwartz: 'Benevolence', ho: 'ST' },
  { id: 'v29', name: 'Justice', def: 'to promote fair and equal treatment for all', schwartz: 'Universalism–concern', ho: 'ST' },
  { id: 'v30', name: 'Tolerance', def: 'to accept and respect those who differ from me', schwartz: 'Universalism–tolerance', ho: 'ST' },
  { id: 'v31', name: 'Ecology', def: 'to live in harmony with the environment', schwartz: 'Universalism–nature', ho: 'ST' },
  // Not a single Schwartz value
  { id: 'v19', name: 'Spirituality', def: 'to grow and mature spiritually', schwartz: 'none (spirituality)', ho: null },
  { id: 'v32', name: 'Genuineness', def: 'to act in a manner that is true to who I am', schwartz: 'none (authenticity)', ho: null },
  { id: 'v33', name: 'Intimacy', def: 'to share my innermost experiences with others', schwartz: 'none (closeness)', ho: null },
  { id: 'v37', name: 'Purpose', def: 'to have meaning and direction in my life', schwartz: 'none (meaning)', ho: null }
];

VD.IMPORTANCE = ['Not important', 'A little', 'Moderately', 'Very', 'Essential'];
VD.FLEX = { firm: 'Firm', some: 'Some room', open: 'Open' };

VD.DOMAINS = [
  { id: 'd01', name: 'Children', prompt: 'Whether, when and how many kids feature in my future',
    options: ['Yes, in the next few years', 'Yes, later on', 'Open or unsure', 'Probably not', 'No', 'I already have children'],
    sources: 'PREPARE/ENRICH children and parenting; FOCCUS parenting' },
  { id: 'd02', name: 'Faith and practice', prompt: 'The role religion or spirituality plays in my week and in a future home',
    options: ['Central to my daily life', 'Important, practised sometimes', 'Cultural or occasional', 'Spiritual, not religious', 'Not part of my life'],
    sources: 'ENRICH spiritual beliefs; FOCCUS religion and values, interfaith' },
  { id: 'd03', name: 'Money', prompt: 'How I save, spend, share and plan with money',
    options: ['Save and plan ahead', 'Balance saving and enjoying', 'Enjoy it now', 'Still sorting my finances out'],
    sources: 'PREPARE financial management; FOCCUS finances' },
  { id: 'd04', name: 'Where we live', prompt: 'City, suburb or country, and how near to whose family',
    options: ['Stay where I am', 'Open to elsewhere in Australia', 'Open to living overseas', 'Near my family matters most', 'Flexible'],
    sources: 'FOCCUS lifestyle expectations; RELATE cultural context' },
  { id: 'd05', name: 'Work and ambition', prompt: 'How much of my life goes to work, and whether I would move for it',
    options: ['Career is central', 'Important but balanced', 'Work to live', 'A big change is coming', 'Would relocate for work'],
    sources: 'FOCCUS dual careers; Valued Living Questionnaire work' },
  { id: 'd06', name: 'Extended family', prompt: 'How involved our families are, and what I owe mine',
    options: ['Very involved, frequent contact', 'Close but separate lives', 'Occasional contact', 'It is complicated', 'Caring duties ahead'],
    sources: 'FOCCUS extended family; RELATE family context' },
  { id: 'd07', name: 'Home and roles', prompt: 'How we would share chores, life admin and care',
    options: ['Share everything evenly', 'Split by strengths', 'Outsource where we can', 'More traditional roles', 'Not sure yet'],
    sources: 'PREPARE role relationship / equalitarian roles' },
  { id: 'd08', name: 'Social life and community', prompt: 'Friends, community, and time out versus time in',
    options: ['Big social life', 'Mix of out and home', 'Mostly home with a few close friends', 'A community or scene is central'],
    sources: 'PREPARE leisure; FOCCUS friends and interests; VLQ friendship, community' },
  { id: 'd09', name: 'Health and habits', prompt: 'Exercise, food, alcohol, sleep and routines',
    options: ['Structured and disciplined', 'Mostly healthy, flexible', 'Relaxed', 'Changing things at the moment'],
    sources: 'Valued Living Questionnaire physical wellbeing' },
  { id: 'd10', name: 'Adventure and travel', prompt: 'How much novelty, travel and risk I want in our life',
    options: ['Lots, often', 'Regular trips', 'Occasional', 'I prefer a home base'],
    sources: 'PREPARE leisure; Schwartz stimulation' },
  { id: 'd11', name: 'Politics and causes', prompt: 'How my political and social views shape how I live',
    options: ['Actively involved', 'Strong views, less active', 'Moderate views', 'Not very political'],
    sources: 'Watson et al. 2004; Leikas et al. 2018' },
  { id: 'd12', name: 'Culture, language and heritage', prompt: 'Traditions, languages and celebrations I want to keep',
    options: ['Central to who I am', 'Important for family and celebrations', 'A few traditions', 'Not a big part of my life'],
    sources: 'RELATE cultural context; Schwartz cross-cultural work' },
  { id: 'd13', name: 'Affection and intimacy', prompt: 'Physical affection and sex: how central it is to me',
    options: ['Very central', 'Important', 'Moderate', 'Still working it out'],
    sources: 'PREPARE/ENRICH sexual relationship; Joel et al. 2020', optional: true }
];

VD.RULES = [
  'Curiosity over verdicts. We are here to understand each other, not to score the relationship.',
  'Either of us can pass on any card or question, at any time, with no explanation needed.',
  'No compatibility score. The app does not calculate one, and we will not make one up.',
  'What is said here stays between us unless we both agree otherwise.',
  'Anything shared with a psychologist is the choice of the person who sees them.'
];

// Discussion prompts, grouped by reveal round. Original wording.
VD.PROMPTS = {
  warmup: [
    'Which card was easiest to place, and which was hardest?',
    'Which value would your 18-year-old self have ranked top?',
    'Which value did your family or culture hand you that you have kept, and which have you let go?'
  ],
  shared: [
    'What does this value look like on an ordinary weekday for you?',
    'When did you last feel this value being honoured?',
    'Is there a way we already live this value together?',
    'Do we mean the same thing by this word?'
  ],
  predict: [
    'What made me guess this about you, and what does that say about what you show early on?',
    'What do you wish people noticed sooner about what you value?',
    'Where did I see myself in you?',
    'Was there a value you were nervous to rank highly? (Pass is fine.)'
  ],
  distinct: [
    'What would someone need to understand about you to see why this matters so much?',
    "What's a story from your life behind this value?",
    'When this value is not met, what do you feel first?',
    "What's the smallest everyday version of this value I could support?",
    'Where does my value help yours, and where might they rub?'
  ],
  domains: [
    'What does your ideal version of this look like five years out? What would be good enough?',
    'Is this position about a deeper dream, a fear, or a practical constraint?',
    'Where did your view on this come from: family, culture, faith or experience?',
    'What would need to be true for you to feel flexible here?',
    'Which of these feels urgent to understand soon, and which can unfold over months?'
  ],
  dreams: [
    "What's the hope underneath your position?",
    'Is there a history or a story connected to this for you?',
    'What would it mean to you if this never happened?',
    'What part of my position can you understand, even if you would choose differently?'
  ],
  circle: [
    'Does this shape match how you see yourself?',
    'Where do our shapes differ, and how might that show up in an ordinary week?'
  ],
  closing: [
    'What did you learn about me today that you did not know?',
    'What did it feel like to be asked these questions?',
    "What's one thing you would like us to come back to, and when?",
    'Is there anything you would like to take to a psychologist, or keep just between us?'
  ]
};

VD.SOURCES = [
  "Miller, W. R., C'de Baca, J., Matthews, D. B., & Wilbourne, P. L. (2001). Personal Values Card Sort. University of New Mexico. Public domain.",
  'Schwartz, S. H., et al. (2012). Refining the theory of basic individual values. Journal of Personality and Social Psychology, 103(4), 663–688.',
  'Schwartz, S. H., & Cieciuch, J. (2022). Measuring the refined theory of individual values in 49 cultural groups. Assessment, 29(5).',
  'Lee, J. A., Sneddon, J. N., Daly, T. M., Schwartz, S. H., Soutar, G. N., & Louviere, J. J. (2019). Testing and extending Schwartz refined value theory using a best–worst scaling approach. Assessment, 26(2), 166–180.',
  'Luo, S., & Klohnen, E. C. (2005). Assortative mating and marital quality in newlyweds. Journal of Personality and Social Psychology, 88(2), 304–326.',
  'Gaunt, R. (2006). Couple similarity and marital satisfaction: Are similar spouses happier? Journal of Personality, 74(5), 1401–1420.',
  'Leikas, S., Ilmarinen, V.-J., Verkasalo, M., Vartiainen, H.-L., & Lönnqvist, J.-E. (2018). Relationship satisfaction and similarity of personality traits, personal values, and attitudes. Personality and Individual Differences, 123, 191–198.',
  'Montoya, R. M., Horton, R. S., & Kirchner, J. (2008). Is actual similarity necessary for attraction? A meta-analysis. Journal of Social and Personal Relationships, 25(6), 889–922.',
  'Murray, S. L., Holmes, J. G., Bellavia, G., Griffin, D. W., & Dolderman, D. (2002). Kindred spirits? The benefits of egocentrism in close relationships. Journal of Personality and Social Psychology, 82(4), 563–581.',
  'Kenny, D. A., & Acitelli, L. K. (2001). Accuracy and bias in the perception of the partner in a close relationship. Journal of Personality and Social Psychology, 80(3), 439–448.',
  'Joel, S., Eastwick, P. W., et al. (2020). Machine learning uncovers the most robust self-report predictors of relationship quality across 43 longitudinal couples studies. PNAS, 117(32), 19061–19071.',
  'Aron, A., Melinat, E., Aron, E. N., Vallone, R. D., & Bator, R. J. (1997). The experimental generation of interpersonal closeness. Personality and Social Psychology Bulletin, 23(4), 363–377.',
  'Busby, D. M., Holman, T. B., & Taniguchi, N. (2001). RELATE: Relationship evaluation of the individual, family, cultural, and couple contexts. Family Relations, 50(4), 308–316.',
  'Fowers, B. J., & Olson, D. H. (1986). Predicting marital success with PREPARE: A predictive validity study. Journal of Marital and Family Therapy, 12(4), 403–413.',
  'Wilson, K. G., Sandoz, E. K., Kitchens, J., & Roberts, M. (2010). The Valued Living Questionnaire. The Psychological Record, 60(2), 249–272.',
  'Gottman Institute. Research FAQs and blog material on perpetual problems and Dreams Within Conflict (practitioner-reported).'
];
