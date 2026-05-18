const COMMON_NEGATIVE_PROMPT = [
  'low quality',
  'blurry',
  'muddy silhouette',
  'text',
  'watermark',
  'photo realistic',
  '3d render',
  'harsh shadow',
  'overdetailed noise',
  'busy background',
  'cropped subject',
  'tilted camera',
  'dark desaturated palette',
  'jagged edges'
].join(', ')

const CATEGORY_NEGATIVE_PROMPTS = {
  terrain: [
    'border',
    'frame',
    'decorative frame',
    'ornamental border',
    'tile border',
    'edge trim',
    'corners',
    'center medallion',
    'symmetry',
    'radial symmetry',
    'geometric pattern',
    'floor tile',
    'pavement',
    'stone floor',
    'board game board',
    'courtyard',
    'plaza',
    'town square',
    'vignette',
    'spotlight',
    'centered island',
    'floating island',
    'isolated patch',
    'circular patch',
    'round patch',
    'disk',
    'orb',
    'medallion',
    'single object',
    'single subject',
    'cutout',
    'poster',
    'water',
    'river',
    'stream',
    'pond',
    'lake',
    'creek',
    'blue patch',
    'blue pool',
    'water channel',
    'wetland',
    'flower-like center',
    'star-shaped pattern',
    'spiral pattern',
    'ring pattern',
    'halo',
    'circle',
    'radial seam',
    'radiating seam',
    'building',
    'house',
    'architecture',
    'walls',
    'roads',
    'paths',
    'stairs',
    'indoor floor',
    'dungeon tile',
    'checkerboard',
    'framed platform',
    'square panels',
    'fountain',
    'garden wall',
    'city block',
    'room layout'
  ].join(', '),
  resource_node: [
    'multiple objects',
    'crowded scene',
    'busy background',
    'landscape',
    'room interior',
    'thick border',
    'framed icon',
    'text label'
  ].join(', '),
  building_map: [
    'front-facing building',
    'street scene',
    'people',
    'busy town background',
    'thick border',
    'cropped roof',
    'hard black outline'
  ].join(', '),
  ui_icon_fallback: [
    'busy composition',
    'multiple symbols',
    'illustrated scene',
    'background texture',
    'text label'
  ].join(', '),
  character_portrait: [
    'full body',
    'tiny head',
    'profile view only',
    'crowd',
    'busy background',
    'helmet covering face',
    'cropped forehead',
    'cropped chin',
    'weapons blocking face',
    'text label'
  ].join(', '),
  boss_portrait: [
    'full battle scene',
    'crowd',
    'tiny head',
    'landscape background',
    'cropped horns',
    'cropped jaw',
    'text label'
  ].join(', ')
}

const GENERATION_STANDARDS = {
  version: '1.0.0',
  categories: {
    terrain: {
      composition: 'continuous edge-to-edge outdoor ground texture with no centered subject',
      must_include: [
        'full bleed ground coverage',
        'natural local variation',
        'tile-friendly continuity',
        'material-only read with no standalone object'
      ],
      must_avoid: [
        'frame',
        'border',
        'floating island',
        'single scenic composition',
        'horizon',
        'cutaway',
        'central medallion',
        'water in non-water terrain'
      ],
      acceptance_checks: [
        'reads as outdoor terrain instead of an icon',
        'no focal object or centered scene',
        'can sit beside adjacent tiles without obvious seams'
      ]
    },
    resource_node: {
      composition: 'single isolated subject on transparent background',
      must_include: [
        'clear silhouette',
        'single resource identity',
        'safe margins',
        'map-scale readability'
      ],
      must_avoid: [
        'multiple subjects',
        'scene background',
        'cropped subject',
        'terrain backdrop'
      ],
      acceptance_checks: [
        'recognizable at 32px',
        'resource type is unambiguous',
        'transparent background stays clean'
      ]
    },
    building_map: {
      composition: 'single map-scale building with stable top-down or three-quarter angle',
      must_include: [
        'single building mass',
        'consistent top-left light',
        'transparent background',
        'clear roofline silhouette'
      ],
      must_avoid: [
        'street scene',
        'front elevation',
        'people',
        'environment backdrop'
      ],
      acceptance_checks: [
        'reads as one building',
        'works as a map prop',
        'shape survives 32px reduction'
      ]
    },
    ui_icon_fallback: {
      composition: 'single centered UI symbol',
      must_include: [
        'strong silhouette',
        'large readable shapes',
        'transparent background'
      ],
      must_avoid: [
        'scene illustration',
        'text label',
        'tiny decorative details'
      ],
      acceptance_checks: [
        'clear at 32px',
        'one idea per icon',
        'minimal noise around edges'
      ]
    },
    character_portrait: {
      composition: 'bust portrait with face clearly visible',
      must_include: [
        'profession-specific accessory or clothing cue',
        'stable head crop',
        'clean background'
      ],
      must_avoid: [
        'full body pose',
        'multiple characters',
        'face obstruction'
      ],
      acceptance_checks: [
        'profession identity is obvious',
        'portrait crop works in UI',
        'face remains readable at small size'
      ]
    },
    boss_portrait: {
      composition: 'single threatening boss bust portrait',
      must_include: [
        'menacing silhouette',
        'strong face read',
        'boss-specific visual identity'
      ],
      must_avoid: [
        'cute expression',
        'crowd',
        'full battle scene',
        'soft mascot look'
      ],
      acceptance_checks: [
        'feels like a boss',
        'still readable at 32px',
        'not mistaken for a regular unit'
      ]
    }
  }
}

