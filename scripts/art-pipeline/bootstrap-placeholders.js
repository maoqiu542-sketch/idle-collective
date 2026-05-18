const fs = require('node:fs')
const path = require('node:path')
const {
  assetMetaPath,
  sourceFilePaths,
  assetSourceDir,
  ensureDir,
  loadSpecs,
  paths,
  readAssetMeta,
  writeAssetMeta
} = require('./shared')

const { catalog } = loadSpecs()

function terrainSvg(targetKey, assetId) {
  const studyVariantMap = {
    forest: ['canopy', 'grove', 'underbrush'],
    mountain: ['ridge', 'cliff', 'scree'],
    water: ['ripples', 'shallows', 'current'],
    sand: ['dunes', 'dry', 'beach'],
    snow: ['powder', 'wind', 'frost']
  }
  const variantIndex = assetId.endsWith('_b') ? 1 : assetId.endsWith('_c') ? 2 : 0
  const studyVariant = studyVariantMap[targetKey]?.[variantIndex]
  if (studyVariant) {
    const studyPath = path.join(paths.reportsDir, 'terrain-studies-round2', `terrain_${targetKey}_${studyVariant}.svg`)
    if (fs.existsSync(studyPath)) {
      return fs.readFileSync(studyPath, 'utf8')
    }
  }

  const configs = {
    grass: [
      {
      background: '#7CBA5F',
      accents:
        '<path d="M0 154 C44 130 88 138 122 168 S198 194 256 160 V256 H0 Z" fill="#5A8E44" opacity="0.82" /><path d="M18 92 C60 70 88 74 118 98 S178 126 224 98" stroke="#9EDB7F" stroke-width="14" stroke-linecap="round" fill="none" opacity="0.35" />'
      },
      {
        background: '#79B55E',
        accents:
        '<path d="M0 178 C38 140 82 136 120 154 S200 186 256 150 V256 H0 Z" fill="#6A9C4E" opacity="0.84" /><path d="M36 112 C80 94 118 96 154 118 S214 138 248 120" stroke="#A7D688" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.42" />'
      },
      {
        background: '#75AF58',
        accents:
        '<path d="M0 164 C42 150 90 148 126 172 S206 196 256 174 V256 H0 Z" fill="#5F9446" opacity="0.8" /><path d="M24 138 C62 116 102 116 142 136 S210 156 252 138" stroke="#B5E090" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.36" />'
      }
    ],
    forest: [
      {
      background: '#335C3B',
      accents:
        '<circle cx="60" cy="82" r="34" fill="#416E47" /><circle cx="132" cy="120" r="48" fill="#5A8C5A" /><circle cx="206" cy="88" r="36" fill="#2E5436" /><path d="M18 190 C64 162 120 162 172 188" stroke="#7BB07A" stroke-width="16" stroke-linecap="round" fill="none" opacity="0.24" />'
      },
      {
        background: '#2E5636',
        accents:
        '<circle cx="72" cy="72" r="30" fill="#4E8350" /><circle cx="124" cy="108" r="38" fill="#739D67" /><circle cx="182" cy="144" r="32" fill="#3D7044" /><circle cx="210" cy="84" r="24" fill="#27482D" />'
      },
      {
        background: '#365F3D',
        accents:
        '<circle cx="50" cy="126" r="28" fill="#476F46" /><circle cx="112" cy="82" r="34" fill="#699669" /><circle cx="176" cy="114" r="44" fill="#315737" /><circle cx="220" cy="156" r="26" fill="#5A865B" />'
      }
    ],
    mountain: [
      {
      background: '#8B7355',
      accents:
        '<polygon points="12,210 72,92 134,210" fill="#6C5945" /><polygon points="104,202 170,66 248,202" fill="#A38B6B" /><path d="M26 174 L84 152 L112 182" stroke="#C8B296" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.44" />'
      },
      {
        background: '#887158',
        accents:
        '<polygon points="22,202 86,82 148,202" fill="#5B4C3B" /><polygon points="120,212 176,96 238,212" fill="#9A8264" /><path d="M0 170 C34 150 82 146 122 164" stroke="#D6C3A8" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.35" />'
      },
      {
        background: '#81705B',
        accents:
        '<polygon points="8,210 66,112 122,210" fill="#6A5947" /><polygon points="92,198 164,74 242,198" fill="#B09979" /><path d="M128 196 L178 154 L228 190" stroke="#DDD0BA" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.4" />'
      }
    ],
    water: [
      {
      background: '#4A90D9',
      accents:
        '<path d="M0 110 C34 92 74 94 108 112 S178 134 214 116 238 102 256 112 V256 H0 Z" fill="#7BB9F0" opacity="0.74" /><path d="M16 84 C54 70 92 72 126 84 S202 98 242 82" stroke="#A8D8FF" stroke-width="9" stroke-linecap="round" fill="none" opacity="0.34" />'
      },
      {
        background: '#4D93D4',
        accents:
        '<path d="M0 126 C44 102 82 106 126 126 S210 148 256 126 V256 H0 Z" fill="#6DB8E9" opacity="0.7" /><path d="M14 166 C58 148 116 150 164 170 S224 188 256 174" stroke="#8FD7F8" stroke-width="8" stroke-linecap="round" fill="none" opacity="0.38" />'
      },
      {
        background: '#4688CA',
        accents:
        '<path d="M0 144 C34 124 76 124 120 146 S202 168 256 144 V256 H0 Z" fill="#72C0F4" opacity="0.72" /><path d="M0 88 C40 76 90 76 136 92 S212 112 256 96" stroke="#A5E4FF" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.3" />'
      }
    ],
    sand: [
      {
      background: '#E8D4A8',
      accents:
        '<path d="M0 166 C44 148 104 148 148 168 S214 184 256 166" stroke="#D0BE93" stroke-width="18" stroke-linecap="round" fill="none" opacity="0.72" /><path d="M28 104 C64 92 110 94 150 108 S218 126 248 118" stroke="#F4E7C8" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.42" />'
      },
      {
        background: '#E6CF9D',
        accents:
        '<path d="M10 142 C60 120 118 122 170 144 S224 168 246 156" stroke="#C8B387" stroke-width="16" stroke-linecap="round" fill="none" opacity="0.68" /><circle cx="74" cy="182" r="8" fill="#D7BF93" opacity="0.64" />'
      },
      {
        background: '#EAD8AD',
        accents:
        '<path d="M0 182 C40 154 88 152 134 172 S206 194 256 178" stroke="#D6C394" stroke-width="14" stroke-linecap="round" fill="none" opacity="0.66" /><path d="M34 78 C88 62 138 66 188 86" stroke="#F6E8C2" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.32" />'
      }
    ],
    snow: [
      {
      background: '#E8F3FF',
      accents:
        '<path d="M0 160 C52 136 106 138 150 156 S220 178 256 164" fill="#D7E9FB" opacity="0.6" /><path d="M24 102 C72 86 122 88 166 102 S224 122 252 112" stroke="#FFFFFF" stroke-width="12" stroke-linecap="round" fill="none" opacity="0.54" />'
      },
      {
        background: '#EDF6FF',
        accents:
        '<path d="M12 142 C48 120 98 120 146 140 S214 164 244 154" fill="#DCEBFA" opacity="0.64" /><path d="M18 188 C58 172 104 172 146 188 S208 202 244 190" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" fill="none" opacity="0.44" />'
      },
      {
        background: '#EAF4FF',
        accents:
        '<path d="M0 120 C46 104 98 104 150 122 S216 144 256 132" fill="#D4E7FB" opacity="0.58" /><circle cx="76" cy="72" r="14" fill="#FFFFFF" opacity="0.78" /><circle cx="176" cy="170" r="18" fill="#DDEFFF" opacity="0.86" />'
      }
    ]
  }

  const terrainVariants = configs[targetKey] || configs.grass
  const config = terrainVariants[variantIndex] || terrainVariants[0]
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="${config.background}" />
  ${config.accents}
</svg>`
}

function resourceSvg(targetKey) {
  const configs = {
    wood: '<rect x="116" y="110" width="24" height="74" rx="8" fill="#7B573A" /><circle cx="128" cy="84" r="46" fill="#6CAF67" /><circle cx="92" cy="96" r="24" fill="#4E8A54" /><circle cx="164" cy="102" r="28" fill="#7FC37C" />',
    stone: '<path d="M62 154 L96 84 L156 74 L196 116 L184 176 L114 194 Z" fill="#9AA6B2" /><path d="M92 120 L132 100 L154 148 L116 164 Z" fill="#D8E0E8" opacity="0.55" />',
    food: '<path d="M74 162 C82 112 110 84 128 70 C148 84 174 116 182 162" fill="#C6B04D" /><path d="M128 54 C116 82 96 100 76 112" stroke="#6DAE52" stroke-width="12" stroke-linecap="round" fill="none" /><path d="M128 54 C142 82 164 100 184 114" stroke="#7FC37C" stroke-width="12" stroke-linecap="round" fill="none" />',
    gold: '<path d="M70 160 L96 92 L152 84 L192 126 L172 182 L104 190 Z" fill="#7E746A" /><path d="M114 118 L134 108 L154 122 L146 148 L120 150 L104 132 Z" fill="#F4D03F" /><path d="M84 170 L98 146 L122 156 L116 182 Z" fill="#F7E07B" />'
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="36" fill="rgba(255,255,255,0.02)" />
  ${configs[targetKey] || configs.wood}
  <ellipse cx="128" cy="198" rx="68" ry="18" fill="rgba(38,30,24,0.18)" />
</svg>`
}

