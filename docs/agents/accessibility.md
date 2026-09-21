# Accessibility pipeline

This file holds the rules of the accessibility pipeline. The file `a11y/policy.yaml` holds each number, each list, and each date. A rule names a key of that file and not a value. If a rule and the policy file disagree, the policy file wins. Then correct the rule.

The rules come from three places. The first place is WCAG 2.2, the ARIA Authoring Practices Guide, and the accessible name specification. The second place is the industries where one error kills a person or costs millions. The third place is the desktop standards that made the keyboard predictable. The last section names each source.

Deque measured the ceiling of the tools. A tool gives the full answer for 29.5 percent of the WCAG 2.2 criteria. It gives part of the answer for 10.3 percent more. No tool reads the other 60.2 percent. A green pipeline is thus not a statement of conformance. Section 16 holds the records that apply to the remainder.

## What this file does not own

Five skills and one file own the shape of other things. This file names what must exist. It does not say how to word it.

- `penno` owns the tests.
- `tiger-style` owns the shape of the code.
- `bulletproof-pr` owns the text of a commit and a pull request.
- `bulletproof-issue` owns the text of an issue.
- `impeccable` owns the design. It picks the color, the type, the layout, and the motion.
- `docs/agents/security.md` owns the gates of the supply chain, the behavior of the agent, the postmortem, and the deviation machinery.

If a rule here and one of these disagree, the other one wins. Then correct the rule here. A number does not obey that sequence. This file holds the floor of each number, and a design that goes below that floor does not ship. The `impeccable` skill gives 4.5 to 1 for the contrast of body text, and rule COLOR-02 gives `contrast.text_min`, which is higher. The higher number wins.

## How to read a rule

Each rule is one line with this shape:

```
- **ID (category, layer, criteria).** The rule. Cause: the reason. Test: the refusal.
```

The gate `pnpm a11y:policy` reads this line. A line that does not parse is a no-go.

The categories come from MISRA Compliance:2020.

- **M, mandatory.** No deviation exists. A change that breaks the rule does not merge.
- **R, required.** A deviation is possible. It must have a record in `a11y/deviations.yaml`. The key `deviation.max_days` gives the longest life of a record.
- **A, advisory.** The agent can skip the rule. The skip must have one line in the chat that names the rule and the cause.

The criteria field names each WCAG criterion that the rule holds up. A rule that holds up the pipeline itself has the word `project` in that field.

No answer is no-go. If a test gives no answer, the answer is no.

## The three layers

Each rule sits in one layer. The layer names what refuses the violation.

- **impossible.** The type of the props or the token file refuses the violation. The primitive has no prop for the incorrect state, and the palette has no such color.
- **proven.** A tool gives the answer, and no person reads the result. MISRA calls such a rule decidable.
- **attested.** No tool gives the answer. A person reads the route and signs a record. The signature expires.

The layers rank from strong to weak. A rule in a weak layer that a strong layer can hold is a defect of this file. The key `layer.promotion_is_mandatory` makes that defect a refusal. When a new tool can answer an attested rule, move the rule to the proven layer in the same week.

## The sign-in, before the first change to a file

The WHO surgical checklist stops the work before the first cut. The agent writes these five answers in its first message of a task that touches the user interface. Each answer is the state that the agent sees, and not the word "done".

1. Name each route that the change touches. Give the class of each one from `a11y/routes.yaml`.
2. Name the pattern of each interactive component that the change touches. Give the key map from `a11y/patterns.yaml`.
3. Name each criterion that moves from the proven layer to the attested layer because of this change.
4. Name each attestation record that this change makes stale.
5. Name the stop condition. This is the observation that makes the agent stop and put a question to the user.

The time-out before the merge is the command `pnpm a11y`. Its output is one line for each gate, with the word `go` or `no-go`.

## 1 Source of truth

- **SOT-01 (M, proven, project).** Each number, each list, and each date of the pipeline lives in `a11y/policy.yaml`. Cause: two copies of a number become different. Test: `pnpm a11y:policy` reads each tool configuration and refuses a value that disagrees with the policy file.
- **SOT-02 (M, proven, project).** The command `pnpm a11y` is the one entry point. It runs each gate in the sequence that `gates` gives. Cause: a gate that CI runs and the laptop does not is a gate that no person sees before the push. Test: the workflow file has one accessibility step, and it is `pnpm a11y`.
- **SOT-03 (M, proven, project).** Each tool keeps its native configuration file. The policy file does not replace the native file. The policy file is the test of the native file. Cause: a tool that cannot read the policy file must have a file that it can read. Test: `pnpm a11y:policy`.
- **SOT-04 (M, proven, project).** A change to `a11y/policy.yaml` is its own pull request. It touches no other file. Cause: a limit that moves in the same commit as the code that broke it hides the break. Test: `.githooks/pre-push` refuses a branch that changes the policy file and one more file.
- **SOT-05 (R, proven, project).** A number in the policy file moves only in the safe direction with no deviation record. A higher contrast ratio, a larger target, and a shorter attestation life are safe. The other direction must have a record. Cause: a control that loosens when the deadline is near is not a control. Test: `pnpm a11y:policy` compares the new file with the file on `main`.
- **SOT-06 (M, proven, project).** Each rule of this file names a WCAG criterion or the word `project`. One rule or more names each criterion in the scope of `conformance`. Cause: NASA SWE-072 makes the traceability bidirectional. A criterion with no rule is a gap, and a rule with no criterion is work that no standard made necessary. Test: `pnpm a11y:policy` reads this file and the policy file, then lists each orphan in the two directions.
- **SOT-07 (M, proven, project).** No rule of this file holds a word of `ambiguous_words`. Cause: INCOSE refuses a rule that no person can test. A word of that list gives no test. Test: `pnpm a11y:policy` reads this file.

