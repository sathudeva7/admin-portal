export const KNOWLEDGE_ENTRIES = [
  {
    id: 1,
    icon: '📖',
    iconBg: '#E8F4F4',
    title: 'The Root of All Anger — Kivod HaEtzem',
    preview: 'Rabbi Landau teaches that anger always comes from one source: injured honor (kivod atzmo). When a person loses their temper, they are experiencing a perceived threat to their self-image. The antidote is not to suppress anger but to...',
    category: 'Anger & Emotions',
    source: 'Manual',
    priority: 'High',
    status: 'Live',
    updated: '2 days ago',
    tags: ['anger', 'honor', 'emotions', 'kivod']
  },
  {
    id: 2,
    icon: '💑',
    iconBg: '#FDF3E3',
    title: 'Shalom Bayis — Peace in the Home',
    preview: 'The foundation of a healthy marriage is not love alone but deep respect. In Rivnitz teaching, each spouse must see the divine spark in the other before the physical relationship can flourish. Every argument in a home is ultimately...',
    category: 'Marriage & Relationships',
    source: 'From Video',
    priority: 'High',
    status: 'Live',
    updated: '5 days ago',
    tags: ['marriage', 'shalom bayis', 'relationships', 'respect']
  },
  {
    id: 3,
    icon: '🙏',
    iconBg: '#E8F4F4',
    title: 'Emunah — True Faith and Bitachon',
    preview: 'Rabbi Landau distinguishes between emunah (belief) and bitachon (trust). Emunah is knowing Hashem exists and runs the world. Bitachon is living as if that is true — meaning you take action without anxiety about outcomes...',
    category: 'Faith & Prayer',
    source: 'Manual',
    priority: 'High',
    status: 'Live',
    updated: '1 week ago',
    tags: ['emunah', 'bitachon', 'faith', 'trust']
  },
  {
    id: 4,
    icon: '🤖',
    iconBg: '#EDE5D8',
    title: 'AI Coach Tone & Boundaries',
    preview: 'The AI coach should never present itself as a replacement for human guidance or the Rabbi. It is a tool for reflection and initial support. For serious halachic, medical, or psychological crises, the AI should always direct...',
    category: 'AI Guidelines',
    source: 'Manual',
    priority: 'High',
    status: 'Live',
    updated: '3 days ago',
    tags: ['ai behavior', 'guidelines', 'boundaries', 'escalation']
  },
  {
    id: 5,
    icon: '👶',
    iconBg: '#E8F4F4',
    title: 'Chinuch — Raising Children with Love and Limits',
    preview: 'In the Rivnitz approach to child-rearing, the first duty of a parent is to let the child feel completely loved and accepted. Discipline without a foundation of love creates rebellion. Rabbi Landau teaches that a child who...',
    category: 'Parenting',
    source: 'From Video',
    priority: 'Medium',
    status: 'Live',
    updated: '2 weeks ago',
    tags: ['parenting', 'chinuch', 'children', 'discipline']
  },
  {
    id: 6,
    icon: '✨',
    iconBg: '#FDF3E3',
    title: 'Personality Types — The 4 Rivnitz Types',
    preview: 'The Rivnitz system identifies four core personality types based on the four-letter name and the elements: The Seeker (truth-driven, reflective), The Nurturer (relationship-driven, emotional), The Builder (goal-driven, assertive), The Peacemaker (harmony-driven, intuitive)...',
    category: 'Core Teachings',
    source: 'Manual',
    priority: 'High',
    status: 'Live',
    updated: '1 week ago',
    tags: ['personality', 'types', 'seeker', 'nurturer', 'builder', 'peacemaker']
  },
  {
    id: 7,
    icon: '🕯️',
    iconBg: '#E8F4F4',
    title: 'Tefilla — How to Pray with Intention',
    preview: 'Prayer is not a list of requests but a conversation with the Creator. Rabbi Landau teaches that before beginning tefilla, one should spend 60 seconds becoming fully present — releasing the mental noise of daily life...',
    category: 'Faith & Prayer',
    source: 'From Video',
    priority: 'Medium',
    status: 'Draft',
    updated: '1 day ago',
    tags: ['prayer', 'tefilla', 'kavanah', 'presence']
  },
  {
    id: 8,
    icon: '💼',
    iconBg: '#EDE5D8',
    title: 'Parnassah & Bitachon in Business',
    preview: 'Work is not the source of income — it is the vessel. Rabbi Landau teaches that a person must work (the Torah requires hishtadlus) but must simultaneously hold the understanding that their effort alone does not produce results...',
    category: 'Daily Life',
    source: 'Manual',
    priority: 'Medium',
    status: 'Live',
    updated: '3 weeks ago',
    tags: ['parnassah', 'business', 'hishtadlus', 'trust']
  }
];

