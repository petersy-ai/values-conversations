/* Content for Enough of Both: a conversation guide about security and novelty.
 *
 * All wording is original. Methods are adapted from published research and
 * practitioner material (see SOURCES and the About screen); no program text,
 * item wording or trademarked material is reproduced.
 */
window.EB = window.EB || {};

// Money and Planning come first: they are the most concrete near-term topics.
EB.DOMAINS = [
  { id: 'money', name: 'Money' },
  { id: 'planning', name: 'Planning' },
  { id: 'time', name: 'Time' },
  { id: 'risk', name: 'Risk' },
  { id: 'home', name: 'Home' },
  { id: 'travel', name: 'Travel' },
  { id: 'work', name: 'Work' },
  { id: 'health', name: 'Health and habits' },
  { id: 'custom', name: 'Our own cards' }
];

// pole: S = security-leaning, N = novelty-leaning. Not shown while rating.
EB.CARDS = [
  { id: 'M1', domain: 'money', pole: 'S', text: 'A savings buffer I could live on for a few months.', short: 'A few months’ savings buffer' },
  { id: 'M2', domain: 'money', pole: 'S', text: 'Knowing roughly what we will each spend on big events or trips before booking.', short: 'Knowing the spend before booking' },
  { id: 'M3', domain: 'money', pole: 'N', text: 'Spending on experiences even when it dips into savings.', short: 'Spending on experiences' },
  { id: 'M4', domain: 'money', pole: 'S', text: 'Talking through any purchase over an agreed amount before making it.', short: 'Talking before big purchases' },
  { id: 'M5', domain: 'money', pole: 'N', text: 'Keeping some money that is mine to spend without discussion.', short: 'Money that is mine to spend' },
  { id: 'P1', domain: 'planning', pole: 'S', text: 'A rough plan for the next three to six months.', short: 'A rough 3 to 6 month plan' },
  { id: 'P2', domain: 'planning', pole: 'S', text: 'Clear dates for big transitions, such as moving or starting work.', short: 'Clear dates for big changes' },
  { id: 'P3', domain: 'planning', pole: 'N', text: 'Leaving room to change plans when something better comes up.', short: 'Room to change plans' },
  { id: 'P4', domain: 'planning', pole: 'S', text: 'Knowing how we’d handle it if a plan falls through.', short: 'A plan B' },
  { id: 'P5', domain: 'planning', pole: 'N', text: 'Deciding some things only when we get there.', short: 'Deciding some things later' },
  { id: 'T1', domain: 'time', pole: 'S', text: 'Knowing our weekend plans by Thursday.', short: 'Weekend plans by Thursday' },
  { id: 'T2', domain: 'time', pole: 'N', text: 'At least one weekend a month with nothing planned, to follow whatever comes up.', short: 'One open weekend a month' },
  { id: 'T3', domain: 'time', pole: 'N', text: 'Time that is mine to spend without needing to explain it.', short: 'Time that is mine' },
  { id: 'T4', domain: 'time', pole: 'S', text: 'A regular, predictable night that is ours.', short: 'A regular night that is ours' },
  { id: 'T5', domain: 'time', pole: 'S', text: 'Quiet evenings at home most weeknights.', short: 'Quiet weeknights at home' },
  { id: 'T6', domain: 'time', pole: 'N', text: 'Saying yes to last-minute invitations.', short: 'Yes to last-minute invitations' },
  { id: 'R1', domain: 'risk', pole: 'N', text: 'Doing adventurous activities such as freediving, remote hikes or big festivals.', short: 'Adventurous activities' },
  { id: 'R2', domain: 'risk', pole: 'S', text: 'Knowing the safety plan when one of us is doing something risky.', short: 'A safety plan for risky things' },
  { id: 'R3', domain: 'risk', pole: 'S', text: 'A check-in message at agreed points during a risky activity or trip.', short: 'Check-ins during risky trips' },
  { id: 'R4', domain: 'risk', pole: 'N', text: 'Trying things where I don’t know how they’ll turn out.', short: 'Trying the unknown' },
  { id: 'H1', domain: 'home', pole: 'S', text: 'A home base that feels calm and predictable.', short: 'A calm home base' },
  { id: 'H2', domain: 'home', pole: 'N', text: 'Living somewhere close to the outdoors or water.', short: 'Near the outdoors or water' },
  { id: 'H3', domain: 'home', pole: 'S', text: 'Staying in a familiar area near people I know.', short: 'A familiar area' },
  { id: 'H4', domain: 'home', pole: 'N', text: 'Being open to moving for the right opportunity.', short: 'Open to moving' },
  { id: 'H5', domain: 'home', pole: 'S', text: 'Routines at home, such as regular meals, bedtimes and tidy spaces.', short: 'Routines at home' },
  { id: 'V1', domain: 'travel', pole: 'N', text: 'Regular trips somewhere new.', short: 'Regular trips somewhere new' },
  { id: 'V2', domain: 'travel', pole: 'S', text: 'Trips planned and booked well in advance.', short: 'Trips booked well ahead' },
  { id: 'V3', domain: 'travel', pole: 'N', text: 'Travelling with some days unplanned.', short: 'Unplanned travel days' },
  { id: 'V4', domain: 'travel', pole: 'S', text: 'Returning to places we already know we like.', short: 'Places we know we like' },
  { id: 'V5', domain: 'travel', pole: 'N', text: 'Some trips with friends or on my own.', short: 'Trips with friends or solo' },
  { id: 'W1', domain: 'work', pole: 'S', text: 'A steady income with a clear contract.', short: 'Steady income, clear contract' },
  { id: 'W2', domain: 'work', pole: 'N', text: 'Taking a job because it is interesting, even if less secure.', short: 'Interesting over secure' },
  { id: 'W3', domain: 'work', pole: 'S', text: 'Not having big career moves overlap with other big changes.', short: 'Not stacking big changes' },
  { id: 'W4', domain: 'work', pole: 'N', text: 'Room to change direction or try something new in work.', short: 'Room to change direction' },
  { id: 'X1', domain: 'health', pole: 'N', text: 'Regular physical challenges and training.', short: 'Physical challenges' },
  { id: 'X2', domain: 'health', pole: 'S', text: 'Gentle, sustainable routines over intense goals.', short: 'Gentle, sustainable routines' },
  { id: 'X3', domain: 'health', pole: 'N', text: 'Doing health and fitness things together sometimes.', short: 'Fitness together sometimes' }
];
EB.POLE = { S: 'security', N: 'novelty' };
EB.CUSTOM_MAX = 5;

