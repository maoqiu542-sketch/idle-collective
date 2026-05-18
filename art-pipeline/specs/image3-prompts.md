---
title: Idle Collective Image 3 Art Prompts
version: 0.1.0
created: 2026-04-29
status: draft-for-generation
style_direction: warm hand-painted storybook fantasy, Volcano Princess inspired softness
approval_policy: generated assets must be manually reviewed before live use
---

# Idle Collective Image 3 Prompts

This file is the source prompt sheet for generating the full art set with Image 3.

Confirmed decisions:

- Overall style: warm hand-painted storybook fantasy, soft painterly anime feeling, close to the mood of Volcano Princess.
- Character direction: all profession characters are young women / girls.
- Character animation scope: 7 professions x 5 strips each = 35 strips.
- Idle animation: not separate in this pass. Use the first walking frame as temporary idle.
- Boss scope: portraits only for this pass.
- Equipment scope: equipment slot icons first, not all individual equipment items.
- UI scope: replace all visible emoji-style UI icons with art assets over time.
- Runtime rule: no generated asset goes live until manually approved.

## Global Style Blocks

### STYLE_MAP_TILE

```text
Warm hand-painted 2D storybook fantasy game art, soft painterly shading, gentle natural colors, handcrafted feel, cohesive pastoral palette, clean readable shapes, subtle texture, no harsh digital gloss, no photorealism, no 3D render, no emoji style, no sticker outline. For terrain, treat the image as a tileable outdoor map square, not a floor panel and not a landscape illustration.
```

### STYLE_SPRITE_CHARACTER

```text
High-quality hand-painted 2D character sprite sheet for a cozy life-sim colony game. Warm storybook anime style, delicate painterly fantasy RPG feeling, soft gentle linework, warm natural colors, charming pastoral character design, elegant and handcrafted. Similar mood to a cozy narrative RPG character sprite. Not pixel art, not low resolution, not emoji, not sticker art.
```

### STYLE_UI_ICON

```text
Warm hand-painted 2D game UI icon, storybook fantasy style, soft painterly shading, clean silhouette, centered object, transparent background, readable at 32x32, cohesive warm pastoral palette, no text, no frame, no emoji style, no sticker outline, no photorealism.
```

### STYLE_PORTRAIT

```text
Warm hand-painted storybook anime portrait for a cozy colony life-sim game, soft painterly shading, gentle linework, expressive but restrained face, handcrafted fantasy RPG feeling, warm natural colors, transparent background, readable at 64x64, no frame, no text, no logo.
```

### NEGATIVE_COMMON

```text
low quality, blurry, muddy silhouette, text, watermark, logo, photorealistic, 3d render, plastic shine, harsh shadow, over-rendered fantasy art, noisy decorative detail, fake checkerboard transparency, grid lines, frame border, UI badge, cropped subject, inconsistent style, emoji, sticker, icon font, pixel art
```

## Generation Rules

- For terrain tiles, generate square source images at 1024x1024 or 512x512, then export 32/64/128. The source must be a seamless tile: left edge matches right edge, top edge matches bottom edge, and repeating it in a grid should not show borders, seams, frames, lighting breaks, or centered decoration.
- For map buildings and resource nodes, generate transparent source images at 1024x1024, then export 32/64/128.
- For portraits, generate transparent source images at 1024x1024, then export 64/128.
- For character animation, generate one horizontal strip per prompt at 2048x512, 4 frames in one row.
- For UI icons, generate transparent source images at 1024x1024, then export 32/64.
- Review all outputs manually before promotion into the live manifest.

## Terrain Tiles

### TERRAIN_TILE_HARD_RULES

```text
Generate exactly one square seamless terrain tile for map painting. It must be an edge-to-edge outdoor ground surface that can repeat infinitely in a grid. Opposite edges must visually continue into each other: left matches right, top matches bottom. No border, no frame, no outline, no bevel, no raised rim, no tile grout, no floor-panel geometry, no centered object, no path, no horizon, no sky, no buildings, no characters. Avoid strong one-directional shadows that reveal repetition. Keep the detail soft enough to read at 32x32, but varied enough that adjacent repeated tiles do not look flat.
```

Use terrain variants as editing brushes:

- `a` variants are the default readable version.
- `b` variants add denser or darker natural variation.
- `c` variants add drier, rockier, wetter, colder, or more broken variation.
- Extra grass variants `d/e` provide subtle meadow variation for large fields.

### terrain_grass

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Default outdoor meadow grass tile, continuous soft uneven turf, small scattered flower specks and tiny weeds spread naturally across the whole square, top-down game map ground, no focal object, no path, no water.
Negative: NEGATIVE_COMMON, centered patch, island, disk, vignette, frame, border, floor tile, pavement, indoor floor, water, river, lake, building, road, visible seam, mismatched edges.
```

### terrain_grass_b

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Denser mossy grass variant for wild areas, clover specks, deeper green patches, faint soil undertones blended edge-to-edge, no obvious repeated motif.
Negative: NEGATIVE_COMMON, centered patch, ornamental pattern, floor tile, water, path, wall, building, frame, visible seam, mismatched edges.
```