## 2 Layers

- **LAY-01 (M, proven, project).** Each rule names one layer of `layer.names`. Cause: a rule with no layer is a rule with no owner. Test: `pnpm a11y:policy`.
- **LAY-02 (M, attested, project).** A rule in the proven layer names the tool that answers it. The name is in the Test field. Cause: MISRA calls a rule decidable when a tool reads the source and answers with no person. A proven rule with no tool is an attested rule with a false label. Test: the user reads the Test field of each proven rule.
- **LAY-03 (M, proven, project).** A rule in the attested layer has a record shape in section 16. Cause: an attested rule with no record is a rule that no person ever ran. Test: `pnpm a11y:attest`.
- **LAY-04 (R, attested, project).** When a tool becomes able to answer an attested rule, the rule moves to the proven layer. The move occurs in the week of the discovery. Cause: the attested layer costs the time of a person on each change. It is the layer of last resort. Test: the weekly run lists each attested rule with the tools that can answer it at this time.

## 3 The class of a route

- **CLS-01 (M, proven, project).** Each route has a record in `a11y/routes.yaml` with the three axes of `criticality.axes`. Cause: ISO 26262 reads the severity, the exposure, and the controllability, and it does not read an opinion. Test: `pnpm a11y:policy` compares the routes of the router with the records.
- **CLS-02 (M, proven, project).** The class of a route is the strictest class of its three axes. Cause: the worst axis is the axis that stops the user. Test: `pnpm a11y:policy` calculates the class.
- **CLS-03 (M, proven, project).** A route with no record gets the class `criticality.default`. Cause: IEC 62304 gives class C to software with no documented class. A record that is missing costs the project, and it does not save the project. Test: `pnpm a11y:policy`.
- **CLS-04 (M, proven, project).** A route in `criticality.deviation_forbidden` has no deviation record. Cause: a mandatory rule and a route of the class C1 are the two places where no price buys an exemption. Test: `pnpm a11y:policy` reads `a11y/deviations.yaml`.

## 4 Primitives and construction

- **UI-01 (M, proven, WCAG 4.1.2).** Each element of `patterns.elements_reserved` lives in `patterns.primitives_directory`. A different directory uses the primitive. Cause: qmail removed the trusted code in place of an audit of it. One button with a proof is stronger than each button with a lint rule. Test: `eslint` with the project rule `no-restricted-syntax`.
- **UI-02 (M, impossible, WCAG 4.1.2).** The type of the props refuses a primitive with no accessible name. Cause: Jane Street makes an illegal state unrepresentable. A missing name is an illegal state. Test: `tsc --noEmit`, and the type test of the primitive.
- **UI-03 (M, proven, WCAG 4.1.2).** Each primitive declares one pattern of `a11y/patterns.yaml`. Cause: a component with no declared pattern has no expected key map. Test: `pnpm a11y:keyboard`.
- **UI-04 (M, proven, WCAG 1.3.1 + 4.1.2).** A native element gives the role. An ARIA role on an element that already has that role is a refusal. Cause: the first rule of ARIA. ARIA changes what the screen reader says, and it adds no keyboard behavior. Test: `eslint-plugin-jsx-a11y` rules `prefer-tag-over-role` and `no-redundant-roles`.
- **UI-05 (M, proven, WCAG 2.1.1 + 4.1.2).** The code does not use `role="application"`. Cause: this role turns off the reading mode of the screen reader. The author then owns each key of the operating system. Test: `eslint` with the project rule.
- **UI-06 (M, proven, WCAG 4.1.2).** An element with `aria-hidden="true"` holds no element that can get focus. Cause: the result is an element that the keyboard gets to and the screen reader does not name. Test: `eslint-plugin-jsx-a11y` rule `no-aria-hidden-on-focusable`, and `axe-core`.
- **UI-07 (M, proven, WCAG 1.3.1).** The markup of each route passes `html-validate` with the rules of `markup.rules_required`. Cause: a duplicate identifier and an invalid nest break the accessibility tree in a manner that axe does not read. Test: `pnpm a11y:static`.
- **UI-08 (R, impossible, WCAG 2.1.1 + 4.1.2).** A primitive that the project writes holds the keyboard behavior of its pattern in one module. A second copy of that behavior is a refusal. Cause: two copies of a key map become two key maps. Test: `pnpm a11y:keyboard`.

## 5 Name, role, and value