EB.NEED = ['Not needed', 'A little', 'Somewhat', 'Quite a lot', 'Really need'];
EB.FLEX = { core: 'Core for me', some: 'Some give', very: 'Very flexible' };
EB.FLEX_SHORT = { core: 'Core', some: 'Some give', very: 'Very flexible' };

EB.REFLECT = [
  { id: 'R01', q: 'When I picture a really good month for me, it includes…' },
  { id: 'R02', q: 'The kind of security that matters most to me is…', hint: 'Money, plans, reliability, routines, emotional reassurance, or something else.' },
  { id: 'R03', q: 'The kind of newness or freedom that matters most to me is…' },
  { id: 'R04', q: 'A time I felt really settled and safe was… What made it feel that way?' },
  { id: 'R05', q: 'A time I felt really alive was… What made it feel that way?' },
  { id: 'R06', q: 'When I don’t get enough of this, I tend to feel… and I tend to…', hint: 'For example: pursue, go quiet, get busy, get irritable.' },
  { id: 'R07', q: 'What I’m afraid would happen if this need went unmet is…' },
  { id: 'R08', q: 'What I hope having this would give us is…' },
  { id: 'R09', q: 'One way my partner’s preference might actually be good for me is…' },
  { id: 'R10', q: 'One thing I could offer that would cost me little but might matter to them is…' },
  { id: 'R11', q: 'Something I’d find hard to hear in this conversation is… What would help me hear it?' },
  { id: 'R12', q: 'Imagine a friend who cares about you both equally watched you two discuss this. What would they notice about each of you? What might they suggest?', hint: 'Take five minutes. Write it from their point of view.' },
  { id: 'R13', q: 'Over the next three months specifically, the thing that would help me most is…', hint: 'Think about what is coming up: work, a move, anything else on the calendar.' }
];