### terrain_grass_c

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Drier mixed grass variant, warm broad field grass with sparse weeds, mottled turf, small exposed earth flecks, natural outdoor ground variation across the whole square.
Negative: NEGATIVE_COMMON, geometric pattern, road, tile seam, water, single plant object, framed platform, visible seam, mismatched edges.
```

### terrain_grass_d

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Soft short-blade grass plain, subtle pale green and yellow-green variation, faint earth patches lightly blended, readable as walkable meadow terrain at 32x32.
Negative: NEGATIVE_COMMON, centered object, circular patch, water, floor panel, city plaza, decorative border, visible seam, mismatched edges.
```

### terrain_grass_e

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Sunlit prairie grass variant, mixed short blades, scattered pale wildflower dots, gentle pastoral texture, edge-to-edge outdoor ground fill with no single flower cluster as the center.
Negative: NEGATIVE_COMMON, pond, path, single bush, horizon, sky, landscape scene, frame, visible seam, mismatched edges.
```

### terrain_forest

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Default forest floor tile seen from above, moss, leaf litter, soft canopy-shadow patches, dark green variation, continuous woodland ground, no individual tree trunk as a centered subject.
Negative: NEGATIVE_COMMON, isolated tree, vertical trunk, landscape view, road, building, frame, water, visible seam, mismatched edges.
```

### terrain_forest_b

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Denser woodland grove ground, small roots crossing softly, fallen leaves, fern hints, warm dark greens and browns, all details distributed edge-to-edge.
Negative: NEGATIVE_COMMON, single tree object, path, bridge, river, ornamental floor, border, visible seam, mismatched edges.
```

### terrain_forest_c

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Wild underbrush forest variant with fern fragments, low shrub texture, broken leaf cover, mossy shadows, readable as forest terrain at 32x32 without becoming a bush icon.
Negative: NEGATIVE_COMMON, centered bush, flower bouquet, framed garden, road, water, building, visible seam, mismatched edges.
```

### terrain_mountain

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Default rocky mountain ground from top-down view, warm gray-brown stones, uneven gravel, soft painterly creases, distributed rock texture, no cliffs as tall scenery.
Negative: NEGATIVE_COMMON, giant centered rock, cave entrance, sky, horizon, building, border, road, dungeon floor, visible seam, mismatched edges.
```

### terrain_mountain_b

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Cracked mountain ridge ground texture, broken stone plates, sparse dry moss, muted brown-gray palette, edge-to-edge rocky outdoor material.
Negative: NEGATIVE_COMMON, single boulder, staircase, wall, dungeon floor, frame, water, visible seam, mismatched edges.
```

### terrain_mountain_c

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Rugged mineral-streak rocky terrain from above, small stones, worn gray-brown mineral bands, soft hand-painted outdoor mountain ground, no tall cliff face.
Negative: NEGATIVE_COMMON, tall cliff illustration, landscape scene, cave, mine entrance, border, centered object, visible seam, mismatched edges.
```

### terrain_water

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Default shallow clear water tile seen from above, soft blue ripples, gentle painterly highlights, continuous edge-to-edge water surface, no shore and no land.
Negative: NEGATIVE_COMMON, boat, shore, island, riverbank, waterfall, horizon, object, frame, beach, visible seam, mismatched edges.
```

### terrain_water_b

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Calm blue-green stream water surface, soft flowing ripples with only a very faint direction, natural variation, no shore or land, repeatable without a visible flow seam.
Negative: NEGATIVE_COMMON, land patch, bridge, boat, fish as focal object, border, tiled floor, visible seam, mismatched edges.
```

### terrain_water_c

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Pond-like water surface variant, gentle small ripples, soft cyan and blue tones, subtle depth variation, readable as water at 32x32 without any land edge.
Negative: NEGATIVE_COMMON, shore, lily pad as focal object, island, reflection scene, frame, visible seam, mismatched edges.
```

### terrain_sand

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Default dry sandy ground from above, warm pale sand, subtle wind streaks, tiny pebble specks, edge-to-edge outdoor surface, no sea and no shoreline.
Negative: NEGATIVE_COMMON, beach scene, ocean, dunes with horizon, floor tile, road, border, centered object, visible seam, mismatched edges.
```

### terrain_sand_b

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Softer golden sand variant without water, warm beige and gold variation, faint wind-brushed marks, a few tiny stones distributed naturally, no footprints forming a path.
Negative: NEGATIVE_COMMON, sea, shells as focal object, palm tree, road, frame, geometric floor, visible seam, mismatched edges.
```

### terrain_sand_c

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Dry cracked sand and dusty soil mix, muted warm beige, tiny stones, subtle painterly texture, many small cracks distributed evenly so no single crack becomes a focal object.
Negative: NEGATIVE_COMMON, desert landscape, cactus, centered crack, floor panel, building, water, visible seam, mismatched edges.
```

### terrain_snow

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Default fresh powder snow ground from above, soft blue-white shadows, faint uneven snow texture, edge-to-edge outdoor surface, no footprints path.
Negative: NEGATIVE_COMMON, snowman, footprints as focal path, mountain landscape, ice wall, border, visible seam, mismatched edges.
```