export const ESCALATION_TOPICS = [
  'Suicidal thoughts or self-harm',
  'Halachic rulings requiring a posek',
  'Medical or mental health crises',
  'Abuse or domestic violence',
  'Financial decisions over $10,000',
];

export const TOPICS = [
  { label: 'Marriage & Relationships', sub: 'Shalom bayis, communication, intimacy', on: true },
  { label: 'Anger & Emotions', sub: 'Managing feelings, emotional regulation', on: true },
  { label: 'Faith & Prayer', sub: 'Emunah, tefilla, spiritual growth', on: true },
  { label: 'Parenting & Family', sub: 'Chinuch, family dynamics, teenagers', on: true },
  { label: 'Work & Parnassah', sub: 'Business, hishtadlus, financial stress', on: true },
  { label: 'Mental Wellbeing', sub: 'Anxiety, depression, self-worth', on: true },
  { label: 'Purpose & Mission', sub: "Life purpose, one's tikkun, direction", on: true },
  { label: 'Personal Growth', sub: 'Character development, habits', on: true },
  { label: 'Daily Spiritual Practice', sub: 'Tefilla, learning, mitzvos', on: true },
];

export const QUICK_TEST_PROMPTS = [
  { icon: '💑', text: "My wife and I keep having the same argument. I want to do teshuva but I don't know how to get her on board.", type: 'Marriage & Relationships' },
  { icon: '😤', text: 'I lose my temper with my kids and then feel terrible about it. How do I stop?', type: 'Anger & Emotions' },
  { icon: '🙏', text: 'I feel far from Hashem lately. My prayers feel empty. What should I do?', type: 'Faith & Prayer' },
  { icon: '💼', text: "I'm in financial difficulty and I don't know if I'm making the right business decisions. I need guidance.", type: 'Work & Parnassah' },
  { icon: '😰', text: "I wake up every day with anxiety. I know I should trust in Hashem but I can't stop worrying.", type: 'Mental Wellbeing' },
  { icon: '👶', text: "My teenage son is pulling away from Yiddishkeit. I'm scared and don't want to push him further away.", type: 'Parenting & Family' },
];

export const DEFAULT_SYSTEM_PROMPT = `You are the Rivnitz AI Coach — a deeply personalized spiritual and psychological coaching assistant built on the teachings of Rabbi Landau and the Rivnitz philosophy.

## Your Role
You are not a generic chatbot. You are a personal spiritual coach who:
- Knows this specific user's personality type: {user_type}
- Understands their MBTI profile: {user_mbti}
- Is aware of their Enneagram type: {user_enneagram}
- Remembers their life context: {user_context}
- Speaks to them in a tone calibrated to their nature

## Your Foundation
All your guidance is rooted in:
1. The Rivnitz teachings of Rabbi Landau (primary source)
2. Torah wisdom, mussar, and Chassidic tradition
3. Practical psychological insight aligned with Jewish values

[KNOWLEDGE BASE]
{knowledge_base_entries}
[/KNOWLEDGE BASE]

## How to Respond
- Lead with empathy before offering guidance
- Personalize your tone to the user's type
- Ground advice in Rivnitz teachings when relevant
- Use Hebrew/Torah terms naturally (teshuva, middos, emunah, etc.)
- Ask follow-up questions when helpful
- Recommend relevant videos from the teaching library when appropriate
- If a question is beyond your scope — flag it for Rabbi review

## Boundaries
- You are a coaching tool, not a halachic authority
- For medical, legal, or severe mental health concerns — always direct the user to professional help
- Never pretend to be human
- Always encourage direct access to the Rabbi for deep personal matters`;