EB.AGREEMENTS = [
  'One person speaks at a time. The other listens to understand, not to answer.',
  'Either of us can pass on any question, or say “not yet”.',
  'Either of us can call a time-out. We come back at the time we name.',
  'Our question is not “whose way wins?” but “how do we each get enough security and enough novelty?”'
];

EB.CURIOUS = [
  'What does this one look like for you in an ordinary week?',
  'What would having this give you?',
  'When did this start to matter to you?',
  'What is the smallest version of this that would still feel like enough?'
];

EB.SPEAKER = [
  'The part of this that matters most to me is…',
  'What I’m hoping for is…',
  'What worries me is…',
  'Something I can be flexible about is…',
  'What I’m not asking for is…',
  'A request, not a rule: would you be open to…?'
];
EB.SPEAKER_GUIDE = 'Speak about yourself. Keep each chunk short. Pause so your partner can reflect.';

EB.LISTENER = [
  'What I heard is… Did I get that right?',
  'It sounds like what matters underneath is…',
  'So when [situation], you feel… because…',
  'What I’m hearing you’re worried about is… and what you’re hoping for is…',
  'Is there more?',
  'What would help me understand better is…',
  'It makes sense to me that you’d want that, given…'
];
EB.LISTENER_GUIDE = 'Your only job right now is to understand, not to agree or answer. You’ll get your turn.';

EB.REPAIR = [
  'Let me try that again more gently.',
  'That came out more pushy than I meant.',
  'I think we’re in the loop again.',
  'Can you say that again? I want to get it.',
  'I’m feeling flooded. Can we slow down?',
  'You’re not the problem. The pattern is.'
];

EB.STRESSORS = ['A job or contract ending', 'Moving house', 'Looking for work', 'Money pressure', 'Family or health pressure'];

EB.SUPPORT = [
  { id: 'base', q: 'One way I can be a steady base for your adventures is…', hint: 'Be available, don’t interfere, encourage.' },
  { id: 'new', q: 'One way I can bring some newness into our shared life is…' },
  { id: 'secure', q: 'One way I can help you feel secure while I’m off doing my thing is…' }
];