### terrain_snow_b

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Wind-brushed snowfield variant, gentle pale blue strokes, small frost specks, soft natural variation, repeatable at map scale and readable at 32x32.
Negative: NEGATIVE_COMMON, floor tile, checkerboard, landscape, single object, road, frame, visible seam, mismatched edges.
```

### terrain_snow_c

```text
Create exactly one seamless square map terrain tile. TERRAIN_TILE_HARD_RULES. STYLE_MAP_TILE. Frosty snow crust variant with light icy patches, white and pale blue texture, subtle hand-painted granular detail distributed across the whole square, no object.
Negative: NEGATIVE_COMMON, ice cube, frozen lake reflection, cave, border, centered patch, visible seam, mismatched edges.
```

## Resource Nodes

### resource_tree

```text
Create a transparent PNG game resource node. STYLE_MAP_TILE. A small stylized tree resource for a 2D map, 3/4 top-down view, warm hand-painted storybook style, compact trunk, leafy crown, clear silhouette at 32x32, no ground tile.
Negative: NEGATIVE_COMMON, full landscape, forest scene, multiple trees covering frame, frame, shadow outside asset.
```

### resource_rock

```text
Create a transparent PNG game resource node. STYLE_MAP_TILE. A small collectible rock outcrop, 3/4 top-down view, warm gray-brown hand-painted stone cluster, clear silhouette at 32x32, no ground tile.
Negative: NEGATIVE_COMMON, mountain landscape, cave, huge cliff, frame, text, sticker.
```

### resource_crop

```text
Create a transparent PNG game resource node. STYLE_MAP_TILE. A small wild crop patch, golden wheat and green leaves, 3/4 top-down view, warm hand-painted pastoral style, clear food resource silhouette at 32x32, no ground tile.
Negative: NEGATIVE_COMMON, farm field scene, basket, plate of food, frame, text.
```

### resource_ore

```text
Create a transparent PNG game resource node. STYLE_MAP_TILE. A small ore cluster with warm stone and subtle golden mineral veins, 3/4 top-down view, hand-painted storybook style, readable at 32x32, no ground tile.
Negative: NEGATIVE_COMMON, shiny gem icon, neon crystal, mine scene, frame, text.
```

## Map Buildings

### building_lumber_mill

```text
Create a transparent PNG map building asset for a cozy colony life-sim game. STYLE_MAP_TILE. Small lumber mill, 3/4 top-down view, log piles, simple timber shed, tiny saw detail, warm wood palette, readable at 64x64 and 128x128, no ground tile, no frame.
Negative: NEGATIVE_COMMON, realistic factory, huge building, front elevation, side view, smoke covering silhouette, text.
```

### building_quarry

```text
Create a transparent PNG map building asset for a cozy colony life-sim game. STYLE_MAP_TILE. Small quarry worksite, 3/4 top-down view, carved stone blocks, wooden supports, pulley or cart detail, rugged but charming, readable at 64x64 and 128x128.
Negative: NEGATIVE_COMMON, mine cave scene, dark dungeon, giant cliff, front elevation, text, frame.
```

### building_farm

```text
Create a transparent PNG map building asset for a cozy colony life-sim game. STYLE_MAP_TILE. Small farm plot with tiny rows of crops, rustic fence hints, simple tool basket, warm pastoral palette, 3/4 top-down view, readable at 64x64 and 128x128.
Negative: NEGATIVE_COMMON, large landscape field, horizon, farmhouse as focus, text, frame.
```

### building_warehouse

```text
Create a transparent PNG map building asset for a cozy colony life-sim game. STYLE_MAP_TILE. Small warehouse shed, stacked crates, broad roof, simple timber structure, 3/4 top-down view, warm hand-painted style, readable at 64x64 and 128x128.
Negative: NEGATIVE_COMMON, modern warehouse, shipping container, front elevation, text, frame.
```

### building_kitchen

```text
Create a transparent PNG map building asset for a cozy colony life-sim game. STYLE_MAP_TILE. Small outdoor kitchen hut, chimney, cooking pot, warm hearth detail, rustic roof, 3/4 top-down view, cozy hand-painted style.
Negative: NEGATIVE_COMMON, restaurant facade, indoor room, huge table scene, text, frame.
```

### building_house

```text
Create a transparent PNG map building asset for a cozy colony life-sim game. STYLE_MAP_TILE. Small cozy cottage house, warm roof, tiny window, wooden door, soft storybook proportions, 3/4 top-down view, readable at 64x64 and 128x128.
Negative: NEGATIVE_COMMON, modern house, castle, front-only elevation, text, frame.
```

### building_trade_station

```text
Create a transparent PNG map building asset for a cozy colony life-sim game. STYLE_MAP_TILE. Small trade station stall, canopy, crates, hanging cloth, scales or coin pouch detail, warm merchant feel, 3/4 top-down view.
Negative: NEGATIVE_COMMON, market crowd, city street, text signs, front elevation, frame.
```

### building_barracks

```text
Create a transparent PNG map building asset for a cozy colony life-sim game. STYLE_MAP_TILE. Small village barracks, sturdy timber structure, shield rack, training dummy hint, modest defensive look, 3/4 top-down view.
Negative: NEGATIVE_COMMON, fortress, castle wall, modern military base, text, frame.
```

### building_recruitment_station

```text
Create a transparent PNG map building asset for a cozy colony life-sim game. STYLE_MAP_TILE. Small recruitment camp station, notice board, travel tent, welcoming banner without readable text, rustic wooden posts, 3/4 top-down view.
Negative: NEGATIVE_COMMON, readable letters, city billboard, military camp scene, crowd, frame.
```

### building_research_desk

```text
Create a transparent PNG map building asset for a cozy colony life-sim game. STYLE_MAP_TILE. Small outdoor research desk station, books, scrolls, lamp, simple canopy or table, scholarly handcrafted feel, 3/4 top-down view.
Negative: NEGATIVE_COMMON, modern lab, computer desk, full room scene, readable text, frame.
```

## Resource UI Icons

### ui_resource_wood

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. A small bundle of cut wood logs tied with twine, warm hand-painted storybook style, centered, readable at 32x32.
Negative: NEGATIVE_COMMON, tree node, large landscape, text, frame.
```