function buildingSvg(targetKey) {
  const configs = {
    lumber_mill: '<rect x="72" y="124" width="110" height="72" rx="14" fill="#C69258" /><polygon points="62,128 126,74 190,128" fill="#8E5E3A" /><rect x="140" y="92" width="24" height="44" rx="8" fill="#9E6C46" /><rect x="52" y="168" width="54" height="18" rx="8" fill="#B77A4A" />',
    quarry: '<rect x="72" y="132" width="104" height="58" rx="14" fill="#8B7355" /><polygon points="62,140 128,86 192,140" fill="#62513F" /><rect x="172" y="86" width="14" height="76" rx="6" fill="#6B5845" /><path d="M182 98 L214 78" stroke="#D7C5A3" stroke-width="8" stroke-linecap="round" />',
    farm: '<rect x="78" y="122" width="100" height="64" rx="12" fill="#E7C17B" /><polygon points="64,126 128,76 192,126" fill="#A46A3F" /><path d="M50 190 C70 146 96 146 116 190" stroke="#C9B04A" stroke-width="10" stroke-linecap="round" /><path d="M138 190 C158 146 186 146 206 190" stroke="#8EBB5C" stroke-width="10" stroke-linecap="round" />',
    warehouse: '<rect x="66" y="110" width="124" height="86" rx="14" fill="#B98754" /><polygon points="56,116 128,62 200,116" fill="#6E4B35" /><rect x="96" y="134" width="30" height="36" rx="6" fill="#8B5E3C" /><rect x="138" y="140" width="28" height="24" rx="4" fill="#D8B17C" />',
    kitchen: '<rect x="74" y="122" width="108" height="68" rx="14" fill="#D8A978" /><polygon points="62,126 128,72 194,126" fill="#A85C44" /><rect x="146" y="90" width="20" height="42" rx="6" fill="#8F6A57" /><circle cx="104" cy="156" r="12" fill="#F6D7A8" />',
    house: '<rect x="76" y="122" width="104" height="70" rx="14" fill="#E1B584" /><polygon points="60,128 128,70 196,128" fill="#A4624A" /><rect x="118" y="146" width="20" height="46" rx="8" fill="#8B5E3C" /><rect x="88" y="140" width="20" height="18" rx="4" fill="#D7ECFF" />',
    trade_station: '<rect x="70" y="130" width="116" height="60" rx="14" fill="#C9A06D" /><polygon points="60,134 128,82 196,134" fill="#6B4A68" /><rect x="82" y="116" width="92" height="16" rx="8" fill="#E56B6F" /><rect x="92" y="146" width="28" height="22" rx="4" fill="#F4D03F" />',
    barracks: '<rect x="72" y="120" width="110" height="72" rx="12" fill="#9C6A59" /><polygon points="60,126 128,74 196,126" fill="#5F4750" /><path d="M92 188 L92 110" stroke="#D9CAB3" stroke-width="10" /><path d="M164 188 L164 110" stroke="#D9CAB3" stroke-width="10" />',
    recruitment_station: '<path d="M80 188 L128 74 L176 188 Z" fill="#D6B681" /><rect x="110" y="132" width="36" height="56" rx="8" fill="#EFD8A5" /><rect x="168" y="112" width="14" height="56" rx="5" fill="#A46A3F" /><rect x="182" y="112" width="24" height="18" rx="4" fill="#E56B6F" />',
    research_desk: '<rect x="70" y="138" width="116" height="44" rx="12" fill="#9C7147" /><rect x="88" y="110" width="34" height="28" rx="6" fill="#D8E0E8" /><rect x="132" y="100" width="22" height="38" rx="6" fill="#9B8AA5" /><circle cx="174" cy="120" r="18" fill="#A8D8B9" />'
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="36" fill="rgba(255,255,255,0.02)" />
  ${configs[targetKey] || configs.house}
  <ellipse cx="128" cy="204" rx="76" ry="20" fill="rgba(25,20,18,0.16)" />
</svg>`
}

function uiSvg(targetKey) {
  const configs = {
    wood: '<rect x="92" y="88" width="72" height="96" rx="18" fill="#9C6A47" /><circle cx="128" cy="80" r="26" fill="#D6A57A" />',
    stone: '<path d="M70 170 L94 86 L170 72 L194 154 L134 194 Z" fill="#9AA6B2" /><path d="M106 126 L146 112 L154 146 L118 160 Z" fill="#D7E1E8" opacity="0.55" />',
    food: '<circle cx="128" cy="128" r="58" fill="#E7C76B" /><path d="M128 58 C118 86 104 102 84 116" stroke="#7CBF6A" stroke-width="14" stroke-linecap="round" fill="none" />',
    gold: '<circle cx="128" cy="128" r="56" fill="#F4D03F" /><circle cx="128" cy="128" r="36" fill="#F8E17D" />',
    core_parts: '<circle cx="128" cy="128" r="50" fill="#9B8AA5" /><path d="M128 70 L138 88 L158 90 L162 110 L180 122 L174 142 L186 160 L172 174 L176 194 L156 198 L142 214 L124 208 L106 214 L94 198 L74 194 L78 174 L64 160 L76 142 L70 122 L88 110 L92 90 L112 88 Z" fill="#D8E0E8" />',
    character_default: '<circle cx="128" cy="92" r="34" fill="#F5D5C8" /><rect x="82" y="130" width="92" height="60" rx="28" fill="#A8D8B9" />',
    boss_default: '<circle cx="128" cy="124" r="62" fill="#B85C61" /><circle cx="102" cy="114" r="14" fill="#F7E7DA" /><circle cx="154" cy="114" r="14" fill="#F7E7DA" /><path d="M92 162 Q128 186 164 162" stroke="#F7E7DA" stroke-width="12" stroke-linecap="round" fill="none" />',
    gatherer: '<path d="M98 168 C98 124 110 94 128 76 C146 94 158 124 158 168" fill="#7CBF6A" /><path d="M128 62 C112 88 96 104 76 118" stroke="#5E8F46" stroke-width="14" stroke-linecap="round" fill="none" /><path d="M128 62 C142 90 158 106 180 120" stroke="#8CCF71" stroke-width="14" stroke-linecap="round" fill="none" />',
    builder: '<rect x="82" y="132" width="92" height="56" rx="18" fill="#A97446" /><rect x="112" y="86" width="32" height="52" rx="10" fill="#F2D1A8" /><path d="M120 112 L176 84" stroke="#C9CBD6" stroke-width="14" stroke-linecap="round" /><path d="M174 82 Q190 92 182 108 L150 124" stroke="#8D90A3" stroke-width="12" stroke-linecap="round" fill="none" />',
    farmer: '<path d="M88 100 L128 74 L168 100 L154 112 H102 Z" fill="#A46A3F" /><circle cx="128" cy="130" r="32" fill="#F5D5C8" /><path d="M128 68 C118 92 104 108 84 122" stroke="#7CBF6A" stroke-width="12" stroke-linecap="round" fill="none" />',
    warrior: '<circle cx="128" cy="120" r="34" fill="#F5D5C8" /><path d="M96 90 L128 72 L160 90 L150 126 H106 Z" fill="#BFC6D8" /><path d="M174 92 L182 176" stroke="#D8E0E8" stroke-width="10" stroke-linecap="round" /><path d="M176 92 L194 102 L184 116" fill="#9B8AA5" />',
    researcher: '<circle cx="128" cy="116" r="32" fill="#F5D5C8" /><rect x="84" y="138" width="88" height="48" rx="18" fill="#8AB9D9" /><rect x="148" y="98" width="28" height="42" rx="8" fill="#F5E6D3" /><circle cx="116" cy="108" r="12" fill="none" stroke="#E8EDF5" stroke-width="6" /><path d="M126 116 L150 138" stroke="#E8EDF5" stroke-width="6" stroke-linecap="round" />',
    building_default: '<rect x="76" y="118" width="104" height="72" rx="14" fill="#C9A06D" /><polygon points="62,124 128,74 194,124" fill="#8E5E3A" />',
    resource_default: '<circle cx="128" cy="128" r="60" fill="#A8D8B9" /><circle cx="128" cy="128" r="24" fill="#F5E6D3" />',
    terrain_default: '<rect x="60" y="60" width="136" height="136" rx="28" fill="#7CBA5F" /><path d="M80 158 C104 126 146 126 174 158" stroke="#F5E6D3" stroke-width="18" stroke-linecap="round" fill="none" />'
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="48" fill="rgba(255,255,255,0.02)" />
  ${configs[targetKey] || configs.resource_default}
</svg>`
}

function characterPortraitSvg(targetKey) {
  const configs = {
    farmer: {
      skin: '#F1D1BE',
      hair: '#7A5D3F',
      headwear: '<path d="M84 86 L128 62 L172 86 L160 98 H96 Z" fill="#9B7245" /><rect x="96" y="88" width="64" height="12" rx="6" fill="#C9A06D" />',
      portrait: '<rect x="70" y="138" width="116" height="72" rx="34" fill="#D6A25C" /><path d="M90 148 Q128 138 166 148" stroke="#C48F4C" stroke-width="10" stroke-linecap="round" fill="none" />',
      clothing: '#D6A25C',
      accessory: '<path d="M92 170 C108 146 122 136 128 132 C136 138 150 148 166 170" stroke="#7CBF6A" stroke-width="8" stroke-linecap="round" fill="none" />'
    },
    hunter: {
      skin: '#EFD2C2',
      hair: '#5B4336',
      headwear: '<path d="M88 96 Q128 54 168 96" stroke="#4B6A47" stroke-width="18" fill="none" stroke-linecap="round" />',
      portrait: '<rect x="70" y="138" width="116" height="72" rx="34" fill="#628A61" /><path d="M86 136 L72 186 L110 174" fill="#4B6A47" opacity="0.85" />',
      clothing: '#628A61',
      accessory: '<path d="M160 116 L186 136" stroke="#8E6A4B" stroke-width="10" stroke-linecap="round" /><path d="M184 134 L174 152" stroke="#D9CAB3" stroke-width="8" stroke-linecap="round" />'
    },
    warrior: {
      skin: '#F2D7C8',
      hair: '#4E3B34',
      headwear: '<path d="M94 84 L128 64 L162 84 L152 114 H104 Z" fill="#C7C9D8" opacity="0.96" /><circle cx="128" cy="104" r="10" fill="#E5D6C7" />',
      portrait: '<rect x="68" y="138" width="120" height="72" rx="34" fill="#8F789F" /><path d="M82 148 L100 180 L118 150" fill="#6E5C82" /><path d="M174 148 L156 180 L138 150" fill="#6E5C82" />',
      clothing: '#8F789F',
      accessory: '<path d="M170 122 L182 176" stroke="#D8E0E8" stroke-width="8" stroke-linecap="round" />'
    },
    engineer: {
      skin: '#F3D7C9',
      hair: '#6F5A48',
      headwear: '<path d="M92 88 L112 76" stroke="#6F5A48" stroke-width="8" stroke-linecap="round" />',
      portrait: '<rect x="68" y="138" width="120" height="72" rx="34" fill="#7E93AF" /><rect x="146" y="156" width="34" height="16" rx="8" fill="#5C6C84" />',
      clothing: '#7E93AF',
      accessory: '<circle cx="166" cy="110" r="18" fill="#F5E6D3" opacity="0.9" /><circle cx="166" cy="110" r="10" fill="#A7B5C9" /><path d="M96 126 L110 140" stroke="#6F5A48" stroke-width="8" stroke-linecap="round" />'
    },
    cook: {
      skin: '#F4D8C8',
      hair: '#6A4F45',
      headwear: '<path d="M96 72 H160 V92 Q160 116 128 116 Q96 116 96 92 Z" fill="#FFF8EF" /><rect x="100" y="112" width="56" height="12" rx="6" fill="#FFF8EF" />',
      portrait: '<rect x="68" y="138" width="120" height="72" rx="34" fill="#D58A7E" /><path d="M116 144 H140 V184 H116 Z" fill="#F8E7DB" opacity="0.95" />',
      clothing: '#D58A7E',
      accessory: '<path d="M166 128 C176 128 184 136 184 146" stroke="#C9CBD6" stroke-width="8" stroke-linecap="round" fill="none" /><path d="M182 146 L174 160" stroke="#C9CBD6" stroke-width="8" stroke-linecap="round" />'
    },
    doctor: {
      skin: '#F1D4C6',
      hair: '#5D473D',
      headwear: '',
      portrait: '<rect x="68" y="138" width="120" height="72" rx="34" fill="#8AB8A8" /><rect x="108" y="144" width="40" height="54" rx="12" fill="#EAF4F1" opacity="0.78" />',
      clothing: '#8AB8A8',
      accessory: '<rect x="154" y="118" width="28" height="22" rx="6" fill="#F5E6D3" /><path d="M168 122 V136 M161 129 H175" stroke="#C85A58" stroke-width="4" stroke-linecap="round" />'
    },
    scholar: {
      skin: '#F3D8CB',
      hair: '#5F4E75',
      headwear: '<path d="M110 76 L128 62 L146 76" stroke="#5F4E75" stroke-width="8" stroke-linecap="round" />',
      portrait: '<rect x="68" y="138" width="120" height="72" rx="34" fill="#8977A2" /><path d="M88 152 H168" stroke="#73648B" stroke-width="8" stroke-linecap="round" />',
      clothing: '#8977A2',
      accessory: '<rect x="150" y="112" width="24" height="34" rx="6" fill="#F5E6D3" /><path d="M152 120 H170" stroke="#D6C8BA" stroke-width="4" stroke-linecap="round" /><path d="M152 128 H170" stroke="#D6C8BA" stroke-width="4" stroke-linecap="round" />'
    }
  }

  const config = configs[targetKey] || configs.farmer
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="48" fill="rgba(255,255,255,0.02)" />
  <circle cx="128" cy="96" r="38" fill="${config.skin}" />
  <path d="M90 110 Q128 72 166 110" stroke="${config.hair}" stroke-width="20" fill="none" stroke-linecap="round" opacity="0.9" />
  ${config.headwear}
  ${config.portrait}
  <circle cx="114" cy="98" r="5" fill="#5A473B" />
  <circle cx="142" cy="98" r="5" fill="#5A473B" />
  <path d="M112 118 Q128 128 144 118" stroke="#B86D63" stroke-width="6" fill="none" stroke-linecap="round" />
  ${config.accessory}
</svg>`
}

function bossPortraitSvg(targetKey) {
  const configs = {
    boss_01: {
      skin: '#93B46C',
      horns: '<path d="M88 92 Q74 64 92 48" stroke="#7A6044" stroke-width="14" fill="none" stroke-linecap="round" /><path d="M168 92 Q182 64 164 48" stroke="#7A6044" stroke-width="14" fill="none" stroke-linecap="round" />',
      eyes: '<path d="M96 114 L118 106 L110 120 Z" fill="#EEDB8A" /><path d="M160 114 L138 106 L146 120 Z" fill="#EEDB8A" />',
      face: '<path d="M96 150 Q128 138 160 150" stroke="#F0E7D4" stroke-width="10" fill="none" stroke-linecap="round" /><path d="M108 148 L116 162" stroke="#EFD9C7" stroke-width="7" stroke-linecap="round" /><path d="M148 162 L156 148" stroke="#EFD9C7" stroke-width="7" stroke-linecap="round" />',
      armor: '#8D5745'
    },
    boss_02: {
      skin: '#7A746F',
      horns: '<path d="M82 94 L64 66 L88 48" stroke="#524B46" stroke-width="16" fill="none" stroke-linecap="round" /><path d="M174 94 L192 66 L168 48" stroke="#524B46" stroke-width="16" fill="none" stroke-linecap="round" />',
      eyes: '<path d="M94 116 H118" stroke="#7FD8F6" stroke-width="10" stroke-linecap="round" /><path d="M138 116 H162" stroke="#7FD8F6" stroke-width="10" stroke-linecap="round" />',
      face: '<path d="M94 146 Q128 162 162 146" stroke="#D9D1C9" stroke-width="8" fill="none" stroke-linecap="round" /><path d="M108 150 L116 166" stroke="#EFE7DA" stroke-width="6" stroke-linecap="round" /><path d="M148 166 L156 150" stroke="#EFE7DA" stroke-width="6" stroke-linecap="round" />',
      armor: '#57514C'
    },
    boss_03: {
      skin: '#5A566D',
      horns: '<path d="M90 94 Q84 50 110 34" stroke="#C5C7E8" stroke-width="14" fill="none" stroke-linecap="round" /><path d="M166 94 Q172 50 146 34" stroke="#C5C7E8" stroke-width="14" fill="none" stroke-linecap="round" />',
      eyes: '<path d="M96 118 L120 108 L114 120 Z" fill="#DDE6FF" /><path d="M160 118 L136 108 L142 120 Z" fill="#DDE6FF" />',
      face: '<path d="M94 146 Q128 132 162 146" stroke="#EFE7DA" stroke-width="8" fill="none" stroke-linecap="round" /><path d="M102 144 L118 162" stroke="#EFE7DA" stroke-width="7" stroke-linecap="round" /><path d="M154 144 L138 162" stroke="#EFE7DA" stroke-width="7" stroke-linecap="round" />',
      armor: '#322D47'
    },
    boss_04: {
      skin: '#A55B48',
      horns: '<path d="M86 94 Q66 64 76 40" stroke="#3A2621" stroke-width="14" fill="none" stroke-linecap="round" /><path d="M170 94 Q190 64 180 40" stroke="#3A2621" stroke-width="14" fill="none" stroke-linecap="round" />',
      eyes: '<path d="M96 116 H118" stroke="#FFD28C" stroke-width="10" stroke-linecap="round" /><path d="M138 116 H160" stroke="#FFD28C" stroke-width="10" stroke-linecap="round" />',
      face: '<path d="M92 146 Q128 174 164 146" stroke="#F6DDC7" stroke-width="10" fill="none" stroke-linecap="round" /><path d="M104 148 L112 164" stroke="#F6DDC7" stroke-width="7" stroke-linecap="round" /><path d="M152 148 L144 164" stroke="#F6DDC7" stroke-width="7" stroke-linecap="round" />',
      armor: '#6C2F28'
    },
    boss_05: {
      skin: '#678A8C',
      horns: '<path d="M80 98 Q54 64 68 28" stroke="#D9C4A8" stroke-width="16" fill="none" stroke-linecap="round" /><path d="M176 98 Q202 64 188 28" stroke="#D9C4A8" stroke-width="16" fill="none" stroke-linecap="round" />',
      eyes: '<path d="M96 114 Q108 104 120 114" stroke="#F5E6D3" stroke-width="8" fill="none" stroke-linecap="round" /><path d="M136 114 Q148 104 160 114" stroke="#F5E6D3" stroke-width="8" fill="none" stroke-linecap="round" />',
      face: '<path d="M90 144 Q128 170 166 144" stroke="#F4E7D8" stroke-width="10" fill="none" stroke-linecap="round" /><path d="M100 146 L112 162" stroke="#F4E7D8" stroke-width="7" stroke-linecap="round" /><path d="M156 146 L144 162" stroke="#F4E7D8" stroke-width="7" stroke-linecap="round" />',
      armor: '#496367'
    }
  }

  const config = configs[targetKey] || configs.boss_01
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="48" fill="rgba(255,255,255,0.02)" />
  ${config.horns}
  <circle cx="128" cy="112" r="54" fill="${config.skin}" />
  <rect x="70" y="150" width="116" height="62" rx="28" fill="${config.armor}" />
  ${config.eyes}
  ${config.face}
</svg>`
}

function svgForAsset(asset) {
  if (asset.category === 'terrain') {
    return terrainSvg(asset.target_key, asset.asset_id)
  }
  if (asset.category === 'resource_node') {
    return resourceSvg(asset.target_key)
  }
  if (asset.category === 'building_map') {
    return buildingSvg(asset.target_key)
  }
  if (asset.category === 'character_portrait') {
    return characterPortraitSvg(asset.target_key)
  }
  if (asset.category === 'boss_portrait') {
    return bossPortraitSvg(asset.target_key)
  }
  return uiSvg(asset.target_key)
}

function main() {
  for (const asset of catalog.assets) {
    const sourceDir = assetSourceDir(asset)
    const { sourceSvg, candidateSvg } = sourceFilePaths(asset)
    ensureDir(sourceDir)

    if (readAssetMeta(asset)) {
      continue
    }

    const svgMarkup = svgForAsset(asset)
    fs.writeFileSync(sourceSvg, svgMarkup, 'utf8')
    fs.writeFileSync(candidateSvg, svgMarkup, 'utf8')

    writeAssetMeta(asset, {
      asset_id: asset.asset_id,
      category: asset.category,
      version: asset.version,
      status: asset.status,
      source_kind: asset.source_kind,
      approved_variant: asset.approved_variant,
      runtime_source: {
        kind: 'seeded',
        variant: null,
        path: sourceSvg,
        approved_at: new Date().toISOString()
      },
      review_queue: {
        status: 'clean',
        candidate_variant: null,
        updated_at: new Date().toISOString()
      },
      candidates: [
        {
          variant: 'cand01',
          path: candidateSvg,
          source_kind: 'placeholder_seeded',
          imported_at: new Date().toISOString()
        }
      ],
      source_files: {
        source: sourceSvg,
        candidate: candidateSvg
      },
      generated_at: new Date().toISOString()
    })

    console.log(`[art:bootstrap] seeded ${asset.asset_id}`)
  }
}

if (require.main === module) {
  main()
}

module.exports = {
  svgForAsset
}