- **NAME-01 (M, proven, WCAG 1.1.1).** Each image has a text alternative. A decorative image has an empty alternative and `aria-hidden="true"`. Cause: WebAIM measured a missing alternative on 55.5 percent of home pages. Test: `eslint-plugin-jsx-a11y` rule `alt-text`, and `axe-core`.
- **NAME-02 (M, attested, WCAG 1.1.1).** The text alternative names what the image tells the reader. A file name is not a text alternative. Cause: no tool reads the meaning of a sentence. A present alternative and a correct alternative are two different things. Test: the attestation record of the route.
- **NAME-03 (M, proven, WCAG 2.5.3).** The accessible name of a control starts with its visible label. Cause: the user that speaks the label must get to the control. Test: `axe-core` rule `label-content-name-mismatch`.
- **NAME-04 (M, proven, WCAG 4.1.2).** The name of a control comes from the highest source of the accessible name computation that the control has. The sequence is `aria-labelledby`, then `aria-label`, then the native mechanism, then the content, then `title`. Cause: the specification gives one sequence. A second name lower in the sequence does not get to the user. Test: the golden file of the accessibility tree.
- **NAME-05 (M, proven, WCAG 2.4.4 + 2.4.9).** The text of a link names its target with no other text on the route. Cause: a screen reader lists the links with no context. Test: `eslint-plugin-jsx-a11y` rule `anchor-ambiguous-text`, and `axe-core`.
- **NAME-06 (M, attested, WCAG 2.4.6).** Each heading and each label names its topic. Cause: no tool reads the meaning of a heading. Test: the attestation record of the route.
- **NAME-07 (M, proven, WCAG 2.4.2).** Each route has a title that names the route and the product. Cause: the user with many tabs reads the title alone. Test: `pnpm a11y:tree` reads the title of each route.
- **NAME-08 (M, proven, WCAG 3.1.1).** The root element has a `lang` attribute with a valid value. Cause: the screen reader picks its voice from this attribute. Test: `eslint-plugin-jsx-a11y` rules `html-has-lang` and `lang`.
- **NAME-09 (M, proven, WCAG 3.1.2).** A part of the text in a different language has its own `lang` attribute. Cause: the voice of the screen reader stays incorrect for the whole part without it. Test: `pnpm a11y:static`.
- **NAME-10 (M, proven, WCAG 1.3.1).** The markup gives each relation that the design shows. A list is a list element, and a table header is a header cell. Cause: the user that does not see the design reads the markup alone. Test: `axe-core` and `html-validate`.

## 6 Keyboard

- **KEY-01 (M, proven, WCAG 2.1.1 + 2.1.3).** Each function of the product works with the keyboard alone. No function belongs to the pointer alone. Cause: WCAG 2.1.3 removes the exemption of 2.1.1. A product with one mouse-only function has one user that cannot finish. Test: `pnpm a11y:keyboard` runs the fuzz of `fuzz.steps_per_route` steps on each route.
- **KEY-02 (M, proven, WCAG 2.1.2).** The focus goes out of each component with the keyboard alone. Cause: a keyboard trap ends the session of the user. Test: the invariant `no_state_has_no_exit` of the fuzz run.
- **KEY-03 (M, proven, WCAG 4.1.2).** The key map of a component is the same as the map of its pattern in `a11y/patterns.yaml`. Cause: the APG gives two models for the listbox, two for the treeview, and two directions for the slider. This project gives one. Test: `pnpm a11y:keyboard`.
- **KEY-04 (M, proven, WCAG 2.1.4).** A shortcut of one character works only while the component has focus. Cause: the user that speaks to the computer sends characters that the route reads as commands. Test: `eslint` with the project rule, and `pnpm a11y:keyboard`.
- **KEY-05 (M, proven, WCAG 4.1.2).** The Escape key closes the component that has focus. It then returns the focus to the element that opened the component. Cause: one key goes out of each layer, on each route, with no exemption. Test: the invariant `escape_always_leaves_a_modal`.
- **KEY-06 (M, proven, WCAG 4.1.2).** A group of radios is one tab stop. The arrow keys move in the group. Cause: IBM made Tab the key between two groups and the arrow keys the keys in one group. Test: `pnpm a11y:keyboard` reads the focus golden file.
- **KEY-07 (M, proven, WCAG 2.5.1).** A gesture of more than one finger or of a path has a single-pointer alternative. Cause: the user with one hand or with a head pointer draws no path. Test: `pnpm a11y:tree`.
- **KEY-08 (M, proven, WCAG 2.5.2).** The down event starts no function. The up event on the same target starts the function. Cause: the user that presses the incorrect control must move away before the release. Test: `eslint` with the project rule that limits `onMouseDown` and `onPointerDown`.
- **KEY-09 (M, proven, WCAG 2.5.4).** A function that reads the motion of the device has a control on the screen. The user can turn the motion off. Cause: the user with a tremor moves the device with no intent. Test: `pnpm a11y:tree`.
- **KEY-10 (M, proven, WCAG 2.5.7).** A drag has an alternative that one pointer does with no drag. Cause: the user with a tremor holds no button through a path. Test: `pnpm a11y:tree`.
- **KEY-11 (M, proven, WCAG 2.1.1).** No element has a positive `tabindex`. Cause: a positive value makes a second focus order that the DOM does not show. Test: `eslint-plugin-jsx-a11y` rule `tabindex-no-positive`.
- **KEY-12 (M, proven, WCAG 2.1.1).** An element with a click handler has a key handler and a role. Cause: a division element with a click handler is a button that the keyboard cannot get to. Test: `eslint-plugin-jsx-a11y` rules `click-events-have-key-events` and `no-static-element-interactions`.