### ui_resource_stone

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. A small pile of smooth gray-brown stones, soft painterly shading, centered, readable at 32x32.
Negative: NEGATIVE_COMMON, mountain scene, crystal, text, frame.
```

### ui_resource_food

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. A small rustic basket of bread, vegetables, and grain, warm pastoral palette, centered, readable at 32x32.
Negative: NEGATIVE_COMMON, meat emoji, dinner plate, text, frame.
```

### ui_resource_gold

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. A small pouch of gold coins with a few coins beside it, warm hand-painted style, centered, readable at 32x32.
Negative: NEGATIVE_COMMON, neon coin, modern money, text, frame.
```

### ui_resource_core_parts

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. A small magical mechanical core part, brass gear with soft blue inner glow, handcrafted fantasy engineering style, centered, readable at 32x32.
Negative: NEGATIVE_COMMON, modern cog emoji, sci-fi neon, text, frame.
```

## Character Portraits

### character_portrait_farmer

```text
Create a transparent PNG character portrait. STYLE_PORTRAIT. Young farmer girl, straw hat with tiny wildflowers, green scarf, cream blouse, brown vest, gentle hardworking smile, pastoral countryside charm, bust portrait.
Negative: NEGATIVE_COMMON, full body, tiny face, weapon, busy background, cropped face.
```

### character_portrait_hunter

```text
Create a transparent PNG character portrait. STYLE_PORTRAIT. Young hunter girl, short forest hood or soft cap, earth-tone cloak, small quiver, calm alert eyes, natural wilderness charm, bust portrait.
Negative: NEGATIVE_COMMON, aggressive warrior, huge bow covering face, dark assassin, busy background.
```

### character_portrait_warrior

```text
Create a transparent PNG character portrait. STYLE_PORTRAIT. Young village defender girl, simple leather-and-cloth armor, small shoulder guard, brave but kind expression, modest protective style, bust portrait.
Negative: NEGATIVE_COMMON, over-armored knight, helmet covering face, giant weapon, harsh battle scene.
```

### character_portrait_engineer

```text
Create a transparent PNG character portrait. STYLE_PORTRAIT. Young workshop engineer girl, small goggles on head, rolled sleeves, utility apron, tiny wrench, clever curious expression, bust portrait.
Negative: NEGATIVE_COMMON, modern engineer, robot suit, hard sci-fi, busy workshop background.
```

### character_portrait_cook

```text
Create a transparent PNG character portrait. STYLE_PORTRAIT. Young camp cook girl, soft kerchief, warm apron, rolled sleeves, small wooden spoon, cheerful friendly expression, cozy homey feeling, bust portrait.
Negative: NEGATIVE_COMMON, restaurant chef uniform, giant food plate, busy kitchen background.
```

### character_portrait_doctor

```text
Create a transparent PNG character portrait. STYLE_PORTRAIT. Young field medic girl, light cream coat, herb pouch, small medical satchel, green medicinal scarf, calm caring expression, bust portrait.
Negative: NEGATIVE_COMMON, modern hospital doctor, surgical mask covering face, sci-fi medicine, busy background.
```

### character_portrait_scholar

```text
Create a transparent PNG character portrait. STYLE_PORTRAIT. Young scholar girl, round glasses, neat coat or robe, small notebook, book bag, soft thoughtful gaze, pastoral fantasy academic feeling, bust portrait.
Negative: NEGATIVE_COMMON, modern school uniform, giant book covering face, library background, text.
```

## Character Sprite Sheets

Shared sprite sheet requirements:

```text
STYLE_SPRITE_CHARACTER

Character format: full-body small playable map character, not a portrait. 3/4 top-down game view, full body visible, suitable for a 2D map. Same character design, same proportions, same scale, same lighting, same ground anchor point in every frame.

Rendering: polished hand-painted production sprite, soft but clear shapes, controlled details, readable silhouette, natural fabric folds, restrained highlights, slight human-made asymmetry, cohesive color harmony. No plastic shine, no over-rendered fantasy armor, no noisy decorative detail.

Canvas: 2048x512 transparent PNG, 4 frames in one horizontal row. Each frame has equal spacing and enough padding. Background: real transparent alpha only.

Negative: NEGATIVE_COMMON, portrait pose, cropped feet, changing outfit, changing face, changing camera angle, inconsistent scale, oversized tool, big glossy anime eyes, AI-perfect symmetry.
```

### Character Designs

```text
Farmer girl: young countryside farmer girl, straw hat with small wildflowers, green scarf, cream blouse, brown vest, layered green skirt, leather pouch, brown boots, gentle and hardworking expression. Pastoral, warm, practical, charming.
```

```text
Hunter girl: young forest hunter girl, short green hood or soft cap, earth-tone cloak, leather vest, small quiver, compact bow, practical boots, calm alert expression. Natural, quiet, agile, not aggressive.
```

```text
Warrior girl: young village defender girl, simple leather-and-cloth armor, small shoulder guard, short cape, modest sword or small round shield, sturdy boots, brave but kind expression. Protective, grounded, not over-armored.
```