// Experiment templates. Fields in {braces} are filled in by the couple.
EB.TEMPLATES = [
  { id: 'rhythm', name: 'Rhythm', blurb: 'Plan some things ahead and keep some time open.',
    fields: [
      { k: 'weeks', label: 'How many weeks', ph: 'e.g. 3', def: '3', bl: 'how many' },
      { k: 'plan', label: 'What we plan ahead', ph: 'e.g. Saturday', bl: 'what' },
      { k: 'day', label: 'Planned by which day', ph: 'e.g. Thursday', bl: 'which day' },
      { k: 'open', label: 'What we keep open', ph: 'e.g. one Sunday a fortnight', bl: 'what' },
      { k: 'time', label: 'Ask about changes by when', ph: 'e.g. the night before', bl: 'when' }],
    text: 'For {weeks} weeks, we’ll plan {plan} by {day}, and keep {open} open.',
    ifThen: 'If one of us wants to change a planned thing, then we’ll ask by {time} and offer an alternative.' },
  { id: 'money', name: 'Money buffer', blurb: 'A buffer, and a quick chat before bigger spending.',
    fields: [
      { k: 'period', label: 'For how long', ph: 'e.g. the next three months', bl: 'how long' },
      { k: 'buffer', label: 'Buffer amount or approach', ph: 'e.g. $2,000', bl: 'amount' },
      { k: 'amount', label: 'A quick chat first for spending over', ph: 'e.g. $300', bl: 'amount' },
      { k: 'category', label: 'On what kind of thing', ph: 'e.g. trips, events and gear', bl: 'what' }],
    text: 'For {period}, we’ll each keep {buffer} as a buffer. Spending over {amount} on {category} gets a quick chat first.',
    ifThen: 'If one of us feels anxious about money, then we’ll name it and look at the numbers together.' },
  { id: 'checkins', name: 'Adventure with check-ins', blurb: 'Adventures go ahead, with a plan shared and agreed check-ins.',
    fields: [
      { k: 'who', label: 'Who is going', type: 'person', bl: 'who' },
      { k: 'activity', label: 'Doing what', ph: 'e.g. a dive trip', bl: 'what' },
      { k: 'points', label: 'Check in at', ph: 'e.g. arrival and when back on shore', bl: 'which points' },
      { k: 'by', label: 'Counts as missed after', ph: 'e.g. 4pm', bl: 'what time' },
      { k: 'step', label: 'Then what happens', ph: 'e.g. the other calls the dive shop', bl: 'what step' }],
    text: 'When {who} does {activity}, they’ll share the plan beforehand and check in at {points}.',
    ifThen: 'If a check-in is missed by {by}, then {step}.' },
  { id: 'transition', name: 'Transition plan', blurb: 'A one-page plan for a big change, with dates and a fallback.',
    fields: [
      { k: 'date', label: 'Written by', type: 'date', bl: 'date' },
      { k: 'what', label: 'For what change', ph: 'e.g. the move and the job search', bl: 'which change' },
      { k: 'every', label: 'Update it every', ph: 'e.g. Sunday', bl: 'how often' }],
    text: 'By {date}, we’ll write a one-page plan for {what} with key dates and a fallback. We’ll update it every {every}.',
    ifThen: 'If a date slips, then we’ll update the plan together within a few days.' },
  { id: 'novelty', name: 'Shared novelty', blurb: 'Something new together, at a level one of you sets.',
    fields: [
      { k: 'period', label: 'Once every', ph: 'e.g. fortnight', bl: 'how often' },
      { k: 'chooser', label: 'Who chooses the level', type: 'person', bl: 'who' }],
    text: 'Once every {period}, we’ll do something new together that {chooser} chooses the level of.',
    ifThen: 'If it’s too much, then we can scale it down on the day, no questions.' },
  { id: 'own', name: 'Our own', blurb: 'Write your own small experiment.',
    fields: [
      { k: 'what', label: 'What we’ll try', ph: 'e.g. For two weeks, we’ll …', long: true, bl: 'what we’ll try' },
      { k: 'iff', label: 'If… then…', ph: 'e.g. If …, then we’ll …', long: true, bl: 'if… then…' }],
    text: '{what}', ifThen: '{iff}' }
];
EB.EXP_MAX = 3;

EB.REVIEW_Q = [
  { k: 'did', q: 'What did we actually do?', hint: 'No blame. Just what happened.' },
  { k: 'gains', q: 'What did each of us get from it? What did it cost?' },
  { k: 'understood', q: 'How understood did each of us feel along the way?', hint: 'From “not at all” to “completely”. Say it aloud.' },
  { k: 'surprise', q: 'What surprised us?' },
  { k: 'appreciate', q: 'One thing I appreciated about how you handled it.' },
  { k: 'next', q: 'What’s the next small experiment, if any?' }
];
EB.UNDERSTOOD = ['Not at all', 'A little', 'Somewhat', 'Mostly', 'Completely'];

EB.HELP = {
  when: [
    'Either of you feels afraid, pressured or controlled.',
    'Contempt or stonewalling keeps coming back.',
    'The same topic gets stuck after two or three attempts.',
    'The timing of children becomes a pressure point.',
    'Either of you notices anxiety or low mood getting worse.'
  ],
  services: [
    { name: 'Relationships Australia', what: 'Couples counselling', contact: 'relationships.org.au' },
    { name: '1800RESPECT', what: 'If you are worried about safety in a relationship', contact: '1800 737 732' },
    { name: 'Lifeline', what: 'Crisis support, 24 hours', contact: '13 11 14' },
    { name: 'Emergency', what: 'If anyone is in danger now', contact: '000' }
  ]
};

