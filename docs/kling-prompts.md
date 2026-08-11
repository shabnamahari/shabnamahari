# Kling prompts for the category panels

One prompt per category illustration, written against the actual artwork.

## Before you generate anything

**Set the output ratio to 9:16.** This is what went wrong with the first test:
the source drawing is 1200×2000 (3:5), the clip came back 1288×1608 (4:5), and
fitting that back into a 3:5 panel is what cut the figure in half. 9:16 (0.5625)
is the closest ratio Kling offers to the panel's 3:5 (0.6) — the encode script
then trims a sliver off the top and bottom and nothing at the sides.

**Turn the watermark off.** It is an account/plan setting, not something the
prompt controls. It matters here: on the first test the watermark sat on a smooth
gradient and painted out cleanly, but these drawings are dense and colourful, and
patching a logo out of them leaves a visible smear. There is also no spare margin
to crop it out of, because the artwork is already at the panel's ratio.

**Keep clips short.** 5 seconds is plenty. The panels play forwards-then-backwards,
so 5 seconds of generation becomes a 10-second seamless loop.

## Add this to the end of every prompt

> Static locked-off camera — no zoom, no pan, no dolly, no parallax. Preserve the
> original illustration's style, colours, line work and composition exactly. Subtle,
> slow, continuous idle motion only. No new objects, no text, no camera shake.

Kling's default instinct is to fly the camera around. Without the static-camera
clause you get a drifting shot, which is the one thing these panels must not have —
the panel is the frame, and the artwork moving inside it is the whole effect.

## After you download each clip

```
./scripts/encode-category-clip.sh ~/Downloads/whatever.mp4 <category-name>
```

Where `<category-name>` is the image's filename without the extension, e.g.
`ielts-01-placement-assessment`. Then add `video: "/videos/categories/<name>.mp4"`
next to that category's `image:` in `lib/projects.ts`.

---

## IELTS

### ielts-01-placement-assessment
*Isometric pastel campus, dozens of small figures on stacked platforms.*

> The small figures go about their tasks in place: the student at the blackboard keeps writing in short chalk strokes, the figures on the staircases climb step by step, the walkers take slow steady steps, the person in the wheelchair reaches up and shelves a book. The isometric architecture, the floating geometric shapes and the pink background stay perfectly still.

### ielts-02-band-6.5
*Flat green, students lying and sitting with laptops and a book.*

> The students keep working: fingers tapping on the laptop keyboards, the reader's hand turning a page of the orange book, heads tilting slightly, one student shifting their weight. The flat green background and the decorative letter shapes stay completely still.

### ielts-03-band-7-plus
*Abstract flat collage — oversized hands holding small blue globes, a thermometer, rising steam.*

> The steam wisps rise and curl slowly upward. The oversized fingers flex very slightly around the globes. The red level in the thermometer pulses gently. The tiny faces blink. Nothing else moves.

### ielts-04-grammar-vocab
*A giant open book, tiny black-and-white people standing on the fanned pages, devices floating below.*

> The fanned pages of the giant book ruffle gently as if in a light breeze. The small black-and-white people standing on them shift their weight and a few turn their heads. The floating laptops, tablets and loose papers drift and rotate very slowly.

### ielts-05-ai-ielts
*Deep red, a woman in profile with pale hair touching a screen.*

> She blinks once, her head tilts a fraction, and her raised finger presses the screen and lifts again. The small pale red panels near her fingertip flicker faintly. The flat red background and the plaid pattern stay still.

### ielts-06-plan-tracker
*A head in profile, its interior divided into six small rooms.*

> Inside each compartment of the head a small scene continues: the reader turns a page of the red book, the two friends sway gently in their embrace, the judge raises a hand mid-sentence, the group at the bottom right talk with small head movements, the stars in the blue panel twinkle slowly. The head's outline and the maroon background never move.

## Business English

### be-01-tech-it
*Isometric blue digital world, floating figures, a giant play button.*

> The floating figures bob very gently as if weightless. The man on the left swipes the app panel with his hand. The girl standing on the phone screen shifts her stance. The loading spinner on the white device rotates slowly and the app icons pulse faintly. The blue grid and the play button stay fixed.

### be-02-business-mgmt
*Painterly, a woman seen from behind in a dim boardroom.*

> Her shoulders rise and fall with one slow breath and her head turns a few degrees. In the blurred background the seated delegates make small movements — a nod, a hand reaching for a document. Keep the loose painterly brush texture and the dim lighting exactly as they are.

### be-03-sales-marketing
*A man skipping a rope that is drawn as a red stock chart line.*

> He skips the rope in one slow continuous loop — the red chart-line rope swinging up over his head and down under his feet as he rises and lands lightly. His tie lifts and falls with each jump. The lightning in the background flickers faintly. The textured green backdrop stays still.

### be-04-finance-accounting
*A man at a desk covered in coin stacks, with tiny businesspeople standing among them.*

> His hand sets one more coin onto the stack. The tiny businesspeople on the desk walk between the coin towers and gesture to one another. The pendulum arm of the desk lamp swings slowly. His head turns a few degrees. The room and the furniture stay fixed.

### be-05-healthcare
*Flat yellow, a doctor and an older patient sitting in the curve of a giant stethoscope.*

> The doctor's open hand gestures gently as she speaks and the patient nods slowly in response. The black wifi arcs pulse outward one after another. The two small check-marks drift very slightly. The flat yellow background stays completely still.

### be-06-engineering
*Orange geometric interior, a man in silhouette on a chair by a glass wall.*

> He breathes slowly and his head turns a few degrees toward the glass. His crossed foot shifts once. The light falling through the glass panels brightens and dims almost imperceptibly. The geometric shapes and the reflection on the floor stay fixed.

## Blog

### blog-01-latest-updates
*Anime-style crowded street, one man in a hat and dark glasses in focus.*

> The crowd flows and jostles around him — heads turning, shoulders bobbing, people drifting past in both directions. He alone stays almost still, his head tilting only a fraction and his collar shifting. Keep the shallow depth of field and the teal-and-red colour grade exactly.

### blog-02-ai-ielts
*Sunset gradient, a girl in profile touching a glowing phone.* — **already generated; this is your first test clip.**

> She blinks, her head tilts slightly toward the screen, and her finger presses the phone and lifts. The glow from the screen brightens and dims softly across her face and hand. The gradient background stays perfectly still.

### blog-03-ielts-skills
*Bright flat illustration, students around an oversized phone and stacked books.*

> The students keep at it: the one in yellow with headphones types on the laptop and nods to the beat, the pair on the left read together from the pink book, the woman in the wheelchair shifts slightly, the girl on the books at bottom right writes on her screen. The flat colour blocks and the graduation cap behind them never move.

### blog-04-career-english
*Soft-toned office meeting, a presenter standing, colleagues at laptops.*

> The presenter gestures with his open hand as he talks. The seated colleagues type on their laptops and turn their heads to follow him; one at the left raises a hand to ask something. The charts on the wall and the hanging lamps stay fixed.

### blog-05-learning-paths
*Top-down view of a crowded pedestrian crossing.*

> The pedestrians walk steadily across the crossing in their own directions — legs striding, coats and bags swaying, their long shadows moving with them. The road markings, the asphalt texture and the overhead camera stay completely fixed.

### blog-06-band-score-explained
*Pale blue and lilac, examiners among giant curling sheets of paper.*

> The examiners keep working: the bearded man at the top writes with his pen, the woman in blue passes a sheet across to the man in green who reaches to take it, the woman at the bottom sets another page onto her stack. The giant curling sheets of paper ruffle very slightly at their edges.