```text
Engineer girl: young workshop engineer girl, small goggles on head, rolled sleeves, utility apron, leather tool belt, tiny wrench, blueprint case, practical boots, focused curious expression. Clever, handmade, workshop charm.
```

```text
Cook girl: young camp cook girl, soft kerchief or simple cap, warm apron over countryside dress, rolled sleeves, small wooden spoon or pan, flour dust detail, friendly cheerful expression. Homey, warm, practical.
```

```text
Doctor girl: young field medic girl, light cream coat over simple dress, herb pouch, small medical satchel, green medicinal scarf, calm caring expression. Clean, gentle, trustworthy, wilderness healer feeling.
```

```text
Scholar girl: young scholar girl, round glasses, neat coat or robe, small notebook, book bag, ink pen, soft thoughtful expression. Curious, gentle, academic, not modern, fits a pastoral fantasy village.
```

### Sprite Prompt Template

Use this by replacing `[CHARACTER_DESIGN]` and `[ANIMATION_BLOCK]`.

```text
Create a 2048x512 transparent PNG sprite sheet.

STYLE_SPRITE_CHARACTER

Character design:
[CHARACTER_DESIGN]

[ANIMATION_BLOCK]

Keep the same character design, same proportions, same scale, same lighting, same ground anchor point in every frame. Feet stay aligned to the same ground baseline. Character remains centered in each frame. Hair, clothing, scarf, pouch, sleeves, and skirt can move subtly with the action.

Negative: NEGATIVE_COMMON, portrait illustration, fake checkerboard transparency, grid lines, frame borders, labels, cropped feet, inconsistent costume, changing face, changing camera angle, different character per frame, oversized tool.
```

### Animation Blocks

#### walk_down_right

```text
Animation: 4-frame walking cycle facing down-right.
Frame 1: left foot forward, opposite arm forward.
Frame 2: passing pose, body slightly higher.
Frame 3: right foot forward, opposite arm forward.
Frame 4: passing pose, body slightly lower.
The walk should feel light, natural, and handcrafted.
```

#### walk_down_left

```text
Animation: 4-frame walking cycle facing down-left.
Frame 1: right foot forward, opposite arm forward.
Frame 2: passing pose, body slightly higher.
Frame 3: left foot forward, opposite arm forward.
Frame 4: passing pose, body slightly lower.
The walk should feel light, natural, and handcrafted.
```

#### walk_up_right

```text
Animation: 4-frame walking cycle facing up-right, seen from behind in 3/4 top-down view.
Frame 1: left foot step visible from behind.
Frame 2: passing pose, body slightly higher.
Frame 3: right foot step visible from behind.
Frame 4: passing pose, body slightly lower.
Back view must keep outfit identity recognizable.
```

#### walk_up_left

```text
Animation: 4-frame walking cycle facing up-left, seen from behind in 3/4 top-down view.
Frame 1: right foot step visible from behind.
Frame 2: passing pose, body slightly higher.
Frame 3: left foot step visible from behind.
Frame 4: passing pose, body slightly lower.
Back view must keep outfit identity recognizable.
```

#### work_farmer_down_right

```text
Animation: 4-frame farming work cycle facing down-right. The farmer uses a small hoe.
Frame 1: prepare, holding hoe gently.
Frame 2: swing down with body leaning forward.
Frame 3: hoe touches the ground, strongest pose.
Frame 4: recover, returning to ready pose.
Feet stay planted on the same ground anchor point. Tool is small, elegant, and readable, not oversized.
```

#### work_hunter_down_right

```text
Animation: 4-frame hunting work cycle facing down-right. The hunter uses a compact bow.
Frame 1: ready stance.
Frame 2: raise bow.
Frame 3: draw bowstring.
Frame 4: release and relax.
Feet stay planted on the same ground anchor point. Bow is compact and readable.
```

#### work_warrior_down_right

```text
Animation: 4-frame guarding work cycle facing down-right.
Frame 1: ready stance.
Frame 2: raise shield or sword.
Frame 3: short controlled practice swing or guard pose.
Frame 4: return to ready stance.
Feet stay planted on the same ground anchor point. Motion is clear but modest, not dramatic.
```

#### work_engineer_down_right

```text
Animation: 4-frame repair work cycle facing down-right. The engineer uses a small hammer or wrench.
Frame 1: inspect.
Frame 2: raise tool.
Frame 3: tap or tighten.
Frame 4: check result.
Feet stay planted on the same ground anchor point. Tool is small and readable.
```

#### work_cook_down_right

```text
Animation: 4-frame cooking work cycle facing down-right. The cook stirs a small pot or mixing bowl.
Frame 1: hold spoon ready.
Frame 2: stir left.
Frame 3: stir right.
Frame 4: lift spoon slightly and smile.
Feet stay planted on the same ground anchor point. Spoon and pot are small and readable.
```

#### work_doctor_down_right

```text
Animation: 4-frame healing work cycle facing down-right. The doctor mixes herbs or prepares medicine.
Frame 1: open satchel.
Frame 2: take herb or vial.
Frame 3: mix or apply medicine.
Frame 4: return to calm ready pose.
Feet stay planted on the same ground anchor point. Medical props are small and readable.
```

#### work_scholar_down_right

```text
Animation: 4-frame research work cycle facing down-right. The scholar writes in a notebook or inspects a small artifact.
Frame 1: open notebook.
Frame 2: write with pen.
Frame 3: pause and inspect.
Frame 4: return to reading pose.
Feet stay planted on the same ground anchor point. Notebook and pen are small and readable.
```