// What each part of the app draws on, and how strong that evidence is.
EB.METHODS = [
  ['Writing privately before talking', 'A core part of online couple programs tested in randomised trials (OurRelationship; ePREP). Brief reappraisal writing protected marital quality in one trial (Finkel et al. 2013).', 'Moderate, as a component'],
  ['The third-person prompt', 'Finkel et al. 2013, one randomised trial with 120 married couples.', 'Moderate, single trial'],
  ['Speaker and listener turns', 'PREP and ePREP trials, with mixed long-term results.', 'Low to moderate'],
  ['Focusing on feeling understood', 'Gordon and Chen 2016: conflict predicted lower satisfaction only for people who did not feel understood.', 'Moderate'],
  ['Naming the pattern together', 'Integrative Behavioural Couple Therapy (trials with distressed couples) and Emotionally Focused Therapy.', 'Strong for the full therapies; components untested'],
  ['Core and flexible map', 'Adapted from a practitioner exercise. Not tested on its own.', 'Untested'],
  ['Fear and hope prompts', 'Approach goals predicted higher satisfaction than avoidance goals (Impett et al. 2010).', 'Moderate for the framing'],
  ['Requests, not rules', 'Feeling autonomous in a relationship is linked to less defensive conflict (Knee et al. 2005).', 'Moderate, observational'],
  ['Time-outs and repair', 'Practitioner guidance. The demand–withdraw pattern it interrupts is reliably linked to lower satisfaction (Schrodt et al. 2014).', 'Low for time-outs; strong that the pattern is harmful'],
  ['Small experiments with a review date', 'Behaviour-exchange principles from couple therapy, and “if–then” planning (Gollwitzer and Sheeran 2006). The trial-and-review format itself is untested.', 'Moderate for the parts'],
  ['Shared new experiences', 'Aron et al. 2000 experiments.', 'Moderate'],
  ['Supporting each other’s value', 'Feeney 2007; Feeney and Thrush 2010: accepting dependence supports independence.', 'Moderate']
];

EB.SOURCES = [
  'Aron, A., Norman, C. C., Aron, E. N., McKenna, C., & Heyman, R. E. (2000). Couples’ shared participation in novel and arousing activities and experienced relationship quality. Journal of Personality and Social Psychology.',
  'Braithwaite, S. R., & Fincham, F. D. (2007, 2011, 2014). Trials of ePREP with dating and married couples.',
  'Christensen, A., Atkins, D. C., Baucom, B., & Yi, J. (2010). Marital status and satisfaction five years following a randomized clinical trial comparing traditional versus integrative behavioral couple therapy. Journal of Consulting and Clinical Psychology.',
  'Danioni, F., et al. (2023). Personal Relationships (the Portrait Couple Values Questionnaire).',
  'Dew, J., Britt, S., & Huston, S. (2012). Examining the relationship between financial issues and divorce. Family Relations, 61, 615–628.',
  'Doss, B. D., et al. (2016). A randomized controlled trial of the web-based OurRelationship program. Journal of Consulting and Clinical Psychology.',
  'Feeney, B. C. (2007). The dependency paradox in close relationships. Journal of Personality and Social Psychology.',
  'Feeney, B. C., & Thrush, R. L. (2010). Relationship influences on exploration in adulthood: the secure base.',
  'Finkel, E. J., Slotter, E. B., Luchies, L. B., Walton, G. M., & Gross, J. J. (2013). A brief intervention to promote conflict reappraisal preserves marital quality over time. Psychological Science.',
  'Gollwitzer, P. M., & Sheeran, P. (2006). Implementation intentions and goal achievement: a meta-analysis.',
  'Gordon, A. M., & Chen, S. (2016). Do you get where I’m coming from? Perceived understanding buffers against the negative impact of conflict on relationship satisfaction. Journal of Personality and Social Psychology.',
  'Gottman, J. M., Coan, J., Carrère, S., & Swanson, C. (1998). Predicting marital happiness and stability from newlywed interactions.',
  'Impett, E. A., et al. (2010). Moving toward more perfect unions: daily and long-term consequences of approach and avoidance goals in romantic relationships.',
  'Knee, C. R., Lonsbary, C., Canevello, A., & Patrick, H. (2005). Self-determination and conflict in romantic relationships.',
  'Leikas, S., Ilmarinen, V.-J., Verkasalo, M., Vartiainen, H.-L., & Lönnqvist, J.-E. (2018). Relationship satisfaction and similarity of personality traits, personal values, and attitudes. Personality and Individual Differences.',
  'Schrodt, P., Witt, P. L., & Shimkowski, J. R. (2014). A meta-analytical review of the demand/withdraw pattern of interaction.',
  'Slatcher, R. B., & Pennebaker, J. W. (2006). How do I love thee? Let me count the words. Psychological Science.',
  'van der Wal, R. C., et al. (2024). Personality and Social Psychology Bulletin (self-transcendence values and relationship quality, five studies).'
];