const REVIEW_RUBRICS = {
  version: '1.0.0',
  review_mode: 'heuristic_screen_only',
  semantic_review_required_for_final: true,
  categories: {
    terrain: {
      description: 'Terrain must read as continuous outdoor ground material with no border, no center object, and no scene illustration.',
      critical_metrics: ['coverage', 'continuity', 'variation', 'naturality'],
      score_threshold: 85,
      critical_threshold: 80
    },
    resource_node: {
      description: 'Resource nodes must present one clear resource subject on transparent background with strong small-size readability.',
      critical_metrics: ['silhouette', 'readability', 'subject_scale'],
      score_threshold: 82,
      critical_threshold: 80
    },
    building_map: {
      description: 'Buildings must keep a consistent map-view angle, strong outline, and readable mass at 32px.',
      critical_metrics: ['silhouette', 'readability', 'map_scale'],
      score_threshold: 82,
      critical_threshold: 80
    },
    ui_icon_fallback: {
      description: 'UI icons must communicate one idea with minimal clutter and clean transparency.',
      critical_metrics: ['silhouette', 'readability'],
      score_threshold: 82,
      critical_threshold: 80
    },
    character_portrait: {
      description: 'Character portraits must have obvious profession identity and a stable UI-friendly face crop.',
      critical_metrics: ['face_scale', 'readability'],
      score_threshold: 82,
      critical_threshold: 80
    },
    boss_portrait: {
      description: 'Boss portraits must look threatening, distinct, and readable as boss-grade characters.',
      critical_metrics: ['face_scale', 'readability'],
      score_threshold: 82,
      critical_threshold: 80
    }
  }
}

const REVIEW_FEEDBACK_DEFAULT = {
  version: '1.0.0',
  generatedAt: null,
  categories: {
    terrain: {
      observed_failures: {},
      enforced_additions: {
        must_include: [],
        must_avoid: [],
        acceptance_checks: [],
        notes: []
      }
    },
    resource_node: {
      observed_failures: {},
      enforced_additions: {
        must_include: [],
        must_avoid: [],
        acceptance_checks: [],
        notes: []
      }
    },
    building_map: {
      observed_failures: {},
      enforced_additions: {
        must_include: [],
        must_avoid: [],
        acceptance_checks: [],
        notes: []
      }
    },
    ui_icon_fallback: {
      observed_failures: {},
      enforced_additions: {
        must_include: [],
        must_avoid: [],
        acceptance_checks: [],
        notes: []
      }
    },
    character_portrait: {
      observed_failures: {},
      enforced_additions: {
        must_include: [],
        must_avoid: [],
        acceptance_checks: [],
        notes: []
      }
    },
    boss_portrait: {
      observed_failures: {},
      enforced_additions: {
        must_include: [],
        must_avoid: [],
        acceptance_checks: [],
        notes: []
      }
    }
  }
}

