/**
 * Exercise library — anatomically reviewed content.
 * Muscle ids reference structures in the anatomy model (src/data/anatomy.ts).
 */

export interface MuscleAction {
  id: string
  label: string
  /** role in this exercise */
  role: 'prime' | 'synergist' | 'stabilizer'
  /** which phase it works hardest */
  note?: string
}

export interface Exercise {
  id: string
  name: string
  short: string
  /** camera focus target for the zoom-in (joint region) */
  focus: 'elbow' | 'shoulder' | 'hip' | 'knee' | 'spine'
  /** the joint action, plain-accurate */
  joint: string
  bones: string[]
  movers: MuscleAction[]
  tendons: { name: string; attaches: string }[]
  concentric: string
  eccentric: string
  insight: string
  mistake: string
  repRange: string
  goal: 'strength' | 'hypertrophy' | 'endurance'
  /** rig channel driven by exercisePhase, describing the animated joint */
  rig: {
    joint: 'elbowFlex' | 'kneeHipExtend' | 'shoulderPress' | 'hipHinge' | 'shoulderAbduct' | 'horizPress'
    /** contracted muscle ids that visibly bulge/shorten at peak contraction */
    contracts: string[]
  }
}

export const EXERCISES: Exercise[] = [
  {
    id: 'bicep-curl',
    name: 'Bicep Curl',
    short: 'Elbow flexion & supination — the biceps’ signature move.',
    focus: 'elbow',
    joint: 'Elbow flexion at the humeroulnar & humeroradial joints, plus supination at the radioulnar joints.',
    bones: ['Humerus', 'Radius', 'Ulna', 'Scapula'],
    movers: [
      { id: 'biceps', label: 'Biceps brachii (long + short head)', role: 'prime', note: 'Shortens & supinates' },
      { id: 'brachialis', label: 'Brachialis', role: 'prime', note: 'True workhorse of pure elbow flexion' },
      { id: 'brachioradialis', label: 'Brachioradialis', role: 'synergist', note: 'Strongest in neutral grip' },
      { id: 'deltoid', label: 'Anterior deltoid', role: 'stabilizer' },
    ],
    tendons: [
      { name: 'Distal biceps tendon', attaches: 'Radial tuberosity (crosses the radius → also supinates)' },
      { name: 'Brachialis tendon', attaches: 'Ulnar tuberosity / coronoid process' },
      { name: 'Long-head origin', attaches: 'Supraglenoid tubercle of scapula' },
    ],
    concentric: 'Biceps & brachialis shorten; the forearm rises toward the shoulder.',
    eccentric: 'The same muscles lengthen under tension as you lower — a major source of the growth stimulus. Don’t just drop it.',
    insight: 'Fix the elbows at your sides and supinate hard at the top — full supination maximally shortens the biceps and recruits it fully.',
    mistake: 'Swinging with shoulder flexion & momentum, turning it into a front-raise-plus-curl that offloads the biceps.',
    repRange: '8–15 reps',
    goal: 'hypertrophy',
    rig: { joint: 'elbowFlex', contracts: ['biceps', 'brachialis'] },
  },
  {
    id: 'squat',
    name: 'Barbell Squat',
    short: 'Simultaneous hip & knee extension under axial load.',
    focus: 'knee',
    joint: 'Hip extension, knee extension and controlled ankle motion, working together.',
    bones: ['Femur', 'Tibia', 'Patella', 'Pelvis', 'Spine'],
    movers: [
      { id: 'quads', label: 'Quadriceps', role: 'prime', note: 'Knee extension' },
      { id: 'glutes', label: 'Gluteus maximus', role: 'prime', note: 'Hip extension' },
      { id: 'adductors', label: 'Adductor magnus', role: 'synergist', note: 'Major hip-extension contributor' },
      { id: 'hamstrings', label: 'Hamstrings', role: 'synergist', note: 'Near-isometric hip stabilizers' },
      { id: 'erectors', label: 'Erector spinae', role: 'stabilizer' },
    ],
    tendons: [
      { name: 'Quadriceps → patellar tendon', attaches: 'Over the patella to the tibial tuberosity' },
      { name: 'Gluteus maximus', attaches: 'Gluteal tuberosity of femur & IT band' },
    ],
    concentric: 'Ascent — quads and glutes shorten to extend the knees and hips.',
    eccentric: 'Descent — quads and glutes lengthen under load; where much of the stimulus lives.',
    insight: 'Brace like you’re about to be punched before descending, and “spread the floor” to drive the knees out in line with the toes.',
    mistake: 'Knees caving inward (valgus) or the hips shooting up early, dumping load onto the low back.',
    repRange: '4–8 (strength) · 6–10 (hypertrophy)',
    goal: 'strength',
    rig: { joint: 'kneeHipExtend', contracts: ['quads', 'glutes'] },
  },
  {
    id: 'bench-press',
    name: 'Bench Press',
    short: 'Horizontal press driven by the pecs, front delts & triceps.',
    focus: 'shoulder',
    joint: 'Horizontal shoulder adduction/flexion at the glenohumeral joint plus elbow extension.',
    bones: ['Humerus', 'Ulna', 'Radius', 'Scapula', 'Clavicle', 'Sternum'],
    movers: [
      { id: 'pecs', label: 'Pectoralis major', role: 'prime' },
      { id: 'deltoid', label: 'Anterior deltoid', role: 'prime' },
      { id: 'triceps', label: 'Triceps brachii', role: 'prime', note: 'Lockout' },
      { id: 'serratus', label: 'Serratus anterior', role: 'stabilizer' },
      { id: 'lats', label: 'Latissimus dorsi', role: 'stabilizer', note: 'Controls the descent' },
    ],
    tendons: [
      { name: 'Pec major tendon', attaches: 'Lateral lip of the bicipital groove of the humerus' },
      { name: 'Common triceps tendon', attaches: 'Olecranon of the ulna' },
    ],
    concentric: 'Pressing — pecs and triceps shorten to drive the bar up.',
    eccentric: 'Lowering — pecs and anterior delts lengthen under load to the chest.',
    insight: 'Retract & depress the scapulae to build a stable “shelf,” keep elbows ~45–75° from the torso, and use leg drive.',
    mistake: 'Flaring the elbows to 90°, stressing the shoulder and cutting pec efficiency.',
    repRange: '5–8 (strength) · 8–12 (hypertrophy)',
    goal: 'hypertrophy',
    rig: { joint: 'horizPress', contracts: ['pecs', 'triceps'] },
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    short: 'A whole-body hip & knee extension pulled from the floor.',
    focus: 'hip',
    joint: 'Hip and knee extension from the floor; the spine works isometrically to stay neutral.',
    bones: ['Pelvis', 'Femur', 'Tibia', 'Fibula', 'Vertebral column'],
    movers: [
      { id: 'glutes', label: 'Gluteus maximus', role: 'prime' },
      { id: 'hamstrings', label: 'Hamstrings', role: 'prime' },
      { id: 'erectors', label: 'Erector spinae', role: 'prime', note: 'Isometric rigidity' },
      { id: 'quads', label: 'Quadriceps', role: 'synergist', note: 'Break from the floor' },
      { id: 'lats', label: 'Latissimus dorsi', role: 'synergist', note: 'Keeps the bar close' },
    ],
    tendons: [
      { name: 'Hamstring origin', attaches: 'Ischial tuberosity of the pelvis' },
      { name: 'Biceps femoris', attaches: 'Fibular head' },
    ],
    concentric: 'The lift — glutes, hamstrings and erectors shorten to extend the hip and stand tall.',
    eccentric: 'Lowering — glutes and hamstrings lengthen under load as the hips hinge back.',
    insight: 'Take the slack out of the bar first, then “push the floor away,” keeping the bar dragging up the shins.',
    mistake: 'Rounding the lumbar spine under load — the single biggest injury risk.',
    repRange: '3–6 reps',
    goal: 'strength',
    rig: { joint: 'hipHinge', contracts: ['glutes', 'hamstrings'] },
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    short: 'Pressing a load overhead — delts, triceps & upward scapular rotation.',
    focus: 'shoulder',
    joint: 'Shoulder flexion/abduction at the glenohumeral joint, upward scapular rotation and elbow extension.',
    bones: ['Humerus', 'Scapula', 'Clavicle', 'Ulna', 'Radius'],
    movers: [
      { id: 'deltoid', label: 'Deltoid (anterior + lateral)', role: 'prime' },
      { id: 'triceps', label: 'Triceps brachii', role: 'prime', note: 'Lockout' },
      { id: 'traps', label: 'Upper trapezius / serratus', role: 'synergist', note: 'Upward scapular rotation' },
      { id: 'erectors', label: 'Core & erectors', role: 'stabilizer', note: 'Anti-extension brace' },
    ],
    tendons: [
      { name: 'Deltoid tendon', attaches: 'Deltoid tuberosity of the humerus' },
      { name: 'Supraspinatus', attaches: 'Greater tubercle of the humerus' },
    ],
    concentric: 'Pressing up — deltoid and triceps shorten.',
    eccentric: 'Lowering to the shoulders — deltoid and triceps lengthen under load.',
    insight: 'Squeeze glutes and brace the abs to lock the ribcage, then push the head “through the window” once the bar clears your forehead.',
    mistake: 'Overarching the low back to turn it into a standing incline press.',
    repRange: '5–8 (strength) · 8–12 (hypertrophy)',
    goal: 'strength',
    rig: { joint: 'shoulderPress', contracts: ['deltoid', 'triceps'] },
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown / Pull-up',
    short: 'Shoulder adduction & extension — the lats’ prime job.',
    focus: 'shoulder',
    joint: 'Shoulder adduction and extension plus scapular depression and elbow flexion.',
    bones: ['Humerus', 'Scapula', 'Spine', 'Pelvis', 'Radius', 'Ulna'],
    movers: [
      { id: 'lats', label: 'Latissimus dorsi', role: 'prime' },
      { id: 'teres', label: 'Teres major', role: 'synergist' },
      { id: 'biceps', label: 'Biceps & brachialis', role: 'synergist', note: 'Elbow flexion' },
      { id: 'traps', label: 'Mid/lower trapezius & rhomboids', role: 'synergist', note: 'Scapular retraction' },
    ],
    tendons: [
      { name: 'Lat dorsi (broad origin)', attaches: 'Thoracolumbar fascia (T7–L5), iliac crest, lower ribs' },
      { name: 'Lat insertion', attaches: 'Floor of the intertubercular groove of the humerus' },
    ],
    concentric: 'Pulling down / up — the lats shorten.',
    eccentric: 'Letting the bar rise — the lats lengthen into a strong overhead stretch. Control it.',
    insight: 'Depress the shoulder blades “into your back pockets” before bending the elbows so the lats lead, not the biceps.',
    mistake: 'Excess backward lean and momentum, with the shoulders staying shrugged up at the top.',
    repRange: '6–12 reps',
    goal: 'hypertrophy',
    rig: { joint: 'shoulderPress', contracts: ['lats', 'teres'] },
  },
  {
    id: 'rdl',
    name: 'Romanian Deadlift',
    short: 'A hip hinge that loads the hamstrings on stretch.',
    focus: 'hip',
    joint: 'Hip flexion → extension with the knees held in slight, constant flexion; spine neutral.',
    bones: ['Pelvis', 'Femur', 'Tibia', 'Fibula', 'Spine'],
    movers: [
      { id: 'hamstrings', label: 'Hamstrings', role: 'prime', note: 'Loaded stretch' },
      { id: 'glutes', label: 'Gluteus maximus', role: 'prime' },
      { id: 'erectors', label: 'Erector spinae', role: 'stabilizer', note: 'Isometric' },
      { id: 'lats', label: 'Latissimus dorsi', role: 'stabilizer', note: 'Bar control' },
    ],
    tendons: [
      { name: 'Hamstring origin', attaches: 'Ischial tuberosity of the pelvis' },
      { name: 'Semitendinosus', attaches: 'Medial tibia via the pes anserine' },
    ],
    concentric: 'Standing up — hips drive forward, hamstrings and glutes shorten to lock out.',
    eccentric: 'The star of the movement — hips push back and the hamstrings lengthen under high load.',
    insight: 'It’s a hip hinge, not a squat or a toe-touch: push the hips backward and stop at a strong hamstring stretch.',
    mistake: 'Bending the knees to lower the bar (squatting it) or rounding the back to reach the floor.',
    repRange: '8–12 reps',
    goal: 'hypertrophy',
    rig: { joint: 'hipHinge', contracts: ['hamstrings', 'glutes'] },
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise',
    short: 'Shoulder abduction — isolating the side delt.',
    focus: 'shoulder',
    joint: 'Shoulder abduction in the frontal plane at the glenohumeral joint.',
    bones: ['Humerus', 'Scapula', 'Clavicle'],
    movers: [
      { id: 'deltoid', label: 'Deltoid — lateral head', role: 'prime' },
      { id: 'supraspinatus', label: 'Supraspinatus', role: 'synergist', note: 'Initiates the first ~15°' },
      { id: 'traps', label: 'Upper trapezius / serratus', role: 'synergist', note: 'Above ~90°' },
    ],
    tendons: [
      { name: 'Deltoid tendon', attaches: 'Deltoid tuberosity of the humerus' },
      { name: 'Supraspinatus', attaches: 'Greater tubercle (passes under the acromion)' },
    ],
    concentric: 'Raising the arm — the lateral deltoid shortens to abduct.',
    eccentric: 'Lowering — it lengthens under load; the bottom stretched position is highly stimulating.',
    insight: 'Lead with the elbow, not the hand, and keep a slight “pour the pitcher” tilt to bias the lateral head.',
    mistake: 'Shrugging & swinging so the traps take over, and going far above shoulder height.',
    repRange: '12–20 reps',
    goal: 'hypertrophy',
    rig: { joint: 'shoulderAbduct', contracts: ['deltoid'] },
  },
]

export const exerciseById = (id: string | null) => EXERCISES.find((e) => e.id === id) ?? null