### Required Character Sprite Asset IDs

Generate one strip for each row below using the template above.

| asset_id | character_design | animation_block |
|---|---|---|
| sprite_farmer_walk_down_right | Farmer girl | walk_down_right |
| sprite_farmer_walk_down_left | Farmer girl | walk_down_left |
| sprite_farmer_walk_up_right | Farmer girl | walk_up_right |
| sprite_farmer_walk_up_left | Farmer girl | walk_up_left |
| sprite_farmer_work_down_right | Farmer girl | work_farmer_down_right |
| sprite_hunter_walk_down_right | Hunter girl | walk_down_right |
| sprite_hunter_walk_down_left | Hunter girl | walk_down_left |
| sprite_hunter_walk_up_right | Hunter girl | walk_up_right |
| sprite_hunter_walk_up_left | Hunter girl | walk_up_left |
| sprite_hunter_work_down_right | Hunter girl | work_hunter_down_right |
| sprite_warrior_walk_down_right | Warrior girl | walk_down_right |
| sprite_warrior_walk_down_left | Warrior girl | walk_down_left |
| sprite_warrior_walk_up_right | Warrior girl | walk_up_right |
| sprite_warrior_walk_up_left | Warrior girl | walk_up_left |
| sprite_warrior_work_down_right | Warrior girl | work_warrior_down_right |
| sprite_engineer_walk_down_right | Engineer girl | walk_down_right |
| sprite_engineer_walk_down_left | Engineer girl | walk_down_left |
| sprite_engineer_walk_up_right | Engineer girl | walk_up_right |
| sprite_engineer_walk_up_left | Engineer girl | walk_up_left |
| sprite_engineer_work_down_right | Engineer girl | work_engineer_down_right |
| sprite_cook_walk_down_right | Cook girl | walk_down_right |
| sprite_cook_walk_down_left | Cook girl | walk_down_left |
| sprite_cook_walk_up_right | Cook girl | walk_up_right |
| sprite_cook_walk_up_left | Cook girl | walk_up_left |
| sprite_cook_work_down_right | Cook girl | work_cook_down_right |
| sprite_doctor_walk_down_right | Doctor girl | walk_down_right |
| sprite_doctor_walk_down_left | Doctor girl | walk_down_left |
| sprite_doctor_walk_up_right | Doctor girl | walk_up_right |
| sprite_doctor_walk_up_left | Doctor girl | walk_up_left |
| sprite_doctor_work_down_right | Doctor girl | work_doctor_down_right |
| sprite_scholar_walk_down_right | Scholar girl | walk_down_right |
| sprite_scholar_walk_down_left | Scholar girl | walk_down_left |
| sprite_scholar_walk_up_right | Scholar girl | walk_up_right |
| sprite_scholar_walk_up_left | Scholar girl | walk_up_left |
| sprite_scholar_work_down_right | Scholar girl | work_scholar_down_right |

## Boss Portraits

### boss_portrait_01

```text
Create a transparent PNG boss portrait. STYLE_PORTRAIT. Feral forest goblin war chief, scarred face, crude twig crown, mischievous but threatening expression, storybook fantasy menace, bust portrait, readable at 64x64.
Negative: NEGATIVE_COMMON, cute mascot, full battle scene, crowd, tiny face, cropped horns, readable text.
```

### boss_portrait_02

```text
Create a transparent PNG boss portrait. STYLE_PORTRAIT. Hulking stone demon, cracked basalt horns, glowing warm core, ancient rocky face, heavy silhouette, intimidating but painterly storybook style, bust portrait.
Negative: NEGATIVE_COMMON, robot, sci-fi golem, full body scene, tiny head, dark unreadable silhouette.
```

### boss_portrait_03

```text
Create a transparent PNG boss portrait. STYLE_PORTRAIT. Shadow knight with broken visor, pale spectral fire, worn cloak, haunted noble menace, readable strong silhouette, bust portrait.
Negative: NEGATIVE_COMMON, generic black armor blob, full battlefield, helmet hiding all face detail, text.
```

### boss_portrait_04

```text
Create a transparent PNG boss portrait. STYLE_PORTRAIT. Blazing infernal lord, ember mane, molten eyes, warm fire glow, elegant fantasy menace, readable silhouette at 64x64, bust portrait.
Negative: NEGATIVE_COMMON, overexposed fire, photoreal demon, full body battle scene, text, frame.
```

### boss_portrait_05

```text
Create a transparent PNG boss portrait. STYLE_PORTRAIT. Ancient dragon, weathered scales, old horns, legendary calm menace, warm painterly fantasy, expressive face, bust portrait readable at 64x64.
Negative: NEGATIVE_COMMON, full dragon body, tiny head, realistic reptile photo, cropped jaw, text.
```

## Profession UI Icons

### ui_profession_gatherer

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Crossed small hand axe and leaf bundle, symbol for gatherer, warm handcrafted game icon, readable at 32x32.
Negative: NEGATIVE_COMMON, weapon violence, realistic axe photo, text, frame.
```

### ui_profession_builder

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small wooden hammer with plank and nail, symbol for builder, warm handcrafted game icon, readable at 32x32.
Negative: NEGATIVE_COMMON, modern construction sign, text, frame.
```