## 7 Focus

- **FOC-01 (M, proven, WCAG 2.4.3).** The focus order of each route is the same as the order of the golden file in `golden.focus_directory`. Cause: a change of the focus order is invisible in a diff of the code. The golden file makes it a diff that a person reads. Test: `pnpm a11y:tree`.
- **FOC-02 (M, proven, WCAG 2.4.7 + 2.4.13).** The element that has focus has an indicator. The keys `focus.perimeter_min_css_px` and `focus.contrast_min` give its size and its contrast. Cause: the user that sees the screen and uses the keyboard finds the focus by the indicator alone. Test: `pnpm a11y:tokens` and `pnpm a11y:tree`.
- **FOC-03 (M, proven, WCAG 2.4.11 + 2.4.12).** No author content hides the element that has focus. The key `focus.obscured_percent_max` gives the limit. Cause: a sticky header hides the element that the user got to. Test: `pnpm a11y:tree`.
- **FOC-04 (M, proven, WCAG 3.2.1).** The focus alone changes no context. No route opens, no form sends, and no value changes. Cause: without this rule the user that moves through the route with Tab starts an action by accident. Test: the fuzz run compares the route and the state before and after each Tab.
- **FOC-05 (M, proven, WCAG 3.2.2).** A change of a value in a control changes no context. The user starts the change with a control that says what it does. Cause: a select element that opens a route on change moves the user that reads the options. Test: the fuzz run.
- **FOC-06 (M, proven, WCAG 4.1.2).** A modal traps Tab and Shift-Tab in it. It moves the focus in on open, and it returns the focus to the element that opened it on close. Cause: the APG dialog pattern. Test: `pnpm a11y:keyboard`.
- **FOC-07 (M, proven, WCAG 2.4.3).** The code moves the focus only after an action of the user. Cause: a focus that moves with no action moves the reader of a screen reader to a place that the reader did not name. Test: `eslint` with the project rule that limits `focus()` to `src/shared/ui/`.
- **FOC-08 (M, proven, WCAG 1.4.13).** Content that opens on hover or on focus stays while the pointer moves onto it. The Escape key closes it, and it closes with no move of the pointer. Cause: the user with a magnifier moves the pointer to read the content. Test: `pnpm a11y:tree`.
- **FOC-09 (M, proven, WCAG 2.4.1).** Each route starts with a link that moves the focus past the blocks that occur on each route. Cause: without this rule the keyboard user goes through the same navigation on each route. Test: `axe-core` rule `bypass`, and the focus golden file.

## 8 Consistency

- **CON-01 (M, proven, WCAG 3.2.4).** Each instance of one pattern has the same key map. Cause: axe reads one component and does not compare two. The user compares two. A dialog that closes on Escape and a second dialog that does not are the fault that no criterion of WCAG names. Test: `pnpm a11y:keyboard` compares each instance of a pattern with each other instance.
- **CON-02 (M, proven, WCAG 3.2.4).** One function has one name and one icon on each route. Cause: Nielsen heuristic 4. The user must not put the question if two words mean one thing. Test: `pnpm a11y:keyboard` reads the accessible name of each primitive by pattern.
- **CON-03 (M, proven, WCAG 3.2.3).** The navigation of the product keeps one relative order on each route. Cause: the user that learns the order one time keeps it. Test: the golden file of the accessibility tree of each route.
- **CON-04 (M, proven, WCAG 3.2.6).** The help of the product sits in the same relative place on each route that has help. Cause: the user in trouble looks one time. Test: `pnpm a11y:tree`.
- **CON-05 (M, proven, WCAG 3.2.5).** A change of context starts only on a request of the user. Cause: Raymond gives this rule in The Art of Unix Programming. Test: the fuzz run.
- **CON-06 (M, proven, project).** The project picks one model for a pattern that the APG gives with two. The key `chosen_model` of `a11y/patterns.yaml` names the pick and its cause. Cause: a standard that gives two answers to one key moves the cost to each user. Test: `pnpm a11y:policy`.

## 9 Color and contrast

- **COLOR-01 (M, proven, WCAG 1.4.3 + 1.4.6).** Each color of the product lives in `tokens.file`. A color literal in a different file is a refusal. Cause: contrast that a person samples from a screenshot misses each state that no one opened. A palette with a proof misses none. Test: `stylelint`, `eslint` with the project rule, and `pnpm a11y:tokens`.
- **COLOR-02 (M, proven, WCAG 1.4.3 + 1.4.6).** Each pair of `a11y/tokens.yaml` obeys the minimum of `contrast` for its `kind`. Cause: WCAG 1.4.6 gives 7 to 1 for text. This project uses the AAA number at the AA level. Test: `pnpm a11y:tokens` calculates each pair.
- **COLOR-03 (M, proven, project).** A foreground and a background that can occur together on the screen have a pair in `a11y/tokens.yaml`. Cause: a pair that the file does not hold is a pair that the gate did not read. Test: `pnpm a11y:tokens` reads the built style sheet and lists each pair that it finds and the file does not hold.
- **COLOR-04 (M, proven, WCAG 1.4.11).** The boundary of a control and a graphic that gives meaning obey `contrast.non_text_min` against each color adjacent to it. Cause: the user with low vision finds the edge of the field by the edge alone. Test: `pnpm a11y:tokens`.
- **COLOR-05 (M, attested, WCAG 1.4.1).** Color is not the one means that shows a state or a meaning. A second means is text, a shape, or an icon. Cause: no tool reads what a color means in a design. Test: the attestation record of the route.
- **COLOR-06 (M, proven, WCAG 1.4.5).** Text is text. An image of text is a refusal. This rule does not apply to a logo. Cause: an image of text does not resize, and it does not use the colors of the user. Test: `pnpm a11y:static`.
- **COLOR-07 (A, proven, project).** When `apca-w3` is installed, the report of `pnpm a11y:tokens` gives the APCA value of each pair. The value does not refuse a change. Cause: APCA went out of the WCAG 3 draft in 2023, and the 2026 draft names no contrast algorithm. A number with no standard is a note. Test: `pnpm a11y:tokens`.

