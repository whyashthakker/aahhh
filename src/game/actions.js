export const ACTIONS = [
  {
    id: 'jab',
    label: 'Quick jab',
    description: 'A neat little bonk',
    icon: '✦',
    key: 'j',
    hits: [{ delay: 0, part: 'head', power: 1.18, side: 'random' }],
  },
  {
    id: 'shove',
    label: 'Big shove',
    description: "Send 'em wobbling",
    icon: '↝',
    key: 's',
    hits: [{ delay: 0, part: 'torso', power: 2.15, side: 'random' }],
  },
  {
    id: 'storm',
    label: 'Fury flurry',
    description: 'Five rapid-fire hits',
    icon: '⁂',
    key: 'f',
    hits: Array.from({ length: 5 }, (_, index) => ({
      delay: index * 135,
      part: index % 3 === 0 ? 'head' : 'torso',
      power: 0.82,
      side: index % 2 === 0 ? -1 : 1,
    })),
  },
]

export const ACTIONS_BY_ID = Object.fromEntries(ACTIONS.map((action) => [action.id, action]))
export const ACTIONS_BY_KEY = Object.fromEntries(ACTIONS.map((action) => [action.key, action]))