const PIPELINE_CONFIG = {
  version: '1.0.0',
  comfyui: {
    baseUrl: 'http://127.0.0.1:8188',
    outputDir: 'D:\\teae\\openclaw\\ComfyUI\\output'
  },
  monitoring: {
    intervalMinutes: 10,
    minimumDurationHours: 8,
    queueBatchSize: 4,
    maxPendingReviews: 12,
    maxAttemptsPerAsset: 48,
    historyLimit: 144
  },
  review: {
    reviewerVersion: 'heuristic_v2',
    scoreThreshold: 85,
    criticalScoreThreshold: 80,
    semanticReviewRequiredForFinal: true,
    semanticReviewMode: 'deepseek_text_assist',
    semanticReviewProvider: 'deepseek',
    semanticReviewModel: 'deepseek-chat'
  },
  generation: {
    localFallbackEnabled: true,
    localFallbackStartAttempt: 7
  },
  promotion: {
    liveMode: 'manual_only'
  }
}

const STYLE_PROFILES = [
  {
    id: 'idle_collective_pastel_map_v1',
    label: 'Idle Collective pastel map art',
    description: 'Warm, readable map art inspired by soft storybook 2D illustration.',
    model: {
      checkpoint: 'AWPainting_v1.3.safetensors',
      sampler: 'dpmpp_2m',
      scheduler: 'karras',
      steps: 35,
      cfg: 5.5
    },
    loras: [],
    negative_prompt: COMMON_NEGATIVE_PROMPT,
    palette: ['#E8B4B8', '#A8D8B9', '#F4D03F', '#F5E6D3', '#9B8AA5', '#7CBA5F'],
    seed_ranges: {
      terrain: { start: 1000, end: 1999 },
      resource_node: { start: 2000, end: 2999 },
      building_map: { start: 3000, end: 3999 },
      ui_icon_fallback: { start: 4000, end: 4999 },
      character_portrait: { start: 5000, end: 5999 },
      boss_portrait: { start: 6000, end: 6999 }
    },
    postprocess: {
      safe_margin: 8,
      alpha_threshold: 12,
      blur_threshold: 0.18
    }
  }
]

const RECIPE_DEFINITIONS = [
  {
    id: 'terrain_tile',
    category: 'terrain',
    workflow: 'terrain_workflow',
    candidate_count: 6,
    source_resolution: { width: 256, height: 256 },
    export_presets: [
      { name: '32', width: 32, height: 32, fit: 'cover' },
      { name: '64', width: 64, height: 64, fit: 'cover' },
      { name: '128', width: 128, height: 128, fit: 'cover' }
    ],
    background: 'opaque',
    camera: 'top_down',
    prompt_template:
      'natural terrain texture only, {subject}, pure outdoor ground surface, seamless edge-to-edge ground fill, aerial texture swatch, flat terrain material, micro variation across the whole frame, no border, no frame, no vignette, no centered subject, no focal point, no island, no patch, no disk, no ring, no medallion, no circular composition, no radial composition, no landscape, no sky, no horizon, soft painterly shading, warm pastel palette, texture asset'
  },
  {
    id: 'resource_node_icon',
    category: 'resource_node',
    workflow: 'resource_workflow',
    candidate_count: 6,
    source_resolution: { width: 256, height: 256 },
    export_presets: [
      { name: '32', width: 32, height: 32, fit: 'contain' },
      { name: '64', width: 64, height: 64, fit: 'contain' },
      { name: '128', width: 128, height: 128, fit: 'contain' }
    ],
    background: 'transparent',
    camera: 'top_down',
    prompt_template:
      'storybook game resource node, volcano daughter inspired softness, {subject}, single subject, top-down map icon, transparent background, warm pastel palette, readable silhouette, game asset'
  },
  {
    id: 'building_map_icon',
    category: 'building_map',
    workflow: 'building_workflow',
    candidate_count: 8,
    source_resolution: { width: 256, height: 256 },
    export_presets: [
      { name: '32', width: 32, height: 32, fit: 'contain' },
      { name: '64', width: 64, height: 64, fit: 'contain' },
      { name: '128', width: 128, height: 128, fit: 'contain' }
    ],
    background: 'transparent',
    camera: 'three_quarter_top_down',
    prompt_template:
      'storybook game building, volcano daughter inspired softness, {subject}, top-down building icon, readable silhouette at 32px, warm pastel palette, transparent background, consistent light from top left, game asset'
  },
  {
    id: 'ui_fallback_icon',
    category: 'ui_icon_fallback',
    workflow: 'resource_workflow',
    candidate_count: 4,
    source_resolution: { width: 128, height: 128 },
    export_presets: [
      { name: '32', width: 32, height: 32, fit: 'contain' },
      { name: '64', width: 64, height: 64, fit: 'contain' },
      { name: '128', width: 128, height: 128, fit: 'contain' }
    ],
    background: 'transparent',
    camera: 'icon',
    prompt_template:
      'storybook UI icon, volcano daughter inspired softness, {subject}, centered symbol, clean silhouette, warm pastel palette, transparent background, game UI asset'
  },
  {
    id: 'character_portrait',
    category: 'character_portrait',
    workflow: 'portrait_workflow',
    candidate_count: 6,
    source_resolution: { width: 256, height: 256 },
    export_presets: [
      { name: '32', width: 32, height: 32, fit: 'contain' },
      { name: '64', width: 64, height: 64, fit: 'contain' },
      { name: '128', width: 128, height: 128, fit: 'contain' }
    ],
    background: 'transparent',
    camera: 'portrait',
    prompt_template:
      'storybook game character portrait, volcano daughter inspired softness, {subject}, bust portrait, forward-facing, readable face at 64px, warm pastel palette, transparent background, game portrait asset'
  },
  {
    id: 'boss_portrait',
    category: 'boss_portrait',
    workflow: 'portrait_workflow',
    candidate_count: 6,
    source_resolution: { width: 256, height: 256 },
    export_presets: [
      { name: '32', width: 32, height: 32, fit: 'contain' },
      { name: '64', width: 64, height: 64, fit: 'contain' },
      { name: '128', width: 128, height: 128, fit: 'contain' }
    ],
    background: 'transparent',
    camera: 'portrait',
    prompt_template:
      'storybook game boss portrait, volcano daughter inspired softness, {subject}, intimidating bust portrait, readable silhouette at 64px, warm pastel palette, transparent background, game portrait asset'
  }
]