## 10 Size, spacing, and reflow

- **SIZE-01 (M, proven, WCAG 2.5.5 + 2.5.8).** Each target is `target.min_css_px` or larger in the two dimensions. Cause: WCAG 2.5.8 gives 24 pixels, and 2.5.5 gives 44. This project uses 44. Test: `pnpm a11y:tree` measures each target.
- **SIZE-02 (M, proven, WCAG 1.4.10).** Each route reflows at the width `reflow.width_css_px` and at the height `reflow.height_css_px`. The user then scrolls in one direction only. Cause: the user at 400 percent zoom reads one column. Test: `pnpm a11y:tree` opens each route at that size.
- **SIZE-03 (M, proven, WCAG 1.4.4).** The text of each route increases to `reflow.zoom_percent` and keeps its content and its function. Cause: the zoom of the browser is the magnifier that each user already has. Test: `pnpm a11y:tree`.
- **SIZE-04 (M, proven, WCAG 1.4.12).** Each route keeps its content and its function when the user sets the four values of `text_spacing`. Cause: the user with dyslexia changes the spacing in the browser. Test: `pnpm a11y:tree` sets the four values, then reads the route again.
- **SIZE-05 (M, proven, WCAG 1.4.8).** A block of text is not wider than `line_length.max_characters` characters. Cause: on a long line the eye does not find the start of the next line. Test: `pnpm a11y:tree`.
- **SIZE-06 (M, proven, WCAG 1.3.4).** No route locks the orientation of the screen. Cause: the user with a chair mount holds one orientation. Test: `pnpm a11y:static` reads the style sheet and the manifest.
- **SIZE-07 (M, proven, project).** No route blocks the zoom of the browser. The values `user-scalable=no` and `maximum-scale` are a refusal. Cause: the zoom is the one tool that each user already knows. Test: `pnpm a11y:static` reads `index.html`.
- **SIZE-08 (M, proven, project).** The layout shift of each route is `layout.cumulative_layout_shift_max` or less. Cause: a target that moves below the pointer is a target that the user with a tremor does not hit. The Core Web Vitals call 0.1 good. This project gives 0. Test: `pnpm a11y:tree`.

## 11 Motion and timing

- **MOT-01 (M, proven, WCAG 2.3.3).** Each animation reads `prefers-reduced-motion`. Cause: the user with a vestibular disorder gets symptoms from motion that the user did not start. Test: `stylelint` rule `a11y/media-prefers-reduced-motion`, and `pnpm a11y:tree`.
- **MOT-02 (M, proven, WCAG 2.3.3).** In the reduced run, no animation moves an element in space. The key `motion.reduced_motion_spatial_allowed` is false. Cause: the symptom comes from the movement and not from the animation. Test: `pnpm a11y:tree` opens each route two times and compares the two runs.
- **MOT-03 (M, proven, WCAG 2.3.3).** In the reduced run, an opacity change and a color change stay. Their duration is `motion.reduced_motion_duration_ms_max` or less. Cause: a run that turns each animation off hides the state change from each user. The `impeccable` skill refuses that run. Test: `pnpm a11y:tree`.
- **MOT-04 (M, proven, WCAG 1.4.2 + 2.2.2).** No media and no motion starts by itself. The key `motion.autoplay_allowed` is false. Cause: audio that starts by itself hides the voice of the screen reader. Test: `pnpm a11y:static` and `eslint-plugin-jsx-a11y` rule `no-distracting-elements`.
- **MOT-05 (M, proven, WCAG 2.2.2).** Content that moves, blinks, or updates by itself has a control that pauses it. Cause: the user that reads slowly cannot read the text below the movement. Test: `pnpm a11y:tree`.
- **MOT-06 (M, proven, WCAG 2.3.1 + 2.3.2).** No content flashes more than `motion.flashes_per_second_max` times in one second. Cause: a flash in this band starts a seizure. WCAG 2.3.2 removes the exemption of 2.3.1, and this project uses 2.3.2. Test: `pnpm a11y:tree` records the route and counts the changes of luminance.
- **MOT-07 (M, attested, WCAG 2.2.1).** A time limit of the product gives the user the two values of `timing.limit_extension_factor` and `timing.limit_extension_count`. Cause: no tool finds a time limit that a server holds. Test: the attestation record of the route.
- **MOT-08 (A, proven, project).** The product answers a keystroke in `timing.doherty_ms` or less. Cause: Doherty and Thadani measured the threshold where the user stays in the task. Test: the report of `pnpm a11y:tree`.