// For importing Values Deck results as context: card group (Schwartz
// higher-order) for each Values Deck card, and its life-area names.
EB.VD_HO = {"v01": "SE", "v02": "SE", "v03": "SE", "v04": "SE", "v12": "SE", "v05": "OC", "v06": "OC", "v07": "OC", "v08": "OC", "v09": "OC", "v10": "OC", "v11": "OC", "v13": "OC", "v14": "CO", "v15": "CO", "v16": "CO", "v34": "CO", "v17": "CO", "v18": "CO", "v20": "CO", "v21": "CO", "v22": "ST", "v23": "ST", "v24": "ST", "v25": "ST", "v35": "ST", "v26": "ST", "v36": "ST", "v27": "ST", "v28": "ST", "v29": "ST", "v30": "ST", "v31": "ST"};
EB.VD_NAMES = {"v01": "Achievement", "v02": "Fame", "v03": "Wealth", "v04": "Authority", "v12": "Comfort", "v05": "Adventure", "v06": "Knowledge", "v07": "Creativity", "v08": "Autonomy", "v09": "Non-conformity", "v10": "Solitude", "v11": "Fun", "v13": "Growth", "v14": "Safety", "v15": "Stability", "v16": "Health", "v34": "Order", "v17": "Tradition", "v18": "God's will", "v20": "Courtesy", "v21": "Humility", "v22": "Family", "v23": "Honesty", "v24": "Responsibility", "v25": "Commitment", "v35": "Faithfulness", "v26": "Caring", "v36": "Friendship", "v27": "Generosity", "v28": "Forgiveness", "v29": "Justice", "v30": "Tolerance", "v31": "Ecology", "v19": "Spirituality", "v32": "Genuineness", "v33": "Intimacy", "v37": "Purpose"};
EB.VD_OPTIONS = {"d01": ["Yes, in the next few years", "Yes, later on", "Open or unsure", "Probably not", "No", "I already have children"], "d02": ["Central to my daily life", "Important, practised sometimes", "Cultural or occasional", "Spiritual, not religious", "Not part of my life"], "d03": ["Save and plan ahead", "Balance saving and enjoying", "Enjoy it now", "Still sorting my finances out"], "d04": ["Stay where I am", "Open to elsewhere in Australia", "Open to living overseas", "Near my family matters most", "Flexible"], "d05": ["Career is central", "Important but balanced", "Work to live", "A big change is coming", "Would relocate for work"], "d06": ["Very involved, frequent contact", "Close but separate lives", "Occasional contact", "It is complicated", "Caring duties ahead"], "d07": ["Share everything evenly", "Split by strengths", "Outsource where we can", "More traditional roles", "Not sure yet"], "d08": ["Big social life", "Mix of out and home", "Mostly home with a few close friends", "A community or scene is central"], "d09": ["Structured and disciplined", "Mostly healthy, flexible", "Relaxed", "Changing things at the moment"], "d10": ["Lots, often", "Regular trips", "Occasional", "I prefer a home base"], "d11": ["Actively involved", "Strong views, less active", "Moderate views", "Not very political"], "d12": ["Central to who I am", "Important for family and celebrations", "A few traditions", "Not a big part of my life"], "d13": ["Very central", "Important", "Moderate", "Still working it out"]};
EB.VD_FLEX = {"firm": "Firm", "some": "Some room", "open": "Open"};
EB.VD_AREAS = [['d03', 'Money'], ['d04', 'Where we live'], ['d05', 'Work and ambition'], ['d10', 'Adventure and travel'],
  ['d09', 'Health and habits'], ['d07', 'Home and roles'], ['d08', 'Social life and community'], ['d01', 'Children']];
EB.HO_NAME = { OC: 'Openness to change', SE: 'Self-enhancement', CO: 'Conservation', ST: 'Self-transcendence' };