const TERRAIN_VARIANT_SUBJECTS = {
  grass: [
    { suffix: 'a', displayName: 'Grass tile meadow', subject: 'continuous dry meadow grass with tiny flower specks and uneven turf texture across the frame' },
    { suffix: 'b', displayName: 'Grass tile moss', subject: 'continuous mossy grass carpet with clover specks and soft uneven turf texture across the frame' },
    { suffix: 'c', displayName: 'Grass tile field', subject: 'broad warm grass field with small weeds and lightly mottled turf texture across the frame' },
    { suffix: 'd', displayName: 'Grass tile plain', subject: 'wide soft grass plain with sparse weed tufts and subtle soil undertones across the frame' },
    { suffix: 'e', displayName: 'Grass tile prairie', subject: 'sunlit prairie grass with mixed short blades, faint earth patches, and no distinct focal area' }
  ],
  forest: [
    { suffix: 'a', displayName: 'Forest tile canopy', subject: 'dense forest floor hidden by layered tree canopy shadows and moss' },
    { suffix: 'b', displayName: 'Forest tile grove', subject: 'woodland ground with roots, leaf litter, and darker evergreen patches' },
    { suffix: 'c', displayName: 'Forest tile underbrush', subject: 'wild underbrush with ferns, shrubs, and broken leaf cover' }
  ],
  mountain: [
    { suffix: 'a', displayName: 'Mountain tile rocky', subject: 'rugged rocky highland with broken stone slabs and sparse scrub' },
    { suffix: 'b', displayName: 'Mountain tile ridge', subject: 'weathered mountain ridge with dusty rock shelves and gravel seams' },
    { suffix: 'c', displayName: 'Mountain tile cliff', subject: 'harsh stony ground with fractured boulders and cold mineral streaks' }
  ],
  water: [
    { suffix: 'a', displayName: 'Water tile shallows', subject: 'clear shallow water with drifting ripples and sandy undertone' },
    { suffix: 'b', displayName: 'Water tile stream', subject: 'cool blue water with soft current lines and natural depth shifts' },
    { suffix: 'c', displayName: 'Water tile pond', subject: 'quiet pond surface with subtle algae tint and wind-made wavelets' }
  ],
  sand: [
    { suffix: 'a', displayName: 'Sand tile dunes', subject: 'warm dune sand with wind lines and soft natural gradients' },
    { suffix: 'b', displayName: 'Sand tile beach', subject: 'sunlit sandy ground with tiny pebbles and slightly damp patches' },
    { suffix: 'c', displayName: 'Sand tile dry', subject: 'dry sandy plain with pale dust swirls and sparse rough texture' }
  ],
  snow: [
    { suffix: 'a', displayName: 'Snow tile powder', subject: 'fresh powder snow with gentle drifts and cool blue shadows' },
    { suffix: 'b', displayName: 'Snow tile wind', subject: 'wind-swept snowfield with icy grain and uneven packed surfaces' },
    { suffix: 'c', displayName: 'Snow tile frost', subject: 'frosted snow ground with faint crystal texture and compressed tracks erased by weather' }
  ]
}