### ui_profession_farmer

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Wheat stalk and tiny seed pouch, symbol for farmer, warm pastoral hand-painted icon, readable at 32x32.
Negative: NEGATIVE_COMMON, emoji wheat, full farm scene, text, frame.
```

### ui_profession_warrior

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small round shield with short sword behind it, symbol for warrior, modest village defender style, readable at 32x32.
Negative: NEGATIVE_COMMON, aggressive blood, realistic weapon, text, frame.
```

### ui_profession_hunter

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Compact bow with small feather and leaf, symbol for hunter, natural woodland palette, readable at 32x32.
Negative: NEGATIVE_COMMON, modern bow, target sign, text, frame.
```

### ui_profession_engineer

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Tiny brass wrench and wooden gear, symbol for engineer, warm fantasy workshop style, readable at 32x32.
Negative: NEGATIVE_COMMON, modern industrial cog, sci-fi, text, frame.
```

### ui_profession_cook

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Wooden spoon and small warm cooking pot, symbol for cook, cozy hand-painted icon, readable at 32x32.
Negative: NEGATIVE_COMMON, restaurant logo, emoji pan, text, frame.
```

### ui_profession_doctor

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Herb bundle and small medicine satchel, symbol for field doctor, gentle green and cream palette, readable at 32x32.
Negative: NEGATIVE_COMMON, modern red cross logo, syringe, text, frame.
```

### ui_profession_scholar

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small notebook and ink pen, symbol for scholar, warm academic fantasy style, readable at 32x32.
Negative: NEGATIVE_COMMON, modern laptop, readable letters, text, frame.
```

## Equipment Slot UI Icons

### ui_equipment_weapon

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Modest short sword, warm hand-painted fantasy village style, centered, readable at 32x32.
Negative: NEGATIVE_COMMON, blood, huge fantasy weapon, photorealistic metal, text.
```

### ui_equipment_helmet

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Simple leather-and-iron helmet, cozy fantasy style, centered, readable at 32x32.
Negative: NEGATIVE_COMMON, modern helmet, sci-fi helmet, text, frame.
```

### ui_equipment_armor

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small leather chest armor vest, warm painterly fantasy style, centered, readable at 32x32.
Negative: NEGATIVE_COMMON, full character, modern armor, text, frame.
```

### ui_equipment_boots

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Pair of sturdy brown travel boots, warm hand-painted style, centered, readable at 32x32.
Negative: NEGATIVE_COMMON, modern sneakers, photo, text, frame.
```

### ui_equipment_accessory

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small rustic charm pendant with warm gem, cozy fantasy style, centered, readable at 32x32.
Negative: NEGATIVE_COMMON, modern ring photo, luxury jewelry ad, text, frame.
```

## Technology Branch UI Icons

### ui_tech_building

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Tiny cottage roof and wooden beam, symbol for survival/building technology, warm green accent, readable at 32x32.
Negative: NEGATIVE_COMMON, modern house, text, frame.
```

### ui_tech_production

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small hammer and wheat gear hybrid, symbol for production technology, warm blue accent, readable at 32x32.
Negative: NEGATIVE_COMMON, modern factory, text, frame.
```

### ui_tech_combat

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Modest shield with small spark, symbol for combat readiness technology, warm red accent, readable at 32x32.
Negative: NEGATIVE_COMMON, violent weapon, blood, text, frame.
```

### ui_tech_civilian

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small lantern with gentle star sparkle, symbol for civilian life technology, warm orange accent, readable at 32x32.
Negative: NEGATIVE_COMMON, neon magic, text, frame.
```

## Skill And Task UI Icons

### ui_skill_farming

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Wheat sprout and small hand hoe, farming skill, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_skill_hunting

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small bow and feather, hunting skill, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_skill_gathering

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Leaf bundle and small basket, gathering skill, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_skill_combat

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Shield and short blade, combat skill, readable at 32x32.
Negative: NEGATIVE_COMMON, blood, text, frame.
```

### ui_skill_engineering

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Wrench and small brass gear, engineering skill, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_skill_building

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Hammer and wooden beam, building skill, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_skill_cooking

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Soup bowl and wooden spoon, cooking skill, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_skill_medicine

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Herb leaf and medicine bottle, medicine skill, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_skill_research

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Open notebook and small magnifying glass, research skill, readable at 32x32.
Negative: NEGATIVE_COMMON, readable letters, text, frame.
```

## Character State UI Icons

### ui_state_idle

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small calm standing figure silhouette with soft pause mark, idle state, readable at 32x32.
Negative: NEGATIVE_COMMON, emoji face, text, frame.
```

### ui_state_moving

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Tiny walking boot motion mark, moving state, readable at 32x32.
Negative: NEGATIVE_COMMON, emoji person, text, frame.
```

### ui_state_working

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small tool motion mark with hammer, working state, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_state_gathering

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Basket with leaf and small axe, gathering state, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_state_farming

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Sprout and hoe, farming state, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_state_hunting

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Compact bow with motion line, hunting state, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_state_building

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Hammer hitting wooden peg, building state, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_state_crafting

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small gear and hand tool, crafting state, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_state_cooking

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Cooking pot with gentle steam, cooking state, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_state_healing

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Medicine satchel with herb leaf, healing state, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_state_researching

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Notebook with magnifying glass, researching state, readable at 32x32.
Negative: NEGATIVE_COMMON, readable words, text, frame.
```

### ui_state_resting

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small pillow and soft moon mark, resting state, readable at 32x32.
Negative: NEGATIVE_COMMON, emoji face, text, frame.
```