## 12 Structure and navigation

- **NAV-01 (M, proven, WCAG 1.3.1).** Each route has one `main` landmark. A landmark type that occurs more than one time has a name. Cause: the screen reader user moves by landmark. Test: `axe-core` rules `landmark-one-main` and `landmark-unique`, and `html-validate` rule `unique-landmark`.
- **NAV-02 (M, proven, WCAG 1.3.1).** The heading levels of a route descend with no gap. Cause: the screen reader user reads the headings as the table of contents. Test: `axe-core` rule `heading-order`.
- **NAV-03 (M, proven, WCAG 1.3.2).** The order of the DOM is the order that the design reads. No style property moves content past its neighbor. Cause: the screen reader reads the DOM and not the design. Test: the golden file of the accessibility tree, and the focus golden file.
- **NAV-04 (M, attested, WCAG 2.4.5).** The product gives more than one manner to get to a route. A step of a process is the one case that this rule does not apply to. Cause: no tool counts the manners to get to a route. Test: the attestation record of the product.
- **NAV-05 (M, attested, WCAG 1.3.3).** No instruction names a shape, a size, a place, or a sound alone. Cause: no tool reads the meaning of an instruction. Test: the attestation record of the route.
- **NAV-06 (M, proven, WCAG 4.1.3).** A message that reports a state change has a live region. The message gets to the user with no move of the focus. Cause: without this rule the user that does not see the screen gets no message. Test: `pnpm a11y:tree` reads the announce golden file.
- **NAV-07 (M, proven, project).** The accessibility tree of each route is the same as the golden file in `golden.aria_directory`. Cause: the accessibility tree is the output of the product for the user that does not see the screen. A diff of that tree is a diff of what that user hears. Test: `pnpm a11y:tree`.

## 13 Forms and errors

- **FORM-01 (M, impossible, WCAG 3.3.2).** Each field of a form has a label that the markup connects to the field. The type of the props refuses a field with no label. Cause: a placeholder is not a label, and it goes away on the first character. Test: `tsc --noEmit`, and `eslint-plugin-jsx-a11y` rule `label-has-associated-control`.
- **FORM-02 (M, proven, WCAG 1.3.5).** A field that collects data about the user has the correct `autocomplete` token. Cause: the browser then fills the field, and the user with a memory disorder types nothing. Test: `eslint-plugin-jsx-a11y` rule `autocomplete-valid`, and `axe-core`.
- **FORM-03 (M, proven, WCAG 3.3.1).** An error names the field and says what is incorrect, in text. Cause: a red border alone gets to no user that does not see it. Test: `pnpm a11y:tree`.
- **FORM-04 (M, proven, WCAG 4.1.3).** An error gets to the user through a live region, and the focus stays where the user put it. Cause: a focus that moves to the first error moves the user away from the field. Test: the announce golden file.
- **FORM-05 (M, attested, WCAG 3.3.3).** When the product knows the correction of an error, the message names the correction. Cause: no tool knows what the correct value is. Test: the attestation record of the route.
- **FORM-06 (M, attested, WCAG 3.3.4 + 3.3.6).** Each form that sends data is reversible. The product can show the data to the user before it sends the data. WCAG 3.3.4 names the legal and the financial forms, and 3.3.6 names each form. This project uses 3.3.6. Cause: no tool knows the result of a form. Test: the attestation record of the route.
- **FORM-07 (M, proven, WCAG 3.3.7).** A form does not collect data a second time in one process. Cause: the user with a memory disorder types the same number two times and makes one error. Test: `pnpm a11y:tree` walks each process of more than one step.
- **FORM-08 (M, attested, WCAG 3.3.8 + 3.3.9).** No step of the sign-in tells the user to remember, to transcribe, or to do a puzzle. WCAG 3.3.8 gives an alternative, and 3.3.9 gives none. This project uses 3.3.9, and it lets the user recognize an object. Cause: a test of memory in a sign-in stops the user with a cognitive disorder. Test: the attestation record of the sign-in.
- **FORM-09 (M, proven, WCAG 4.1.2).** A field that is not valid has `aria-invalid`, and the markup connects it to its message. Cause: the screen reader then names the error with the field. Test: `pnpm a11y:tree`.
- **FORM-10 (M, proven, WCAG 1.3.1).** A group of fields has a group element and a legend. Cause: the user hears the question of the group before the first option. Test: `axe-core`.

## 14 Media

- **MED-01 (M, proven, WCAG 1.2.2 + 1.2.4).** Each video with sound has a captions track. Cause: the user that does not hear gets nothing from the sound. Test: `eslint-plugin-jsx-a11y` rule `media-has-caption`, and `pnpm a11y:static`.
- **MED-02 (M, attested, WCAG 1.2.2).** The captions give each word and each sound that has meaning. Cause: no tool reads if a caption is correct. Test: the attestation record of the media.
- **MED-03 (M, proven, WCAG 1.2.3 + 1.2.5).** Each video has an audio description track or a full text alternative. Cause: the user that does not see the screen gets nothing from the picture. Test: `pnpm a11y:static`.
- **MED-04 (M, proven, WCAG 1.2.1).** Each audio file and each video with no sound has a text alternative. Cause: one file, one alternative. Test: `pnpm a11y:static`.
- **MED-05 (M, proven, WCAG 4.1.2).** The player of the product is a primitive of `patterns.primitives_directory`. Cause: the player of the browser changes between browsers. A player that the project writes gets the key map of this file. Test: `eslint` with the project rule.