const TERRAIN_ASSETS = Object.entries(TERRAIN_VARIANT_SUBJECTS).flatMap(([targetKey, variants]) =>
  variants.map((variant, index) => ({
    assetId: `terrain_${targetKey}${index === 0 ? '' : `_${variant.suffix}`}`,
    targetKey,
    displayName: variant.displayName,
    subject: variant.subject
  }))
)

const RESOURCE_NODE_ASSETS = [
  { assetId: 'resource_tree', targetKey: 'wood', displayName: 'Tree node', subject: 'small resource tree' },
  { assetId: 'resource_rock', targetKey: 'stone', displayName: 'Rock node', subject: 'stone boulder resource' },
  { assetId: 'resource_crop', targetKey: 'food', displayName: 'Crop node', subject: 'wild crop patch' },
  { assetId: 'resource_ore', targetKey: 'gold', displayName: 'Ore node', subject: 'gold ore rock' }
]

const BUILDING_MAP_ASSETS = [
  { assetId: 'building_lumber_mill', targetKey: 'lumber_mill', displayName: 'Lumber mill', subject: 'small lumber mill with logs' },
  { assetId: 'building_quarry', targetKey: 'quarry', displayName: 'Quarry', subject: 'compact quarry with crane and stone' },
  { assetId: 'building_farm', targetKey: 'farm', displayName: 'Farm', subject: 'farm with grain field and shed' },
  { assetId: 'building_warehouse', targetKey: 'warehouse', displayName: 'Warehouse', subject: 'warehouse with stacked crates' },
  { assetId: 'building_kitchen', targetKey: 'kitchen', displayName: 'Kitchen', subject: 'cozy settlement kitchen' },
  { assetId: 'building_house', targetKey: 'house', displayName: 'House', subject: 'warm village house' },
  { assetId: 'building_trade_station', targetKey: 'trade_station', displayName: 'Trade station', subject: 'trade station with awning and goods' },
  { assetId: 'building_barracks', targetKey: 'barracks', displayName: 'Barracks', subject: 'small barracks with banners' },
  { assetId: 'building_recruitment_station', targetKey: 'recruitment_station', displayName: 'Recruitment station', subject: 'recruitment camp with tent and board' },
  { assetId: 'building_research_desk', targetKey: 'research_desk', displayName: 'Research desk', subject: 'research desk with books and instruments' }
]

const UI_ICON_ASSETS = [
  { assetId: 'ui_resource_wood', targetKey: 'wood', displayName: 'Wood icon', subject: 'wood resource icon' },
  { assetId: 'ui_resource_stone', targetKey: 'stone', displayName: 'Stone icon', subject: 'stone resource icon' },
  { assetId: 'ui_resource_food', targetKey: 'food', displayName: 'Food icon', subject: 'food resource icon' },
  { assetId: 'ui_resource_gold', targetKey: 'gold', displayName: 'Gold icon', subject: 'gold coin icon' },
  { assetId: 'ui_resource_core_parts', targetKey: 'core_parts', displayName: 'Core parts icon', subject: 'mechanical core parts icon' },
  { assetId: 'ui_character_default', targetKey: 'character_default', displayName: 'Character avatar', subject: 'friendly villager portrait icon' },
  { assetId: 'ui_boss_default', targetKey: 'boss_default', displayName: 'Boss avatar', subject: 'boss monster portrait icon' },
  { assetId: 'ui_profession_gatherer', targetKey: 'gatherer', displayName: 'Gatherer icon', subject: 'gatherer profession icon' },
  { assetId: 'ui_profession_builder', targetKey: 'builder', displayName: 'Builder icon', subject: 'builder profession icon' },
  { assetId: 'ui_profession_farmer', targetKey: 'farmer', displayName: 'Farmer icon', subject: 'farmer profession icon' },
  { assetId: 'ui_profession_warrior', targetKey: 'warrior', displayName: 'Warrior icon', subject: 'warrior profession icon' },
  { assetId: 'ui_profession_researcher', targetKey: 'researcher', displayName: 'Researcher icon', subject: 'researcher profession icon' },
  { assetId: 'ui_building_default', targetKey: 'building_default', displayName: 'Building fallback icon', subject: 'settlement building fallback icon' },
  { assetId: 'ui_resource_default', targetKey: 'resource_default', displayName: 'Resource fallback icon', subject: 'resource fallback icon' },
  { assetId: 'ui_terrain_default', targetKey: 'terrain_default', displayName: 'Terrain fallback icon', subject: 'terrain fallback icon' }
]