### ui_state_eating

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small wooden bowl and spoon, eating state, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_state_sleeping

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Tiny bedroll and moon, sleeping state, readable at 32x32.
Negative: NEGATIVE_COMMON, emoji face, text, frame.
```

### ui_state_fighting

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small crossed sword and shield, fighting state, readable at 32x32.
Negative: NEGATIVE_COMMON, blood, text, frame.
```

### ui_state_socializing

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Two small speech bubbles with warm heart-like dot, socializing state, readable at 32x32.
Negative: NEGATIVE_COMMON, readable text, emoji bubble, frame.
```

## Navigation And Utility UI Icons

### ui_tab_characters

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Two tiny friendly character bust silhouettes, characters tab, readable at 32x32.
Negative: NEGATIVE_COMMON, emoji people, text, frame.
```

### ui_tab_recruit

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small notice board with traveler hat, recruitment tab, readable at 32x32.
Negative: NEGATIVE_COMMON, readable letters, text, frame.
```

### ui_tab_shop

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small merchant stall canopy, shop/build tab, readable at 32x32.
Negative: NEGATIVE_COMMON, shopping cart emoji, text, frame.
```

### ui_tab_technology

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Tiny research lamp and notebook, technology tab, readable at 32x32.
Negative: NEGATIVE_COMMON, modern science icon, text, frame.
```

### ui_tab_boss

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small ominous horned boss mask, boss tab, readable at 32x32.
Negative: NEGATIVE_COMMON, cute emoji monster, text, frame.
```

### ui_tab_equipment

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small sword and satchel, equipment tab, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_tab_settings

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small brass gear with wooden knob, settings tab, readable at 32x32.
Negative: NEGATIVE_COMMON, modern cog emoji, text, frame.
```

### ui_time

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Tiny rustic pocket watch, game time icon, readable at 32x32.
Negative: NEGATIVE_COMMON, digital clock, text, frame.
```

### ui_help_hint

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small warm lantern spark, help hint icon, readable at 32x32.
Negative: NEGATIVE_COMMON, question mark text, emoji bulb, frame.
```

### ui_refresh

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small circular leaf arrow, refresh/reset icon, readable at 32x32.
Negative: NEGATIVE_COMMON, modern UI arrow, text, frame.
```

### ui_success

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small green sprout check-like shape without text, success icon, readable at 32x32.
Negative: NEGATIVE_COMMON, literal checkmark text, emoji, frame.
```

### ui_error

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small red-orange warning pebble with simple mark, error icon, readable at 32x32.
Negative: NEGATIVE_COMMON, text, stop sign, frame.
```

### ui_victory

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small celebratory laurel and warm star sparkle, victory icon, readable at 32x32.
Negative: NEGATIVE_COMMON, confetti emoji, text, frame.
```

### ui_defeat

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small cracked shield, defeat icon, readable at 32x32.
Negative: NEGATIVE_COMMON, skull emoji, gore, text, frame.
```

### ui_speed

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small boot with wind line, speed icon, readable at 32x32.
Negative: NEGATIVE_COMMON, lightning emoji, text, frame.
```

### ui_critical

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small impact spark burst, critical hit icon, readable at 32x32.
Negative: NEGATIVE_COMMON, explosion emoji, gore, text, frame.
```

## Terrain Editor UI Icons

### ui_tool_raise

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small raised earth mound with upward leaf arrow, terrain raise tool, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_tool_lower

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small lowered earth dip with downward leaf arrow, terrain lower tool, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_tool_flatten

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small flat soil strip with smoothing trowel, flatten terrain tool, readable at 32x32.
Negative: NEGATIVE_COMMON, text, frame.
```

### ui_tool_paint

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small paint brush with green earth swatch, paint terrain tool, readable at 32x32.
Negative: NEGATIVE_COMMON, modern paint palette, text, frame.
```

### ui_tool_water

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small clear water droplet over tiny ripple, water terrain tool, readable at 32x32.
Negative: NEGATIVE_COMMON, emoji droplet, text, frame.
```

## Fallback Icons

### ui_character_default

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Gentle anonymous young villager bust silhouette, warm hand-painted style, default character icon, readable at 32x32.
Negative: NEGATIVE_COMMON, emoji person, text, frame.
```

### ui_boss_default

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small ominous fantasy boss mask silhouette, warm painterly style, default boss icon, readable at 32x32.
Negative: NEGATIVE_COMMON, emoji monster, text, frame.
```

### ui_building_default

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small rustic cottage block silhouette, default building icon, readable at 32x32.
Negative: NEGATIVE_COMMON, emoji house, text, frame.
```

### ui_resource_default

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small wrapped resource parcel, default resource icon, readable at 32x32.
Negative: NEGATIVE_COMMON, cardboard emoji, text, frame.
```

### ui_terrain_default

```text
Create a transparent PNG UI icon. STYLE_UI_ICON. Small square of grassy ground with soft edge, default terrain icon, readable at 32x32.
Negative: NEGATIVE_COMMON, framed tile, text, frame.
```

## Manual Review Checklist

Approve only if all are true:

- Style matches warm hand-painted storybook fantasy direction.
- No visible fake checkerboard background.
- Transparent background is actually transparent for object assets.
- The image reads clearly at intended runtime size.
- Characters keep stable identity across frames.
- Sprite sheet frame anchors are stable.
- No text, labels, logos, or UI frames are baked into the asset.
- Asset does not look like emoji, generic AI sticker art, or glossy plastic fantasy art.