## 15 Evidence and tests

- **EV-01 (M, proven, project).** A person writes a golden file before the code exists. The key `golden.update_flag_allowed` is false. Cause: a flag that writes the expected result from the result that it saw records the defect and calls it the standard. Test: `pnpm a11y:policy` refuses the flag in a script of `package.json`, and CI runs with the flag missing.
- **EV-02 (M, proven, project).** The accessibility tree is the output of the product for the user that does not see the screen. A test of that tree is a test of behavior. Cause: Penno axiom 1 refuses a test of structure. This rule names why the tree is not structure. Test: the user reads the test.
- **EV-03 (M, proven, project).** An incomplete result of axe is a no-go. The key `axe.incomplete_is_a_refusal` is true. Cause: axe answers `incomplete` when it cannot give the answer. Each project reads that word as a pass, and the finding then gets to the user. Test: `pnpm a11y:tree`.
- **EV-04 (M, proven, project).** A rule of axe goes off only with a deviation record. The key `axe.rules_disabled` holds the list. Cause: a rule that a project turns off is a rule that the project breaks with intent. Test: `pnpm a11y:policy`.
- **EV-05 (M, proven, project).** Each component of `patterns.primitives_directory` has a test for each key of its pattern. Cause: the pattern file names the map, and the test proves the map. Test: `pnpm a11y:keyboard` compares the keys of the pattern with the tests that exist.
- **EV-06 (M, proven, project).** The fuzz run uses the seed `fuzz.seed` and the count `fuzz.steps_per_route`. A run with a different seed is a second run and not a replacement. Cause: a random test with no seed gives a failure that no person can make again. Test: `pnpm a11y:keyboard`.
- **EV-07 (M, proven, project).** The tool that reads the announcement of a screen reader is a virtual reader. Its result is a note, and it is not a statement about a real screen reader. Cause: a Linux runner starts no VoiceOver and no NVDA. A claim about a real reader from a virtual reader is a false claim. Test: the report names the tool on each line.
- **EV-08 (M, attested, project).** A real screen reader reads each route of the class C1 one time each quarter. The record names the reader, its version, and the operating system. Cause: EV-07 gives the ceiling of the automated run. This rule applies to the remainder. Test: the attestation record with the method `demonstration`.

## 16 Attestations

- **ATT-01 (M, proven, project).** Each rule of the attested layer has a record in `attestation.file` for each route that it applies to. Cause: 60.2 percent of the criteria have no tool. A rule with no record is a rule that no person ever ran. Test: `pnpm a11y:attest`.
- **ATT-02 (M, proven, project).** A record holds the hash of the accessibility tree of the route at the time of the check. Cause: aviation grounds an aircraft when a deferred item passes its date. A check of a route that changed is a check of a different route. Test: `pnpm a11y:attest` reads the route again and calculates the hash.
- **ATT-03 (M, proven, project).** A record dies when the hash changes, or when the age passes `criticality.attestation_days` for the class of the route. A dead record is a no-go. Cause: a manual check is a perishable asset. Test: `pnpm a11y:attest`.
- **ATT-04 (M, proven, project).** The signer of a record is the user. A record with the name of the agent is a refusal. Cause: DO-178C gives the verification to a different party. The party that wrote the code does not sign the proof of the code. Test: `pnpm a11y:attest` reads the name against the git configuration.
- **ATT-05 (M, proven, project).** The field `observed` names what the person saw. The word "pass" is not an observation. Cause: a record with no observation is a signature with no check. Test: `pnpm a11y:attest` refuses a value of the field that is in a list of empty answers.
- **ATT-06 (M, proven, project).** The method of a record is one of `attestation.methods`. Cause: INCOSE gives four methods. A rule with no method is a rule that no person can test. Test: `pnpm a11y:attest`.

## 17 Agent conduct

Section 10 of `docs/agents/security.md` holds the behavior of the agent. Its rule HPT-03 stops the work on a result that is not the expected result. Its rule HPT-04 uses the worse of two readings. Its rule HPT-09 refuses a weaker control near a deadline. Each one applies here with no change. These three rules are the ones that it does not have.

- **ACT-01 (M, attested, project).** The agent writes the five answers of the sign-in before the first change to a file of the user interface. Cause: the list stops the work before the first cut. Test: the user reads the first message.
- **ACT-02 (M, attested, project).** A golden file, an attestation record, and a token pair are controls. Rule HPT-09 of the security rules applies to the three. Cause: a golden file that the agent writes again to make a gate pass is the defect with a new name. Test: the user reads the diff of `a11y/`.
- **ACT-03 (M, attested, project).** The agent does not write that the product obeys WCAG. It writes the output of `pnpm a11y` and the count of the attestation records that are live. Cause: the ceiling of `conformance.automation_ceiling`. A green pipeline holds less than one third of the criteria. Test: the user reads the message.

## 18 Incidents and never-events