const CHARACTER_PORTRAIT_ASSETS = [
  { assetId: 'character_portrait_farmer', targetKey: 'farmer', displayName: 'Farmer portrait', subject: 'friendly frontier farmer with straw hat and sun-worn clothing' },
  { assetId: 'character_portrait_hunter', targetKey: 'hunter', displayName: 'Hunter portrait', subject: 'keen-eyed hunter with forest cloak and rugged travel gear' },
  { assetId: 'character_portrait_warrior', targetKey: 'warrior', displayName: 'Warrior portrait', subject: 'confident warrior with simple armor and determined expression' },
  { assetId: 'character_portrait_engineer', targetKey: 'engineer', displayName: 'Engineer portrait', subject: 'resourceful engineer with tool belt and practical workwear' },
  { assetId: 'character_portrait_cook', targetKey: 'cook', displayName: 'Cook portrait', subject: 'warm-hearted camp cook with apron and lively expression' },
  { assetId: 'character_portrait_doctor', targetKey: 'doctor', displayName: 'Doctor portrait', subject: 'calm frontier doctor with satchel and clean clinic colors' },
  { assetId: 'character_portrait_scholar', targetKey: 'scholar', displayName: 'Scholar portrait', subject: 'thoughtful scholar with notebook, scarf, and curious gaze' }
]

const BOSS_PORTRAIT_ASSETS = [
  { assetId: 'boss_portrait_01', targetKey: 'boss_01', displayName: 'Boss portrait 01', subject: 'feral goblin war chief with scarred face and crude crown' },
  { assetId: 'boss_portrait_02', targetKey: 'boss_02', displayName: 'Boss portrait 02', subject: 'hulking stone demon with cracked basalt horns and glowing core' },
  { assetId: 'boss_portrait_03', targetKey: 'boss_03', displayName: 'Boss portrait 03', subject: 'shadow knight with broken visor and pale spectral fire' },
  { assetId: 'boss_portrait_04', targetKey: 'boss_04', displayName: 'Boss portrait 04', subject: 'blazing infernal lord with ember mane and molten eyes' },
  { assetId: 'boss_portrait_05', targetKey: 'boss_05', displayName: 'Boss portrait 05', subject: 'ancient dragon with weathered scales, horns, and legendary menace' }
]

const CATEGORY_DEFINITIONS = {
  terrain: {
    recipeId: 'terrain_tile',
    items: TERRAIN_ASSETS
  },
  resource_node: {
    recipeId: 'resource_node_icon',
    items: RESOURCE_NODE_ASSETS
  },
  building_map: {
    recipeId: 'building_map_icon',
    items: BUILDING_MAP_ASSETS
  },
  ui_icon_fallback: {
    recipeId: 'ui_fallback_icon',
    items: UI_ICON_ASSETS
  },
  character_portrait: {
    recipeId: 'character_portrait',
    items: CHARACTER_PORTRAIT_ASSETS
  },
  boss_portrait: {
    recipeId: 'boss_portrait',
    items: BOSS_PORTRAIT_ASSETS
  }
}