A never-event opens an incident on the same day, and the outcome does not change that. The list is `incident.never_events`. Section 11 of `docs/agents/security.md` holds the postmortem, its deadline, its file name, and the rule that a change of a rule links the postmortem. Each one applies here with no change. These two rules are the ones that it does not have.

- **INC-01 (M, attested, project).** A postmortem names the user that the defect stopped and the task that the user cannot do. A count of violations is not an impact. Cause: the important number is the person that cannot finish. Test: the user reads the file.
- **INC-02 (M, proven, project).** A defect that a user reports adds a test to the proven layer, or a rule to the attested layer. Cause: SQLite adds a test for each bug. A defect with no new test returns. Test: the pull request that closes the ticket.

## 19 Deviations

Section 12 of `docs/agents/security.md` holds the deviation machinery. A mandatory rule has no record. An expired record is a refusal. The record must have an approval from the user. Each one applies to `deviation.file` with no change. These rules are the ones that it does not have.

- **DEV-01 (M, proven, project).** A record in `deviation.file` has the field `place`, which names the file, the component, or the route. The six other fields are the ones that the security rules give. Cause: an accessibility deviation holds for one place and not for the whole project. Test: `pnpm a11y:policy`.
- **DEV-02 (M, proven, project).** A route in `criticality.deviation_forbidden` has no record. No rule of the category M has one. Cause: the class C1 and the category M are the two places where no price buys the exemption. Test: `pnpm a11y:policy`.
- **DEV-03 (M, proven, project).** A record that passes its expiry is a refusal on the next run. The cure is a fix or a new record with a new approval. Cause: an aircraft with a deferred item past its date does not fly. Test: `pnpm a11y:policy`.
- **DEV-04 (M, proven, project).** A record names the user that the deviation stops in its field `risk`. Cause: a deviation with no named user reads as a cost of 0. Test: `pnpm a11y:policy` refuses an empty field.

## Sources

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/), the W3C Recommendation of 5 October 2023, with the update of 12 December 2024. [What is new in 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/), which names the nine new criteria and the removal of 4.1.1 Parsing.
- [The ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/), which gives the key map of each pattern. [Read me first](https://www.w3.org/WAI/ARIA/apg/practices/read-me-first/), which gives the first rule of ARIA.
- [ARIA in HTML](https://www.w3.org/TR/html-aria/), the W3C Recommendation of 11 August 2026, which says which role is valid on which element.
- [Accessible Name and Description Computation 1.2](https://www.w3.org/TR/accname-1.2/), which gives the sequence of rule NAME-04.
- [The WebAIM Million 2025](https://webaim.org/projects/million/2025). 94.8 percent of home pages had one detectable failure or more. Low contrast was on 79.1 percent. A page with ARIA had 57 errors, and a page with none had 27.
- The ceiling of the tools. Deque measures 29.5 percent of the WCAG 2.2 criteria as fully automatable. It measures 10.3 percent as automatable in part, and 60.2 percent as manual.
- [MISRA Compliance:2020](https://misra.org.uk). The categories mandatory, required, and advisory, the deviation record, and the split between a decidable rule and an undecidable rule.
- [DO-178C](https://en.wikipedia.org/wiki/DO-178C). The objective with independence, which gives rule ATT-04.
- [IEC 62304](https://blog.johner-institute.com/iec-62304-medical-software/safety-class-iec-62304/). Software with no documented safety class gets class C, which gives rule CLS-03.
- [ISO 26262](https://en.wikipedia.org/wiki/Automotive_Safety_Integrity_Level). The three axes severity, exposure, and controllability, which give the axes of section 3.
- [The INCOSE Guide to Writing Requirements](https://spacese.spacegrant.org/uploads/Requirements-Writing/Writing%20Good%20Requirements.pdf). One rule per statement, the four verification methods, and the words that no person can test.
- [14 CFR 91.213](https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-91/subpart-C/section-91.213), the minimum equipment list and its repair deadline, which give the expiry of section 16.
- [The WHO surgical safety checklist](https://www.who.int/docs/default-source/patient-safety/9789241598590-eng-checklist.pdf), the sign-in.
- [The IBM user interface standard of 1987](https://en.wikipedia.org/wiki/IBM_Common_User_Access). Tab moves between two groups, and the arrow keys move in one group, which gives rule KEY-06.
- [Raymond, The Art of Unix Programming](http://www.catb.org/esr/writings/taoup/html/). The rule that gives CON-05.
- [Nielsen, the ten usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics-for-user-interface-design/). Heuristic 4, consistency and standards, which gives rule CON-02.
- [Doherty and Thadani, IBM Systems Journal, 1982](https://lawsofux.com/doherty-threshold/). The threshold of 400 ms, which gives rule MOT-07.
- [Cumulative Layout Shift](https://web.dev/articles/cls). The good band is 0.1 or less. Rule SIZE-08 gives 0.
- [The status of APCA](https://adrianroselli.com/2026/04/wcag3-contrast-as-of-april-2026.html). The contrast algorithm went out of the WCAG 3 draft in 2023, and the draft of September 2026 names none, which gives rule COLOR-07.
- [The WCAG 3 explainer](https://www.w3.org/WAI/news/2026-09-10/wcag3/), a Working Draft with no date for a Recommendation. This pipeline uses WCAG 2.2 alone.