const RUNTIME_MAPPING = {
  terrain: {
    grass: ['terrain_grass', 'terrain_grass_b', 'terrain_grass_c'],
    forest: ['terrain_forest', 'terrain_forest_b', 'terrain_forest_c'],
    mountain: ['terrain_mountain', 'terrain_mountain_b', 'terrain_mountain_c'],
    water: ['terrain_water', 'terrain_water_b', 'terrain_water_c'],
    sand: ['terrain_sand', 'terrain_sand_b', 'terrain_sand_c'],
    snow: ['terrain_snow', 'terrain_snow_b', 'terrain_snow_c']
  },
  resourceNodes: {
    wood: 'resource_tree',
    stone: 'resource_rock',
    food: 'resource_crop',
    gold: 'resource_ore'
  },
  resourceUi: {
    wood: 'ui_resource_wood',
    stone: 'ui_resource_stone',
    food: 'ui_resource_food',
    gold: 'ui_resource_gold',
    core_parts: 'ui_resource_core_parts'
  },
  buildings: {
    lumber_mill: 'building_lumber_mill',
    quarry: 'building_quarry',
    farm: 'building_farm',
    warehouse: 'building_warehouse',
    kitchen: 'building_kitchen',
    house: 'building_house',
    trade_station: 'building_trade_station',
    barracks: 'building_barracks',
    recruitment_station: 'building_recruitment_station',
    research_desk: 'building_research_desk'
  },
  professions: {
    gatherer: 'ui_profession_gatherer',
    builder: 'ui_profession_builder',
    farmer: 'ui_profession_farmer',
    warrior: 'ui_profession_warrior',
    hunter: 'ui_profession_gatherer',
    engineer: 'ui_profession_builder',
    scholar: 'ui_profession_researcher',
    researcher: 'ui_profession_researcher',
    cook: 'ui_profession_farmer',
    chef: 'ui_profession_farmer',
    doctor: 'ui_profession_researcher'
  },
  characterPortraits: {
    gatherer: 'character_portrait_hunter',
    builder: 'character_portrait_engineer',
    farmer: 'character_portrait_farmer',
    warrior: 'character_portrait_warrior',
    hunter: 'character_portrait_hunter',
    engineer: 'character_portrait_engineer',
    scholar: 'character_portrait_scholar',
    researcher: 'character_portrait_scholar',
    cook: 'character_portrait_cook',
    chef: 'character_portrait_cook',
    doctor: 'character_portrait_doctor'
  },
  bossPortraits: {
    boss_01: 'boss_portrait_01',
    boss_02: 'boss_portrait_02',
    boss_03: 'boss_portrait_03',
    boss_04: 'boss_portrait_04',
    boss_05: 'boss_portrait_05'
  },
  ui: {
    character_default: 'ui_character_default',
    boss_default: 'ui_boss_default',
    building_default: 'ui_building_default',
    resource_default: 'ui_resource_default',
    terrain_default: 'ui_terrain_default'
  }
}

function getRecipeById(recipeId) {
  return RECIPE_DEFINITIONS.find(recipe => recipe.id === recipeId)
}

function buildAssetCatalog() {
  const styleProfile = STYLE_PROFILES[0]

  return Object.entries(CATEGORY_DEFINITIONS).flatMap(([category, definition]) => {
    const recipe = getRecipeById(definition.recipeId)

    return definition.items.map((item, index) => {
      const seedPool = category
      return {
        asset_id: item.assetId,
        category,
        target_key: item.targetKey,
        display_name: item.displayName,
        recipe_id: recipe.id,
        style_profile: styleProfile.id,
        prompt_template: recipe.prompt_template.replace('{subject}', item.subject),
        negative_prompt: [
          styleProfile.negative_prompt,
          CATEGORY_NEGATIVE_PROMPTS[category]
        ].filter(Boolean).join(', '),
        seed_policy: {
          pool: seedPool,
          mode: 'sequential_from_range',
          suggested_seed: styleProfile.seed_ranges[seedPool].start + index
        },
        source_resolution: recipe.source_resolution,
        export_presets: recipe.export_presets,
        approved_variant: 'cand01',
        version: 'v001',
        status: 'approved',
        source_kind: 'placeholder_seeded',
        notes: 'Starter placeholder asset generated by the repository bootstrap script.'
      }
    })
  })
}

module.exports = {
  COMMON_NEGATIVE_PROMPT,
  CATEGORY_NEGATIVE_PROMPTS,
  GENERATION_STANDARDS,
  REVIEW_RUBRICS,
  REVIEW_FEEDBACK_DEFAULT,
  PIPELINE_CONFIG,
  STYLE_PROFILES,
  RECIPE_DEFINITIONS,
  CATEGORY_DEFINITIONS,
  RUNTIME_MAPPING,
  buildAssetCatalog
}
